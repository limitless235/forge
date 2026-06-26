import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FileContext, RewardFunction } from "@forge/core";
import { execTool } from "@forge/core";
import { makeScore } from "../base.js";

function parseCargoTestOutput(output: string): {
  passed: number;
  total: number;
  feedback: string;
} {
  const resultLine = output.match(
    /test result:.*?(\d+) passed(?:;\s*(\d+) failed)?/
  );
  const passed = resultLine ? parseInt(resultLine[1], 10) : 0;
  const failed = resultLine?.[2] ? parseInt(resultLine[2], 10) : 0;
  const total = passed + failed || 1;
  const failLines = output
    .split("\n")
    .filter((l) => l.includes("FAILED") || l.includes("panicked"))
    .slice(0, 3);
  return {
    passed,
    total,
    feedback: failLines.join("; ") || output.slice(0, 300),
  };
}

export const cargoTestScorer: RewardFunction = {
  name: "cargo_test",
  languages: ["rust"],
  category: "tests",

  async isAvailable(ctx: FileContext): Promise<boolean> {
    return existsSync(join(ctx.projectRoot, "Cargo.toml"));
  },

  async score(_code: string, ctx: FileContext) {
    const start = Date.now();
    const result = await execTool("cargo test 2>&1", ctx.projectRoot);
    const output = `${result.stdout}\n${result.stderr}`;
    const { passed, total, feedback } = parseCargoTestOutput(output);
    return makeScore(
      "cargo_test",
      passed / total,
      feedback,
      Date.now() - start,
      output
    );
  },
};
