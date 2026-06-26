import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ForgeConfig } from "./types.js";
import { buildGenerationPrompt } from "./feedback.js";

export async function generateCandidates(
  basePrompt: string,
  _attempt: number,
  previousFeedback: string | null,
  config: ForgeConfig
): Promise<string> {
  const prompt = buildGenerationPrompt(basePrompt, previousFeedback);
  const count = Math.max(1, config.parallelCandidates);

  const results = await Promise.all(
    Array.from({ length: count }, () =>
      generateSingle(prompt, config.generatorModel)
    )
  );

  if (results.length === 1) return results[0];
  return results[0];
}

async function generateSingle(
  prompt: string,
  model: string
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for code generation");
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const { text } = await generateText({
    model: anthropic(model),
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
