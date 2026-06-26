import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FileContext, RewardFunction } from "@forge/core";
import { execTool } from "@forge/core";
import { makeScore } from "../base.js";

export const clippyScorer: RewardFunction = {
  name: "clippy",
  languages: ["rust"],
  category: "linter",

  async isAvailable(ctx: FileContext): Promise<boolean> {
    return existsSync(join(ctx.projectRoot, "Cargo.toml"));
  },

  async score(_code: string, ctx: FileContext) {
    const start = Date.now();
    const result = await execTool(
      "cargo clippy -- -D warnings 2>&1",
      ctx.projectRoot
    );
    const output = `${result.stdout}\n${result.stderr}`;
    const issues = output
      .split("\n")
      .filter((l) => l.includes("warning:") || l.includes("error:"));

    const score = issues.length === 0 ? 1.0 : 0.0;
    const feedback = issues.slice(0, 5).join("; ") || "No clippy issues";

    return makeScore("clippy", score, feedback, Date.now() - start, output);
  },
};
