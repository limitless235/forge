import { languageMatches } from "./detect.js";
import type {
  FileContext,
  ForgeConfig,
  RewardFunction,
  RewardScore,
  RewardWeights,
} from "./types.js";

export { weightedAverage } from "./utils.js";

export interface PreparedReward {
  fn: RewardFunction;
  weight: number;
}

export class RewardRegistry {
  static async forLanguage(
    lang: string,
    config: ForgeConfig,
    allScorers: RewardFunction[],
    ctx: FileContext
  ): Promise<PreparedReward[]> {
    const skipSet = new Set(config.skip);

    const candidates = allScorers.filter(
      (fn) =>
        !skipSet.has(fn.name) &&
        languageMatches(fn.languages, lang)
    );

    const available: PreparedReward[] = [];

    for (const fn of candidates) {
      const isAvailable = await fn
        .isAvailable(ctx, undefined, config)
        .catch(() => false);
      if (isAvailable) {
        available.push({
          fn,
          weight: config.rewards[fn.category] ?? 0,
        });
      }
    }

    return normalizeWeights(available);
  }

  static applyWeights(
    scores: RewardScore[],
    prepared: PreparedReward[]
  ): RewardScore[] {
    const weightMap = new Map(prepared.map((p) => [p.fn.name, p.weight]));
    return scores.map((s) => ({
      ...s,
      weight: weightMap.get(s.name) ?? s.weight,
    }));
  }
}

export function normalizeWeights(
  prepared: PreparedReward[]
): PreparedReward[] {
  if (prepared.length === 0) return prepared;

  const total = prepared.reduce((sum, p) => sum + p.weight, 0);
  if (total === 0) {
    const even = 1 / prepared.length;
    return prepared.map((p) => ({ ...p, weight: even }));
  }

  return prepared.map((p) => ({ ...p, weight: p.weight / total }));
}

export function applyCategoryWeights(
  scorers: RewardFunction[],
  rewards: RewardWeights
): Map<string, number> {
  const map = new Map<string, number>();
  for (const scorer of scorers) {
    map.set(scorer.name, rewards[scorer.category] ?? 0);
  }
  return map;
}

export function gateLlmJudge(
  scores: RewardScore[],
  minMechanicalScore: number
): RewardScore[] {
  const mechanical = scores.filter((s) => s.name !== "llm_judge");
  const mechanicalComposite =
    mechanical.length > 0
      ? mechanical.reduce((sum, s) => sum + s.score, 0) / mechanical.length
      : 0;

  if (mechanicalComposite >= minMechanicalScore) return scores;

  return scores.map((s) => {
    if (s.name !== "llm_judge") return s;
    return {
      ...s,
      skipped: true,
      score: 0.5,
      feedback: "Skipped — mechanical score below gate threshold",
    };
  });
}
