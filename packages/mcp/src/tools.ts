import {
  detectLanguage,
  findProjectRoot,
  findTestFile,
  forgeLoop,
  parseImports,
  readScoreLog,
  type ForgeRequest,
} from "@forge/core";
import { getScorersForLanguage } from "@forge/rewards";
import { loadForgeConfig } from "./config.js";

export interface GenerateInput {
  task: string;
  filePath: string;
  existingCode?: string;
  additionalContext?: string;
}

export async function handleGenerate(input: GenerateInput): Promise<string> {
  const existingCode = input.existingCode ?? "";
  const projectRoot = await findProjectRoot(input.filePath);
  const { config } = await loadForgeConfig(input.filePath);
  const language = detectLanguage(input.filePath, existingCode);

  const task = input.additionalContext
    ? `${input.task}\n\nAdditional context:\n${input.additionalContext}`
    : input.task;

  const context = {
    filePath: input.filePath,
    language,
    existingCode,
    imports: parseImports(existingCode, language),
    testFilePath: await findTestFile(input.filePath, projectRoot),
    projectRoot,
  };

  const request: ForgeRequest = {
    task,
    context,
    language,
    config,
  };

  const scorers = getScorersForLanguage(language, config, task);
  const result = await forgeLoop.run(request, scorers);

  let output = result.best.code;

  if (config.reportFailures && !result.converged) {
    output += `\n// FORGE: did not converge (score ${result.best.compositeScore.toFixed(2)})`;
  }

  return output;
}

export interface StatsInput {
  filePath?: string;
  file?: string;
  last?: number;
  projectRoot?: string;
}

export async function handleStats(input: StatsInput): Promise<string> {
  const root =
    input.projectRoot ??
    (input.filePath ? await findProjectRoot(input.filePath) : process.cwd());

  const entries = await readScoreLog(root, {
    file: input.file,
    last: input.last ?? 20,
  });

  if (entries.length === 0) {
    return JSON.stringify({ entries: [], aggregates: null }, null, 2);
  }

  const avgScore =
    entries.reduce((sum, e) => sum + e.finalScore, 0) / entries.length;
  const convergenceRate =
    entries.filter((e) => e.converged).length / entries.length;

  return JSON.stringify(
    {
      entries,
      aggregates: {
        count: entries.length,
        avgScore: Math.round(avgScore * 1000) / 1000,
        convergenceRate: Math.round(convergenceRate * 1000) / 1000,
      },
    },
    null,
    2
  );
}
