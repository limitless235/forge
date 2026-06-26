import { existsSync } from "node:fs";
import type { FileContext, RewardFunction } from "@forge/core";
import { execTool } from "@forge/core";
import { makeScore, withTempFile } from "../base.js";

function parsePytestOutput(output: string): {
  passed: number;
  total: number;
  feedback: string;
} {
  const summary = output.match(/(\d+)\s+passed(?:,\s*(\d+)\s+failed)?/);
  const failedMatch = output.match(/(\d+)\s+failed/);
  const passed = summary ? parseInt(summary[1], 10) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
  const total = passed + failed || Math.max(passed, 1);
  const feedback = output.slice(0, 500).trim() || "No test output";
  return { passed, total, feedback };
}

export const pytestScorer: RewardFunction = {
  name: "pytest",
  languages: ["python"],
  category: "tests",

  async isAvailable(ctx: FileContext): Promise<boolean> {
    return Boolean(ctx.testFilePath && existsSync(ctx.testFilePath));
  },

  async score(code: string, ctx: FileContext) {
    const start = Date.now();
    if (!ctx.testFilePath) {
      return makeScore("pytest", 0, "No test file found", Date.now() - start);
    }

    return withTempFile(code, ctx.filePath, async () => {
      let result = await execTool(
        `pytest "${ctx.testFilePath}" --tb=short -q 2>&1`,
        ctx.projectRoot
      );
      if (result.exitCode !== 0 && result.stdout.includes("command not found")) {
        result = await execTool(
          `python -m pytest "${ctx.testFilePath}" --tb=short -q 2>&1`,
          ctx.projectRoot
        );
      }

      const output = `${result.stdout}\n${result.stderr}`;
      const { passed, total, feedback } = parsePytestOutput(output);
      const score = total > 0 ? passed / total : 0;
      return makeScore(
        "pytest",
        score,
        `${total - passed}/${total} tests failed: ${feedback}`,
        Date.now() - start,
        output
      );
    });
  },
};
