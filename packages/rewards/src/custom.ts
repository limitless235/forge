import { runInNewContext } from "node:vm";
import type {
  CustomRewardConfig,
  FileContext,
  RewardFunction,
} from "@forge/core";
import { makeScore, withTempFile } from "./base.js";

export function createCustomReward(
  custom: CustomRewardConfig
): RewardFunction {
  return {
    name: custom.name,
    languages: custom.language,
    category: "complexity",

    async isAvailable(): Promise<boolean> {
      return true;
    },

    async score(code: string, ctx: FileContext) {
      const start = Date.now();
      return withTempFile(code, ctx.filePath, async (tempPath) => {
        const command = custom.command.replace(/\{tempFile\}/g, tempPath);
        const result = await execTool(command, ctx.projectRoot);
        const output = `${result.stdout}\n${result.stderr}`.trim();

        let score = 0.5;
        try {
          score = runInNewContext(
            `(() => { const output = ${JSON.stringify(output)}; return (${custom.scoreFromOutput}); })()`,
            {},
            { timeout: 1000 }
          ) as number;
        } catch {
          score = 0.5;
        }

        return makeScore(
          custom.name,
          score,
          `Custom reward: ${custom.name}`,
          Date.now() - start,
          output
        );
      });
    },
  };
}

export function createCustomRewards(
  customs: CustomRewardConfig[]
): RewardFunction[] {
  return customs.map(createCustomReward);
}
