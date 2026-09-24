import { createGateway, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getAiConfig } from "./settings";

export const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

/**
 * The engine the agent runs on. Abliteration AI is an OpenAI-compatible
 * endpoint, so it plugs in as a provider once a key is stored in Réglages;
 * without a key we stay on the default gateway model.
 */
export async function resolveModel(): Promise<{
  model: LanguageModel;
  label: string;
  provider: "default" | "abliteration";
}> {
  const config = await getAiConfig();

  if (config.provider === "abliteration") {
    const provider = createOpenAICompatible({
      name: "abliteration",
      baseURL: config.abliteration.baseURL,
      apiKey: config.abliteration.apiKey,
    });
    return {
      model: provider.chatModel(config.abliteration.model),
      label: `abliteration · ${config.abliteration.model}`,
      provider: "abliteration",
    };
  }

  return { model: gateway(DEFAULT_MODEL), label: DEFAULT_MODEL, provider: "default" };
}
