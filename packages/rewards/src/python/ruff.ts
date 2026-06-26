import type { FileContext, RewardFunction } from "@forge/core";
import { commandExists, execTool } from "@forge/core";
import { makeScore, withTempFile } from "../base.js";

interface RuffViolation {
  code?: string;
  message?: string;
  location?: { row?: number };
}

export const ruffScorer: RewardFunction = {
  name: "ruff",
  languages: ["python"],
  category: "linter",

  async isAvailable(): Promise<boolean> {
    return commandExists("ruff");
  },

  async score(code: string, ctx: FileContext) {
    const start = Date.now();
    return withTempFile(code, ctx.filePath, async (tempPath) => {
      const result = await execTool(
        `ruff check "${tempPath}" --output-format=json 2>&1`,
        ctx.projectRoot
      );
      const output = `${result.stdout}\n${result.stderr}`;

      let violations: RuffViolation[] = [];
      try {
        violations = JSON.parse(result.stdout) as RuffViolation[];
      } catch {
        violations = [];
      }

      const count = violations.length;
      const score = 1.0 - Math.min(1.0, count / 10);
      const feedback = violations
        .slice(0, 5)
        .map(
          (v) =>
            `${v.code ?? "ruff"} line ${v.location?.row ?? "?"}: ${v.message ?? ""}`
        )
        .join("; ") || "No violations";

      return makeScore("ruff", score, feedback, Date.now() - start, output);
    });
  },
};
