import z from "zod";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { logged } from "../logging";
import { db } from "../../database";
import { credentials } from "../../database/schema";

/**
 * Replaces {{secret.NAME}} placeholders with values from the credentials table
 * (or {{env.NAME}} with process env), so the agent can call any authenticated
 * API without ever seeing the raw key.
 */
async function injectSecrets(input: string) {
  let output = input;
  const secretMatches = [...input.matchAll(/\{\{\s*secret\.([A-Z0-9_-]+)\s*\}\}/gi)];
  for (const match of secretMatches) {
    const [row] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.name, match[1]!))
      .limit(1);
    if (!row) throw new Error(`Credential "${match[1]}" introuvable — ajoute-la dans Réglages.`);
    output = output.split(match[0]).join(row.value);
  }
  return output.replace(
    /\{\{\s*env\.([A-Z0-9_]+)\s*\}\}/gi,
    (_, key) => process.env[key as string] ?? "",
  );
}

export const httpRequest = logged(
  "http_request",
  "network",
  tool({
    description:
      "Appelle n'importe quelle API externe (REST, webhook, GraphQL). Supporte toutes les méthodes, headers et corps JSON ou texte. Pour l'authentification, utilise le placeholder {{secret.NOM}} (clés stockées côté serveur) ou {{env.NOM}}.",
    inputSchema: z.object({
      url: z.string(),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.string().optional().describe("Corps brut, souvent du JSON stringifié"),
      timeoutSeconds: z.number().optional(),
    }),
    async execute({ url, method, headers, body, timeoutSeconds }) {
      const resolvedUrl = await injectSecrets(url);
      const resolvedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers ?? {})) {
        resolvedHeaders[key] = await injectSecrets(value);
      }
      const resolvedBody = body ? await injectSecrets(body) : undefined;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), (timeoutSeconds ?? 60) * 1000);
      try {
        const response = await fetch(resolvedUrl, {
          method: method ?? "GET",
          headers: resolvedHeaders,
          body: resolvedBody,
          signal: controller.signal,
        });
        const text = await response.text();
        return {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          body: text.slice(0, 40_000),
        };
      } finally {
        clearTimeout(timer);
      }
    },
  }),
);

export const listCredentials = logged(
  "list_credentials",
  "network",
  tool({
    description:
      "Liste les noms des credentials disponibles (jamais les valeurs) pour savoir quelles APIs sont accessibles via {{secret.NOM}}.",
    inputSchema: z.object({}),
    async execute() {
      const rows = await db.select().from(credentials);
      return {
        credentials: rows.map((row) => ({ name: row.name, note: row.note })),
        envKeys: Object.keys(process.env)
          .filter((key) => /API|KEY|TOKEN|SECRET|URL/i.test(key))
          .slice(0, 60),
      };
    },
  }),
);
