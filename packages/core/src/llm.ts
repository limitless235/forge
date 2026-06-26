import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ForgeConfig, LlmConfig, LlmProvider } from "./types.js";

const DEFAULT_API_KEY_ENV: Record<LlmProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  "openai-compatible": "FORGE_API_KEY",
};

export function resolveLlmConfig(config: ForgeConfig): LlmConfig {
  const llm = config.llm;
  const provider = llm?.provider ?? "anthropic";
  const apiKeyEnv = llm?.apiKeyEnv ?? DEFAULT_API_KEY_ENV[provider];

  return {
    provider,
    apiKeyEnv,
    generatorModel: llm?.generatorModel ?? config.generatorModel,
    judgeModel: llm?.judgeModel ?? config.judgeModel,
    baseUrl: llm?.baseUrl,
  };
}

export function getApiKey(config: ForgeConfig): string | undefined {
  const { apiKeyEnv } = resolveLlmConfig(config);
  return process.env[apiKeyEnv];
}

export function createLanguageModel(
  config: ForgeConfig,
  modelId: string
): LanguageModel {
  const llm = resolveLlmConfig(config);
  const apiKey = process.env[llm.apiKeyEnv];

  if (!apiKey) {
    throw new Error(
      `${llm.apiKeyEnv} is required for provider "${llm.provider}"`
    );
  }

  switch (llm.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey,
        baseURL: llm.baseUrl ?? "https://openrouter.ai/api/v1",
      });
      return openrouter(modelId);
    }
    case "openai-compatible": {
      if (!llm.baseUrl) {
        throw new Error(
          "llm.baseUrl is required when provider is openai-compatible"
        );
      }
      const compatible = createOpenAI({
        apiKey,
        baseURL: llm.baseUrl,
      });
      return compatible(modelId);
    }
    default: {
      const _exhaustive: never = llm.provider;
      throw new Error(`Unsupported provider: ${_exhaustive}`);
    }
  }
}

export function isLlmAvailable(config: ForgeConfig): boolean {
  return Boolean(getApiKey(config));
}
