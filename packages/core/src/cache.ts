import { createHash } from "node:crypto";

export function buildCacheKey(basePrompt: string): string {
  return createHash("sha256").update(basePrompt).digest("hex");
}

export function estimateTokenSavings(
  basePrompt: string,
  attemptCount: number
): number {
  if (attemptCount <= 1) return 0;
  const estimatedTokens = Math.ceil(basePrompt.length / 4);
  return estimatedTokens * (attemptCount - 1);
}
