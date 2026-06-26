import { describe, it, expect } from "vitest";
import { buildRetryPrompt, buildBasePrompt } from "./feedback.js";
import type { ForgeRequest, RewardScore } from "./types.js";
import { DEFAULT_FORGE_CONFIG } from "./types.js";

describe("buildRetryPrompt", () => {
  it("only includes scores below 0.70", () => {
    const scores: RewardScore[] = [
      { name: "pytest", score: 0.9, weight: 0.45, feedback: "all pass", durationMs: 0 },
      { name: "eslint", score: 0.5, weight: 0.2, feedback: "2 errors", durationMs: 0 },
      { name: "tsc", score: 0.3, weight: 0.2, feedback: "type error", durationMs: 0 },
    ];
    const prompt = buildRetryPrompt(2, 0.65, scores);
    expect(prompt).toContain("[eslint]");
    expect(prompt).toContain("[tsc]");
    expect(prompt).not.toContain("[pytest]");
  });

  it("includes attempt number and score", () => {
    const scores: RewardScore[] = [
      { name: "eslint", score: 0.5, weight: 0.2, feedback: "err", durationMs: 0 },
    ];
    const prompt = buildRetryPrompt(3, 0.55, scores);
    expect(prompt).toContain("Attempt 3 scored 0.55/1.0");
  });
});

describe("buildBasePrompt", () => {
  it("includes task and file context", () => {
    const request: ForgeRequest = {
      task: "Add a hello function",
      context: {
        filePath: "/proj/src/utils.ts",
        language: "typescript",
        existingCode: "export const x = 1;",
        imports: ["import { foo } from 'bar';"],
        projectRoot: "/proj",
      },
      language: "typescript",
      config: DEFAULT_FORGE_CONFIG,
    };
    const prompt = buildBasePrompt(request);
    expect(prompt).toContain("Add a hello function");
    expect(prompt).toContain("/proj/src/utils.ts");
    expect(prompt).toContain("import { foo } from 'bar';");
  });
});
