import { join } from "node:path";
import z from "zod";
import { tool } from "ai";
import { logged } from "../logging";
import { ensureWorkspace, WORKSPACE } from "../context";
import { htmlToText } from "./web";

/**
 * Real browser automation (Chromium via Playwright): navigate, click, type,
 * submit forms, scroll, screenshot. A single session is kept alive between
 * calls so the agent can do multi-step flows (login → form → download).
 */
type PlaywrightBrowser = {
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
};
type PlaywrightPage = {
  goto: (url: string, options?: unknown) => Promise<unknown>;
  content: () => Promise<string>;
  title: () => Promise<string>;
  url: () => string;
  click: (selector: string, options?: unknown) => Promise<void>;
  fill: (selector: string, value: string, options?: unknown) => Promise<void>;
  press: (selector: string, key: string) => Promise<void>;
  selectOption: (selector: string, value: string) => Promise<unknown>;
  waitForSelector: (selector: string, options?: unknown) => Promise<unknown>;
  waitForTimeout: (ms: number) => Promise<void>;
  screenshot: (options: { path: string; fullPage?: boolean }) => Promise<unknown>;
  evaluate: (fn: string) => Promise<unknown>;
  mouse: { wheel: (x: number, y: number) => Promise<void> };
};

let browser: PlaywrightBrowser | null = null;
let page: PlaywrightPage | null = null;

async function getPage() {
  if (page) return page;
  let chromium: { launch: (options: unknown) => Promise<PlaywrightBrowser> };
  try {
    ({ chromium } = (await import("playwright")) as never);
  } catch {
    throw new Error(
      "Playwright n'est pas installé. Lance install_package (npm, ['playwright']) puis shell: 'bunx playwright install chromium --with-deps'.",
    );
  }
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  page = await browser.newPage();
  return page;
}

async function snapshot(active: PlaywrightPage, wantText: boolean) {
  const html = await active.content();
  const forms = [...html.matchAll(/<(input|textarea|select|button)[^>]*>/gi)]
    .slice(0, 40)
    .map((match) => match[0].replace(/\s+/g, " ").slice(0, 200));
  return {
    url: active.url(),
    title: await active.title(),
    text: wantText ? htmlToText(html).slice(0, 15_000) : undefined,
    interactiveElements: forms,
  };
}

export const browserTool = logged(
  "browser",
  "web",
  tool({
    description:
      "Pilote un vrai navigateur Chromium: naviguer, cliquer, remplir des champs, soumettre des formulaires, scroller, exécuter du JS, prendre une capture d'écran. La session reste ouverte entre les appels pour enchaîner plusieurs étapes (connexion, formulaires, achats, dashboards).",
    inputSchema: z.object({
      action: z.enum([
        "goto",
        "click",
        "type",
        "press",
        "select",
        "scroll",
        "wait",
        "screenshot",
        "evaluate",
        "read",
        "close",
      ]),
      url: z.string().optional().describe("Pour goto"),
      selector: z.string().optional().describe("Sélecteur CSS de la cible"),
      value: z.string().optional().describe("Texte à saisir, option à choisir, ou touche"),
      script: z.string().optional().describe("JS à exécuter dans la page (action evaluate)"),
      ms: z.number().optional().describe("Durée d'attente pour wait"),
      includeText: z.boolean().optional().describe("Retourner le texte de la page, défaut true"),
    }),
    async execute({ action, url, selector, value, script, ms, includeText }) {
      if (action === "close") {
        await browser?.close().catch(() => undefined);
        browser = null;
        page = null;
        return { closed: true };
      }

      const active = await getPage();
      const wantText = includeText ?? true;

      switch (action) {
        case "goto":
          if (!url) throw new Error("url requis pour goto");
          await active.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
          break;
        case "click":
          if (!selector) throw new Error("selector requis");
          await active.click(selector, { timeout: 30_000 });
          await active.waitForTimeout(800);
          break;
        case "type":
          if (!selector || value === undefined) throw new Error("selector et value requis");
          await active.fill(selector, value, { timeout: 30_000 });
          break;
        case "press":
          if (!selector || !value) throw new Error("selector et value (touche) requis");
          await active.press(selector, value);
          await active.waitForTimeout(800);
          break;
        case "select":
          if (!selector || !value) throw new Error("selector et value requis");
          await active.selectOption(selector, value);
          break;
        case "scroll":
          await active.mouse.wheel(0, ms ?? 1200);
          break;
        case "wait":
          if (selector) await active.waitForSelector(selector, { timeout: ms ?? 30_000 });
          else await active.waitForTimeout(ms ?? 2000);
          break;
        case "screenshot": {
          ensureWorkspace();
          const path = join(WORKSPACE, `screenshot-${Date.now()}.png`);
          await active.screenshot({ path, fullPage: true });
          return { screenshotPath: path, url: active.url() };
        }
        case "evaluate": {
          if (!script) throw new Error("script requis");
          const result = await active.evaluate(script);
          return { result: JSON.stringify(result ?? null).slice(0, 10_000), url: active.url() };
        }
        case "read":
          break;
      }

      return snapshot(active, wantText);
    },
  }),
);
