import type { FileContext, RewardFunction } from "@forge/core";
import { commandExists, execTool } from "@forge/core";
import { makeScore, withTempFile } from "../base.js";

export const mypyScorer: RewardFunction = {
  name: "mypy",
  languages: ["python"],
  category: "types",

  async isAvailable(): Promise<boolean> {
    return commandExists("mypy");
  },

  async score(code: string, ctx: FileContext) {
    const start = Date.now();
    return withTempFile(code, ctx.filePath, async (tempPath) => {
      const result = await execTool(
        `mypy "${tempPath}" --ignore-missing-imports --no-error-summary 2>&1`,
        ctx.projectRoot
      );
      const output = `${result.stdout}\n${result.stderr}`;
      const errorLines = output
        .split("\n")
        .filter((l) => l.includes("error:"));

      const errorCount = errorLines.length;
      const score = errorCount === 0 ? 1.0 : Math.max(0, 1.0 - errorCount * 0.2);
      const feedback =
        errorLines.slice(0, 5).join("; ") || "No type errors";

      return makeScore("mypy", score, feedback, Date.now() - start, output);
    });
  },
};
