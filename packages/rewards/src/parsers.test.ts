import { describe, it, expect } from "vitest";

function parsePytestOutput(output: string) {
  const summary = output.match(/(\d+)\s+passed(?:,\s*(\d+)\s+failed)?/);
  const failedMatch = output.match(/(\d+)\s+failed/);
  const passed = summary ? parseInt(summary[1], 10) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
  const total = passed + failed || Math.max(passed, 1);
  return { passed, total, score: passed / total };
}

function parseEslintErrors(stdout: string) {
  const results = JSON.parse(stdout) as Array<{
    messages?: Array<{ severity?: number }>;
  }>;
  const errors = results.flatMap(
    (r) => r.messages?.filter((m) => m.severity === 2) ?? []
  );
  const count = errors.length;
  return 1.0 - Math.min(1.0, count / 5);
}

describe("pytest output parsing", () => {
  it("parses passed/failed counts", () => {
    const output = "3 passed, 2 failed in 1.2s";
    const { passed, total, score } = parsePytestOutput(output);
    expect(passed).toBe(3);
    expect(total).toBe(5);
    expect(score).toBeCloseTo(0.6);
  });
});

describe("eslint output parsing", () => {
  it("scores based on error count", () => {
    const stdout = JSON.stringify([
      {
        messages: [
          { severity: 2, ruleId: "no-unused-vars", line: 8 },
          { severity: 1, ruleId: "warn", line: 1 },
        ],
      },
    ]);
    expect(parseEslintErrors(stdout)).toBeCloseTo(0.8);
  });

  it("returns 1.0 for no errors", () => {
    const stdout = JSON.stringify([{ messages: [] }]);
    expect(parseEslintErrors(stdout)).toBe(1.0);
  });
});

describe("tsc scoring", () => {
  it("returns 0 for any error", () => {
    const output = "src/foo.ts(34,5): error TS2345: Argument of type 'string'";
    const errorLines = output.split("\n").filter((l) => l.includes("error TS"));
    const score = errorLines.length === 0 ? 1.0 : 0.0;
    expect(score).toBe(0.0);
  });
});
