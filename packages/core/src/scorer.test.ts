import { describe, it, expect } from "vitest";
import {
  normalizeWeights,
  gateLlmJudge,
  weightedAverage,
} from "./scorer.js";
import type { PreparedReward, RewardScore } from "./types.js";

describe("normalizeWeights", () => {
  it("redistributes weights to sum to 1.0", () => {
    const prepared: PreparedReward[] = [
      { fn: { name: "a" } as PreparedReward["fn"], weight: 0.45 },
      { fn: { name: "b" } as PreparedReward["fn"], weight: 0.2 },
    ];
    const result = normalizeWeights(prepared);
    const sum = result.reduce((s, p) => s + p.weight, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it("assigns equal weights when all zero", () => {
    const prepared: PreparedReward[] = [
      { fn: { name: "a" } as PreparedReward["fn"], weight: 0 },
      { fn: { name: "b" } as PreparedReward["fn"], weight: 0 },
    ];
    const result = normalizeWeights(prepared);
    expect(result[0].weight).toBeCloseTo(0.5);
    expect(result[1].weight).toBeCloseTo(0.5);
  });
});

describe("weightedAverage", () => {
  it("computes weighted composite", () => {
    const scores: RewardScore[] = [
      { name: "a", score: 1.0, weight: 0.5, feedback: "", durationMs: 0 },
      { name: "b", score: 0.0, weight: 0.5, feedback: "", durationMs: 0 },
    ];
    expect(weightedAverage(scores)).toBeCloseTo(0.5);
  });

  it("skips skipped scorers", () => {
    const scores: RewardScore[] = [
      { name: "a", score: 1.0, weight: 0.5, feedback: "", durationMs: 0 },
      {
        name: "b",
        score: 0.0,
        weight: 0.5,
        feedback: "",
        durationMs: 0,
        skipped: true,
      },
    ];
    expect(weightedAverage(scores)).toBeCloseTo(1.0);
  });
});

describe("gateLlmJudge", () => {
  it("skips judge when mechanical score is below threshold", () => {
    const scores: RewardScore[] = [
      { name: "pytest", score: 0.2, weight: 0.45, feedback: "", durationMs: 0 },
      { name: "ruff", score: 0.3, weight: 0.2, feedback: "", durationMs: 0 },
      {
        name: "llm_judge",
        score: 0.9,
        weight: 0.05,
        feedback: "",
        durationMs: 0,
      },
    ];
    const result = gateLlmJudge(scores, 0.5);
    const judge = result.find((s) => s.name === "llm_judge");
    expect(judge?.skipped).toBe(true);
    expect(judge?.score).toBe(0.5);
  });

  it("keeps judge when mechanical score meets threshold", () => {
    const scores: RewardScore[] = [
      { name: "pytest", score: 0.9, weight: 0.45, feedback: "", durationMs: 0 },
      { name: "ruff", score: 0.9, weight: 0.2, feedback: "", durationMs: 0 },
      {
        name: "llm_judge",
        score: 0.8,
        weight: 0.05,
        feedback: "good",
        durationMs: 0,
      },
    ];
    const result = gateLlmJudge(scores, 0.5);
    const judge = result.find((s) => s.name === "llm_judge");
    expect(judge?.skipped).toBeUndefined();
    expect(judge?.score).toBe(0.8);
  });
});
