import { describe, it, expect, afterEach } from "vitest";
import {
  resolveLlmConfig,
  createLanguageModel,
  isLlmAvailable,
} from "./llm.js";
import { DEFAULT_FORGE_CONFIG } from "./types.js";

describe("resolveLlmConfig", () => {
  it("uses defaults for anthropic", () => {
    const config = resolveLlmConfig(DEFAULT_FORGE_CONFIG);
    expect(config.provider).toBe("anthropic");
    expect(config.apiKeyEnv).toBe("ANTHROPIC_API_KEY");
    expect(config.generatorModel).toBe("claude-sonnet-4-6");
  });

  it("respects llm block overrides", () => {
    const config = resolveLlmConfig({
      ...DEFAULT_FORGE_CONFIG,
      llm: {
        provider: "openai",
        apiKeyEnv: "OPENAI_API_KEY",
        generatorModel: "gpt-4.1",
        judgeModel: "gpt-4.1-mini",
      },
    });
    expect(config.provider).toBe("openai");
    expect(config.apiKeyEnv).toBe("OPENAI_API_KEY");
    expect(config.generatorModel).toBe("gpt-4.1");
  });
});

describe("isLlmAvailable", () => {
  const original = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (original) process.env.ANTHROPIC_API_KEY = original;
    else delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns false when API key is missing", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(isLlmAvailable(DEFAULT_FORGE_CONFIG)).toBe(false);
  });

  it("returns true when API key is set", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    expect(isLlmAvailable(DEFAULT_FORGE_CONFIG)).toBe(true);
  });
});

describe("createLanguageModel", () => {
  it("throws when API key is missing", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() =>
      createLanguageModel(DEFAULT_FORGE_CONFIG, "claude-sonnet-4-6")
    ).toThrow("ANTHROPIC_API_KEY");
  });

  it("throws when openai-compatible missing baseUrl", () => {
    process.env.FORGE_API_KEY = "test";
    expect(() =>
      createLanguageModel(
        {
          ...DEFAULT_FORGE_CONFIG,
          llm: {
            provider: "openai-compatible",
            apiKeyEnv: "FORGE_API_KEY",
          },
        },
        "my-model"
      )
    ).toThrow("llm.baseUrl");
    delete process.env.FORGE_API_KEY;
  });
});
