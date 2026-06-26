import type { ForgeConfig, RewardFunction } from "@forge/core";
import { pytestScorer } from "./python/pytest.js";
import { ruffScorer } from "./python/ruff.js";
import { mypyScorer } from "./python/mypy.js";
import { jestScorer } from "./typescript/jest.js";
import { vitestScorer } from "./typescript/vitest.js";
import { eslintScorer } from "./typescript/eslint.js";
import { tscScorer } from "./typescript/tsc.js";
import { cargoTestScorer } from "./rust/cargo_test.js";
import { clippyScorer } from "./rust/clippy.js";
import { complexityScorer } from "./universal/complexity.js";
import { createLlmJudgeScorer } from "./universal/llm_judge.js";
import { createCustomRewards } from "./custom.js";

const BUILTIN_SCORERS: RewardFunction[] = [
  pytestScorer,
  ruffScorer,
  mypyScorer,
  jestScorer,
  vitestScorer,
  eslintScorer,
  tscScorer,
  cargoTestScorer,
  clippyScorer,
  complexityScorer,
];

export function getScorersForLanguage(
  _lang: string,
  config: ForgeConfig,
  task: string
): RewardFunction[] {
  const custom = createCustomRewards(config.customRewards);
  return [...BUILTIN_SCORERS, createLlmJudgeScorer(task), ...custom];
}

export {
  pytestScorer,
  ruffScorer,
  mypyScorer,
  jestScorer,
  vitestScorer,
  eslintScorer,
  tscScorer,
  cargoTestScorer,
  clippyScorer,
  complexityScorer,
  createLlmJudgeScorer,
};
