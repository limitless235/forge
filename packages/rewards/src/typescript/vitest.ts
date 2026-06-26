import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FileContext, RewardFunction } from "@forge/core";
import { execTool } from "@forge/core";
import { makeScore } from "../base.js";

function hasVitest(projectRoot: string): boolean {
  try {
    const pkg = JSON.parse(
      readFileSync(join(projectRoot, "package.json"), "utf8")
    ) as { devDependencies?: Record<string, string> };
    return Boolean(pkg.devDependencies?.vitest);
  } catch {
    return false;
  }
}

function parseVitestOutput(output: string): {
  passed: number;
  total: number;
  feedback: string;
} {
  const passMatch = output.match(/(\d+)\s+passed/);
  const failMatch = output.match(/(\d+)\s+failed/);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const total = passed + failed || 1;
  const failLines = output
    .split("\n")
    .filter((l) => l.toLowerCase().includes("fail"))
    .slice(0, 3);
  return {
    passed,
    total,
    feedback: failLines.join("; ") || output.slice(0, 300),
  };
}

export const vitestScorer: RewardFunction = {
  name: "vitest",
  languages: ["typescript", "javascript"],
  category: "tests",

  async isAvailable(ctx: FileContext): Promise<boolean> {
    return (
      hasVitest(ctx.projectRoot) &&
      Boolean(ctx.testFilePath && existsSync(ctx.testFilePath))
    );
  },

  async score(_code: string, ctx: FileContext) {
    const start = Date.now();
    if (!ctx.testFilePath) {
      return makeScore("vitest", 0, "No test file found", Date.now() - start);
    }

    const result = await execTool(
      `npx vitest run "${ctx.testFilePath}" 2>&1`,
      ctx.projectRoot
    );
    const output = `${result.stdout}\n${result.stderr}`;
    const { passed, total, feedback } = parseVitestOutput(output);
    return makeScore(
      "vitest",
      passed / total,
      feedback,
      Date.now() - start,
      output
    );
  },
};
