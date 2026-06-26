import type { ForgeRequest, RewardScore } from "./types.js";

const FEEDBACK_THRESHOLD = 0.7;

export function buildBasePrompt(request: ForgeRequest): string {
  const { task, context } = request;
  const parts = [
    "You are a precise code generation assistant.",
    "Output only the complete file code — no explanation, no markdown fences.",
    "",
    `File: ${context.filePath}`,
    `Language: ${context.language}`,
    "",
  ];

  if (context.imports.length > 0) {
    parts.push("Existing imports in file:");
    parts.push(context.imports.join("\n"));
    parts.push("");
  }

  if (context.existingCode.trim()) {
    parts.push("Current file content:");
    parts.push(context.existingCode);
    parts.push("");
  }

  parts.push("Developer task (verbatim):");
  parts.push(task);

  return parts.join("\n");
}

export function buildRetryPrompt(
  attempt: number,
  compositeScore: number,
  scores: RewardScore[]
): string {
  const issues = scores.filter((s) => !s.skipped && s.score < FEEDBACK_THRESHOLD);

  const lines = [
    `Attempt ${attempt} scored ${compositeScore.toFixed(2)}/1.0.`,
    "",
    "Issues to fix (only these — do not change anything else):",
  ];

  for (const score of issues) {
    lines.push(`  [${score.name}] ${score.feedback}`);
    if (score.rawOutput) {
      lines.push(`  ${score.rawOutput.slice(0, 400)}`);
    }
  }

  lines.push("");
  lines.push(
    "Generate a corrected version addressing exactly these issues."
  );
  lines.push("Output only the code — no explanation, no markdown fences.");

  return lines.join("\n");
}

export function buildGenerationPrompt(
  basePrompt: string,
  retryFeedback: string | null
): string {
  if (!retryFeedback) return basePrompt;
  return `${basePrompt}\n\n${retryFeedback}`;
}
