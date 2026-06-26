// ─── Shared types for FORGE v1 ───────────────────────────────────────────────

export type ForgeLanguage =
  | "python"
  | "typescript"
  | "javascript"
  | "rust"
  | "auto";

export interface Candidate {
  id: string;
  attempt: number;
  code: string;
  scores: RewardScore[];
  compositeScore: number;
  timestamp: number;
}

export interface RewardScore {
  name: string;
  score: number;
  weight: number;
  feedback: string;
  rawOutput?: string;
  durationMs: number;
  skipped?: boolean;
}

export interface ForgeRequest {
  task: string;
  context: FileContext;
  language: ForgeLanguage;
  config: ForgeConfig;
  sessionState?: SessionState;
  codebases?: CodebaseContext;
}

export interface ForgeResult {
  best: Candidate;
  all: Candidate[];
  converged: boolean;
  totalDurationMs: number;
  tokenSavings: number;
  layersActive: ("v1" | "v2" | "v3")[];
}

export interface FileContext {
  filePath: string;
  language: string;
  existingCode: string;
  imports: string[];
  testFilePath?: string;
  projectRoot: string;
}

export interface RewardWeights {
  tests: number;
  linter: number;
  types: number;
  complexity: number;
  llm_judge: number;
}

export interface RewardGates {
  llm_judge?: { minMechanicalScore: number };
}

export interface ForgeConfig {
  maxIterations: number;
  scoreThreshold: number;
  parallelCandidates: number;
  judgeModel: string;
  generatorModel: string;
  silent: boolean;
  logScores: boolean;
  reportFailures: boolean;
  rewards: RewardWeights;
  rewardGates: RewardGates;
  skip: string[];
  customRewards: CustomRewardConfig[];
  overrides: Record<string, Partial<ForgeConfig>>;
}

export interface CustomRewardConfig {
  name: string;
  language: string[];
  command: string;
  scoreFromOutput: string;
}

export interface RewardFunction {
  name: string;
  languages: string[];
  category: keyof RewardWeights;
  isAvailable(ctx: FileContext): Promise<boolean>;
  score(
    code: string,
    ctx: FileContext,
    sessionState?: SessionState,
    config?: ForgeConfig
  ): Promise<RewardScore>;
}

// v2/v3 placeholders — unused in v1
export interface SessionState {
  sessionId: string;
}

export interface CodebaseContext {
  projectRoot: string;
}

export const DEFAULT_FORGE_CONFIG: ForgeConfig = {
  maxIterations: 4,
  scoreThreshold: 0.82,
  parallelCandidates: 1,
  judgeModel: "claude-haiku-4-5-20251001",
  generatorModel: "claude-sonnet-4-6",
  silent: true,
  logScores: true,
  reportFailures: false,
  rewards: {
    tests: 0.45,
    linter: 0.2,
    types: 0.2,
    complexity: 0.1,
    llm_judge: 0.05,
  },
  rewardGates: {
    llm_judge: { minMechanicalScore: 0.5 },
  },
  skip: [],
  customRewards: [],
  overrides: {},
};
