import type {
  FileContext,
  ForgeConfig,
  RewardFunction,
  RewardScore,
} from "@forge/core";
import { writeTempFile } from "@forge/core";

export interface ScorerContext {
  weight: number;
  config?: ForgeConfig;
}

export async function runScorer(
  fn: RewardFunction,
  code: string,
  ctx: FileContext,
  weight: number,
  config?: ForgeConfig
): Promise<RewardScore> {
  const start = Date.now();
  try {
    const result = await fn.score(code, ctx, undefined, config);
    return { ...result, weight };
  } catch (error) {
    return {
      name: fn.name,
      score: 0,
      weight,
      feedback: `Scorer failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - start,
      skipped: true,
    };
  }
}

export async function withTempFile<T>(
  code: string,
  filePath: string,
  fn: (tempPath: string) => Promise<T>
): Promise<T> {
  const tempPath = await writeTempFile(code, filePath);
  return fn(tempPath);
}

export function makeScore(
  name: string,
  score: number,
  feedback: string,
  durationMs: number,
  rawOutput?: string
): RewardScore {
  return {
    name,
    score: Math.max(0, Math.min(1, score)),
    weight: 0,
    feedback,
    rawOutput,
    durationMs,
  };
}
