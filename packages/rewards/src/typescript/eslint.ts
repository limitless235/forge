import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FileContext, RewardFunction } from "@forge/core";
import { execTool } from "@forge/core";
import { makeScore, withTempFile } from "../base.js";

interface EslintMessage {
  ruleId?: string;
  message?: string;
  line?: number;
  severity?: number;
}

interface EslintResult {
  messages?: EslintMessage[];
}

function hasEslintConfig(projectRoot: string): boolean {
  const configs = [
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
    ".eslintrc.yaml",
    ".eslintrc.yml",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
  ];
  return configs.some((c) => existsSync(join(projectRoot, c)));
}

export const eslintScorer: RewardFunction = {
  name: "eslint",
  languages: ["typescript", "javascript"],
  category: "linter",

  async isAvailable(ctx: FileContext): Promise<boolean> {
    return hasEslintConfig(ctx.projectRoot);
  },

  async score(code: string, ctx: FileContext) {
    const start = Date.now();
    return withTempFile(code, ctx.filePath, async (tempPath) => {
      const result = await execTool(
        `npx eslint "${tempPath}" --format=json 2>&1`,
        ctx.projectRoot
      );
      const output = `${result.stdout}\n${result.stderr}`;

      let results: EslintResult[] = [];
      try {
        results = JSON.parse(result.stdout) as EslintResult[];
      } catch {
        results = [];
      }

      const errors = results.flatMap(
        (r) => r.messages?.filter((m) => m.severity === 2) ?? []
      );
      const count = errors.length;
      const score = 1.0 - Math.min(1.0, count / 5);
      const feedback =
        errors
          .slice(0, 5)
          .map(
            (e) =>
              `${e.ruleId ?? "eslint"} line ${e.line ?? "?"}: ${e.message ?? ""}`
          )
          .join("; ") || "No errors";

      return makeScore("eslint", score, feedback, Date.now() - start, output);
    });
  },
};
