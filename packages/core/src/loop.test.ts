import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForgeLoop } from "./loop.js";
import type {
  FileContext,
  ForgeConfig,
  ForgeRequest,
  RewardFunction,
  RewardScore,
} from "./types.js";
import { DEFAULT_FORGE_CONFIG } from "./types.js";

vi.mock("./generator.js", () => ({
  generateCandidates: vi
    .fn()
    .mockResolvedValueOnce("attempt1 code")
    .mockResolvedValueOnce("attempt2 code")
    .mockResolvedValueOnce("attempt3 code"),
}));

const baseContext: FileContext = {
  filePath: "/proj/src/foo.ts",
  language: "typescript",
  existingCode: "",
  imports: [],
  projectRoot: "/proj",
};

function makeScorer(
  name: string,
  scores: number[]
): RewardFunction {
  let call = 0;
  return {
    name,
    languages: ["typescript"],
    category: name === "llm_judge" ? "llm_judge" : "complexity",
    async isAvailable() {
      return true;
    },
    async score() {
      const score = scores[call] ?? scores[scores.length - 1];
      call++;
      return {
        name,
        score,
        weight: 0,
        feedback: `${name} feedback`,
        durationMs: 1,
      };
    },
  };
}

describe("ForgeLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns best-scoring attempt, not last", async () => {
    const scorers = [makeScorer("complexity", [0.9, 0.5, 0.6])];
    const loop = new ForgeLoop();
    const request: ForgeRequest = {
      task: "write code",
      context: baseContext,
      language: "typescript",
      config: { ...DEFAULT_FORGE_CONFIG, maxIterations: 3, scoreThreshold: 0.99 },
    };

    const result = await loop.run(request, scorers);
    expect(result.best.attempt).toBe(1);
    expect(result.best.compositeScore).toBeCloseTo(0.9);
    expect(result.best.code).toBe("attempt1 code");
  });

  it("exits early on convergence", async () => {
    const scorers = [makeScorer("complexity", [0.95])];
    const loop = new ForgeLoop();
    const request: ForgeRequest = {
      task: "write code",
      context: baseContext,
      language: "typescript",
      config: { ...DEFAULT_FORGE_CONFIG, maxIterations: 4, scoreThreshold: 0.82 },
    };

    const result = await loop.run(request, scorers);
    expect(result.all).toHaveLength(1);
    expect(result.converged).toBe(true);
  });

  it("sets layersActive to v1", async () => {
    const scorers = [makeScorer("complexity", [0.95])];
    const loop = new ForgeLoop();
    const request: ForgeRequest = {
      task: "write code",
      context: baseContext,
      language: "typescript",
      config: DEFAULT_FORGE_CONFIG,
    };

    const result = await loop.run(request, scorers);
    expect(result.layersActive).toEqual(["v1"]);
  });
});
