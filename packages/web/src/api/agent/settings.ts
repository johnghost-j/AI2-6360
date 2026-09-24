import { eq } from "drizzle-orm";
import { db } from "../database";
import { appSettings } from "../database/schema";

/** Keys stored in the app_settings table. */
export const SETTING = {
  provider: "ai_provider",
  abliterationKey: "abliteration_api_key",
  abliterationModel: "abliteration_model",
  abliterationBaseUrl: "abliteration_base_url",
} as const;

export const ABLITERATION_DEFAULTS = {
  baseURL: "https://api.abliteration.ai/v1",
  model: "abliterated-model",
};

export type AiProvider = "default" | "abliteration";

export async function getSetting(key: string) {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return row?.value ?? "";
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function deleteSetting(key: string) {
  await db.delete(appSettings).where(eq(appSettings.key, key));
}

/** Everything needed to build the engine, read in one go. */
export async function getAiConfig() {
  const rows = await db.select().from(appSettings);
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const key = map.get(SETTING.abliterationKey) ?? "";
  const provider = (map.get(SETTING.provider) as AiProvider) ?? "default";

  return {
    /** Falls back to the default engine when no key is stored yet. */
    provider: provider === "abliteration" && key ? "abliteration" : ("default" as AiProvider),
    requestedProvider: provider,
    abliteration: {
      apiKey: key,
      hasKey: Boolean(key),
      model: map.get(SETTING.abliterationModel) || ABLITERATION_DEFAULTS.model,
      baseURL: map.get(SETTING.abliterationBaseUrl) || ABLITERATION_DEFAULTS.baseURL,
    },
  };
}
