import { generateObject } from "ai";
import { z } from "zod";
import type { FileContext, ForgeConfig, RewardFunction } from "@forge/core";
import {
  createLanguageModel,
  isLlmAvailable,
  resolveLlmConfig,
} from "@forge/core";
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

    async isAvailable(_ctx, _session, config?: ForgeConfig) {
      if (!config) return false;
      return isLlmAvailable(config);
    },

    async score(code: string, _ctx: FileContext, _session, config?: ForgeConfig) {
      const start = Date.now();

      if (!config || !isLlmAvailable(config)) {
        const apiKeyEnv = config
          ? resolveLlmConfig(config).apiKeyEnv
          : "ANTHROPIC_API_KEY";
        return makeScore(
          "llm_judge",
          0.5,
          `${apiKeyEnv} not set`,
          Date.now() - start
        );
      }

      const { judgeModel } = resolveLlmConfig(config);

      try {
        const model = createLanguageModel(config, judgeModel);

        const { object } = await generateObject({
          model,
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
