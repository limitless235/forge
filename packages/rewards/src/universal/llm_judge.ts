import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { FileContext, ForgeConfig, RewardFunction } from "@forge/core";
import { makeScore } from "../base.js";

const judgeSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string(),
});

export function createLlmJudgeScorer(task: string): RewardFunction {
  return {
    name: "llm_judge",
    languages: ["python", "typescript", "javascript", "rust"],
    category: "llm_judge",

    async isAvailable(): Promise<boolean> {
      return Boolean(process.env.ANTHROPIC_API_KEY);
    },

    async score(code: string, _ctx: FileContext, _session, config?: ForgeConfig) {
      const start = Date.now();
      const judgeModel =
        config?.judgeModel ?? "claude-haiku-4-5-20251001";

      if (!process.env.ANTHROPIC_API_KEY) {
        return makeScore(
          "llm_judge",
          0.5,
          "ANTHROPIC_API_KEY not set",
          Date.now() - start
        );
      }

      try {
        const anthropic = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const { object } = await generateObject({
          model: anthropic(judgeModel),
          schema: judgeSchema,
          prompt: `You are a code quality judge. Developer asked for:
${task}

Generated code:
${code}

Rate on: logical correctness, edge case handling, readability, security.
Respond ONLY with valid JSON: {"score": 0.0-1.0, "feedback": "one sentence"}`,
        });

        return makeScore(
          "llm_judge",
          object.score,
          object.feedback,
          Date.now() - start
        );
      } catch {
        return makeScore(
          "llm_judge",
          0.5,
          "Judge parse failed — neutral score",
          Date.now() - start
        );
      }
    },
  };
}
