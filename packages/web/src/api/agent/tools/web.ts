import z from "zod";
import { tool } from "ai";
import { logged } from "../logging";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function decodeEntities(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function duckduckgo(query: string) {
  const response = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    { headers: { "user-agent": UA, "accept-language": "fr,en;q=0.8" } },
  );
  const html = await response.text();
  const results: { title: string; url: string; snippet: string }[] = [];
  const blocks = html.split('class="result results_links');
  for (const block of blocks.slice(1)) {
    const linkMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    let url = decodeEntities(linkMatch[1]!);
    const redirect = url.match(/uddg=([^&]+)/);
    if (redirect) url = decodeURIComponent(redirect[1]!);
    if (url.startsWith("//")) url = `https:${url}`;
    results.push({
      title: htmlToText(linkMatch[2]!),
      url,
      snippet: snippetMatch ? htmlToText(snippetMatch[1]!) : "",
    });
    if (results.length >= 12) break;
  }
  return results;
}

export const webSearch = logged(
  "web_search",
  "web",
  tool({
    description:
      "Recherche sur internet et retourne les meilleurs résultats (titre, URL, extrait). À utiliser dès qu'une information est récente, externe ou incertaine.",
    inputSchema: z.object({
      query: z.string(),
      maxResults: z.number().optional().describe("Défaut 8"),
    }),
    async execute({ query, maxResults }) {
      const results = await duckduckgo(query);
      return { query, results: results.slice(0, maxResults ?? 8) };
    },
  }),
);

export const fetchPage = logged(
  "fetch_page",
  "web",
  tool({
    description:
      "Ouvre une URL et retourne son contenu en texte lisible (et ses liens). Rapide, sans JavaScript — pour les sites dynamiques ou les interactions, utilise browser.",
    inputSchema: z.object({
      url: z.string(),
      includeLinks: z.boolean().optional(),
      maxChars: z.number().optional().describe("Défaut 20000"),
    }),
    async execute({ url, includeLinks, maxChars }) {
      const response = await fetch(url, {
        headers: { "user-agent": UA, "accept-language": "fr,en;q=0.8" },
        redirect: "follow",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const body = await response.text();
      if (!contentType.includes("html")) {
        return { url, status: response.status, contentType, content: body.slice(0, maxChars ?? 20_000) };
      }
      const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
      const links = includeLinks
        ? [...body.matchAll(/<a[^>]+href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
            .slice(0, 80)
            .map((match) => ({
              url: new URL(decodeEntities(match[1]!), url).toString(),
              text: htmlToText(match[2]!).slice(0, 120),
            }))
            .filter((link) => link.text)
        : undefined;
      return {
        url,
        status: response.status,
        title: title ? htmlToText(title) : null,
        content: htmlToText(body).slice(0, maxChars ?? 20_000),
        links,
      };
    },
  }),
);
