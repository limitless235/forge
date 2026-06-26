import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Candidate, ForgeRequest, RewardScore } from "./types.js";
import { taskHash } from "./utils.js";

export interface ScoreLogEntry {
  ts: number;
  file: string;
  task_hash: string;
  language: string;
  attempts: number;
  finalScore: number;
  converged: boolean;
  tokenSavings: number;
  durationMs: number;
  scores: Record<string, number>;
  layer: "v1";
}

function scoresToRecord(scores: RewardScore[]): Record<string, number> {
  const record: Record<string, number> = {};
  for (const s of scores) {
    record[s.name] = s.score;
  }
  return record;
}

export async function persistScores(
  best: Candidate,
  all: Candidate[],
  request: ForgeRequest,
  tokenSavings: number,
  totalDurationMs: number,
  converged: boolean
): Promise<void> {
  if (!request.config.logScores) return;

  const logDir = join(request.context.projectRoot, ".forge");
  const logPath = join(logDir, "scores.jsonl");

  const entry: ScoreLogEntry = {
    ts: Date.now(),
    file: request.context.filePath,
    task_hash: taskHash(request.task),
    language: request.context.language,
    attempts: all.length,
    finalScore: best.compositeScore,
    converged,
    tokenSavings,
    durationMs: totalDurationMs,
    scores: scoresToRecord(best.scores),
    layer: "v1",
  };

  try {
    await mkdir(logDir, { recursive: true });
    await appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Never block — swallow persistence errors
  }
}

export async function readScoreLog(
  projectRoot: string,
  options: { file?: string; last?: number } = {}
): Promise<ScoreLogEntry[]> {
  const { readFile } = await import("node:fs/promises");
  const logPath = join(projectRoot, ".forge", "scores.jsonl");

  let content: string;
  try {
    content = await readFile(logPath, "utf8");
  } catch {
    return [];
  }

  const entries = content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ScoreLogEntry);

  let filtered = entries;
  if (options.file) {
    filtered = filtered.filter((e) => e.file === options.file);
  }

  const last = options.last ?? 20;
  return filtered.slice(-last);
}
