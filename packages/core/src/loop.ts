import { v4 as uuid } from "uuid";
import { estimateTokenSavings } from "./cache.js";
import { detectLanguage, normalizeLanguage } from "./detect.js";
import { buildBasePrompt, buildRetryPrompt } from "./feedback.js";
import { generateCandidates } from "./generator.js";
import { persistScores } from "./persist.js";
import {
  gateLlmJudge,
  RewardRegistry,
  weightedAverage,
} from "./scorer.js";
import type {
  Candidate,
  ForgeRequest,
  ForgeResult,
  RewardFunction,
} from "./types.js";

export class ForgeLoop {
  async run(
    request: ForgeRequest,
    allScorers: RewardFunction[]
  ): Promise<ForgeResult> {
    const startTime = Date.now();
    const lang = normalizeLanguage(
      detectLanguage(
        request.context.filePath,
        request.context.existingCode,
        request.language
      )
    );
    request.context.language = lang;

    const prepared = await RewardRegistry.forLanguage(
      lang,
      request.config,
      allScorers,
      request.context
    );

    const basePrompt = buildBasePrompt(request);
    const allCandidates: Candidate[] = [];
    let previousFeedback: string | null = null;

    for (
      let attempt = 1;
      attempt <= request.config.maxIterations;
      attempt++
    ) {
      const raw = await generateCandidates(
        basePrompt,
        attempt,
        previousFeedback,
        request.config
      );

      const rawScores = await Promise.all(
        prepared.map(async ({ fn, weight }) => {
          const result = await fn.score(
            raw,
            request.context,
            request.sessionState,
            request.config
          );
          return { ...result, weight };
        })
      );

      const gatedScores = gateLlmJudge(
        rawScores,
        request.config.rewardGates.llm_judge?.minMechanicalScore ?? 0.5
      );

      const compositeScore = weightedAverage(gatedScores);

      const candidate: Candidate = {
        id: uuid(),
        attempt,
        code: raw,
        scores: gatedScores,
        compositeScore,
        timestamp: Date.now(),
      };
      allCandidates.push(candidate);

      if (compositeScore >= request.config.scoreThreshold) break;

      previousFeedback = buildRetryPrompt(
        attempt,
        compositeScore,
        gatedScores
      );
    }

    const best = allCandidates.reduce((a, b) =>
      a.compositeScore > b.compositeScore ? a : b
    );

    const converged = best.compositeScore >= request.config.scoreThreshold;
    const tokenSavings = estimateTokenSavings(
      basePrompt,
      allCandidates.length
    );
    const totalDurationMs = Date.now() - startTime;

    setImmediate(() => {
      void persistScores(
        best,
        allCandidates,
        request,
        tokenSavings,
        totalDurationMs,
        converged
      );
    });

    return {
      best,
      all: allCandidates,
      converged,
      totalDurationMs,
      tokenSavings,
      layersActive: ["v1"],
    };
  }
}

export const forgeLoop = new ForgeLoop();
