import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FileContext, RewardFunction } from "@forge/core";
import { execTool } from "@forge/core";
import { makeScore, withTempFile } from "../base.js";

function hasTypeScript(projectRoot: string): boolean {
  try {
    const pkg = JSON.parse(
      readFileSync(join(projectRoot, "package.json"), "utf8")
    ) as { devDependencies?: Record<string, string> };
    return Boolean(pkg.devDependencies?.typescript);
  } catch {
    return existsSync(join(projectRoot, "tsconfig.json"));
  }
}

export const tscScorer: RewardFunction = {
  name: "tsc",
  languages: ["typescript"],
  category: "types",

  async isAvailable(ctx: FileContext): Promise<boolean> {
    return hasTypeScript(ctx.projectRoot);
  },

  async score(code: string, ctx: FileContext) {
    const start = Date.now();
    return withTempFile(code, ctx.filePath, async (tempPath) => {
      const tsconfig = existsSync(join(ctx.projectRoot, "tsconfig.json"))
        ? `-p "${join(ctx.projectRoot, "tsconfig.json")}"`
        : "";
      const result = await execTool(
        `npx tsc --noEmit --skipLibCheck ${tsconfig} "${tempPath}" 2>&1`,
        ctx.projectRoot
      );
      const output = `${result.stdout}\n${result.stderr}`;
      const errorLines = output
        .split("\n")
        .filter((l) => l.includes("error TS"));

      const score = errorLines.length === 0 ? 1.0 : 0.0;
      const feedback =
        errorLines.slice(0, 5).join("; ") || "No type errors";

      return makeScore("tsc", score, feedback, Date.now() - start, output);
    });
  },
};
