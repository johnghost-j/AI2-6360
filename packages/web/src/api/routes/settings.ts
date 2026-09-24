import z from "zod";
import { base } from "../__core/app";
import {
  ABLITERATION_DEFAULTS,
  SETTING,
  deleteSetting,
  getAiConfig,
  setSetting,
} from "../agent/settings";
import { DEFAULT_MODEL } from "../agent/gateway";

function mask(value: string) {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}••••`;
  return `${value.slice(0, 5)}••••${value.slice(-4)}`;
}

export const settings = {
  /** The key itself never leaves the server — only a masked preview does. */
  get: base.handler(async () => {
    const config = await getAiConfig();
    return {
      provider: config.requestedProvider,
      activeProvider: config.provider,
      defaultModel: DEFAULT_MODEL,
      abliteration: {
        hasKey: config.abliteration.hasKey,
        keyPreview: mask(config.abliteration.apiKey),
        model: config.abliteration.model,
        baseURL: config.abliteration.baseURL,
      },
      defaults: ABLITERATION_DEFAULTS,
    };
  }),

  saveAbliteration: base
    .input(
      z.object({
        apiKey: z.string().optional(),
        model: z.string().optional(),
        baseURL: z.string().optional(),
        activate: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      if (input.apiKey?.trim()) {
        await setSetting(SETTING.abliterationKey, input.apiKey.trim());
      }
      if (input.model !== undefined) {
        await setSetting(
          SETTING.abliterationModel,
          input.model.trim() || ABLITERATION_DEFAULTS.model,
        );
      }
      if (input.baseURL !== undefined) {
        await setSetting(
          SETTING.abliterationBaseUrl,
          input.baseURL.trim().replace(/\/+$/, "") || ABLITERATION_DEFAULTS.baseURL,
        );
      }
      if (input.activate !== undefined) {
        await setSetting(SETTING.provider, input.activate ? "abliteration" : "default");
      }
      return { ok: true };
    }),

  setProvider: base
    .input(z.object({ provider: z.enum(["default", "abliteration"]) }))
    .handler(async ({ input }) => {
      await setSetting(SETTING.provider, input.provider);
      return { ok: true };
    }),

  clearAbliteration: base.handler(async () => {
    await deleteSetting(SETTING.abliterationKey);
    await setSetting(SETTING.provider, "default");
    return { ok: true };
  }),

  /** Live round-trip against the endpoint so a bad key is caught here, not mid-task. */
  testAbliteration: base
    .input(z.object({ apiKey: z.string().optional() }).optional())
    .handler(async ({ input }) => {
      const config = await getAiConfig();
      const apiKey = input?.apiKey?.trim() || config.abliteration.apiKey;
      if (!apiKey) return { ok: false, error: "Aucune clé enregistrée." };

      const started = Date.now();
      try {
        const response = await fetch(`${config.abliteration.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.abliteration.model,
            messages: [{ role: "user", content: "Réponds uniquement: OK" }],
            max_tokens: 16,
          }),
          signal: AbortSignal.timeout(30_000),
        });

        const raw = await response.text();
        if (!response.ok) {
          let message = raw.slice(0, 300);
          try {
            const parsed = JSON.parse(raw) as { error?: { message?: string } };
            if (parsed.error?.message) message = parsed.error.message;
          } catch {
            // keep the raw body
          }
          return { ok: false, status: response.status, error: message };
        }

        const parsed = JSON.parse(raw) as {
          model?: string;
          choices?: { message?: { content?: string } }[];
        };
        return {
          ok: true,
          status: response.status,
          latencyMs: Date.now() - started,
          model: parsed.model ?? config.abliteration.model,
          reply: (parsed.choices?.[0]?.message?.content ?? "").slice(0, 200),
        };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }),
};
