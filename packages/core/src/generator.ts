import { generateText } from "ai";
import type { ForgeConfig } from "./types.js";
import { buildGenerationPrompt } from "./feedback.js";
import { createLanguageModel, resolveLlmConfig } from "./llm.js";

export async function generateCandidates(
  basePrompt: string,
  _attempt: number,
  previousFeedback: string | null,
  config: ForgeConfig
): Promise<string> {
  const prompt = buildGenerationPrompt(basePrompt, previousFeedback);
  const count = Math.max(1, config.parallelCandidates);
  const { generatorModel } = resolveLlmConfig(config);

  const results = await Promise.all(
    Array.from({ length: count }, () =>
      generateSingle(prompt, config, generatorModel)
    )
  );

  if (results.length === 1) return results[0];
  return results[0];
}

async function generateSingle(
  prompt: string,
  config: ForgeConfig,
  modelId: string
): Promise<string> {
  const model = createLanguageModel(config, modelId);

  const { text } = await generateText({
    model,
    prompt,
    maxTokens: 8192,
  });

  return stripMarkdownFences(text.trim());
}

function stripMarkdownFences(text: string): string {
  const fenceMatch = text.match(/^```[\w]*\n([\s\S]*?)\n```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  if (text.startsWith("```")) {
    return text.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return text;
}
