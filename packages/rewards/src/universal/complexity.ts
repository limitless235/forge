import type { FileContext, RewardFunction } from "@forge/core";
import { commandExists, execTool } from "@forge/core";
import { makeScore, withTempFile } from "../base.js";

const MAX_CC = 10;

function complexityScore(maxCc: number): number {
  if (maxCc <= MAX_CC) return 1.0;
  return Math.max(0, 1 - (maxCc - MAX_CC) / 20);
}

function parseLizardOutput(output: string): {
  maxCc: number;
  offenders: string[];
} {
  const offenders: string[] = [];
  let maxCc = 0;
  for (const line of output.split("\n")) {
    const match = line.match(/(\w+)\s+.*?(\d+)\s+\d+\s+(\d+)/);
    if (match) {
      const cc = parseInt(match[3], 10);
      if (cc > maxCc) maxCc = cc;
      if (cc > MAX_CC) offenders.push(`${match[1]}: complexity ${cc} (max ${MAX_CC})`);
    }
  }
  return { maxCc, offenders };
}

function tsComplexity(code: string): { maxCc: number; offenders: string[] } {
  let maxCc = 0;
  const offenders: string[] = [];

  const branchPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]+\s*:/g,
    /&&/g,
    /\|\|/g,
  ];

  const fnRegex =
    /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(\w+)\s*\([^)]*\)\s*\{)/g;
  const functions: { name: string; start: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = fnRegex.exec(code)) !== null) {
    const name = match[1] ?? match[2] ?? match[3] ?? "anonymous";
    functions.push({ name, start: match.index });
  }

  if (functions.length === 0) {
    let cc = 1;
    for (const pat of branchPatterns) {
      const matches = code.match(pat);
      cc += matches?.length ?? 0;
    }
    maxCc = cc;
    if (cc > MAX_CC) offenders.push(`module: complexity ${cc} (max ${MAX_CC})`);
    return { maxCc, offenders };
  }

  for (let i = 0; i < functions.length; i++) {
    const start = functions[i].start;
    const end = functions[i + 1]?.start ?? code.length;
    const body = code.slice(start, end);
    let cc = 1;
    for (const pat of branchPatterns) {
      const matches = body.match(pat);
      cc += matches?.length ?? 0;
    }
    if (cc > maxCc) maxCc = cc;
    if (cc > MAX_CC) {
      offenders.push(`${functions[i].name}(): complexity ${cc} (max ${MAX_CC})`);
    }
  }

  return { maxCc, offenders };
}

function rustComplexity(code: string): { maxCc: number; offenders: string[] } {
  const fnRegex = /fn\s+(\w+)/g;
  const functions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = fnRegex.exec(code)) !== null) {
    functions.push(match[1]);
  }
  const branchCount = (code.match(/\b(if|match|while|for|loop)\b/g) ?? []).length;
  const fnCount = Math.max(functions.length, 1);
  const avgCc = 1 + branchCount / fnCount;
  const maxCc = Math.ceil(avgCc * 2);
  const offenders =
    maxCc > MAX_CC
      ? functions
          .slice(0, 3)
          .map((f) => `${f}(): estimated complexity ${maxCc} (max ${MAX_CC})`)
      : [];
  return { maxCc, offenders };
}

export const complexityScorer: RewardFunction = {
  name: "complexity",
  languages: ["python", "typescript", "javascript", "rust"],
  category: "complexity",

  async isAvailable(): Promise<boolean> {
    return true;
  },

  async score(code: string, ctx: FileContext) {
    const start = Date.now();
    const lang = ctx.language;

    if (lang === "python" && (await commandExists("lizard"))) {
      return withTempFile(code, ctx.filePath, async (tempPath) => {
        const result = await execTool(
          `lizard "${tempPath}" --CCN ${MAX_CC} 2>&1`,
          ctx.projectRoot
        );
        const output = `${result.stdout}\n${result.stderr}`;
        const { maxCc, offenders } = parseLizardOutput(output);
        return makeScore(
          "complexity",
          complexityScore(maxCc),
          offenders.join("; ") || `All functions <= ${MAX_CC} CC`,
          Date.now() - start,
          output
        );
      });
    }

    const { maxCc, offenders } =
      lang === "rust" ? rustComplexity(code) : tsComplexity(code);

    return makeScore(
      "complexity",
      complexityScore(maxCc),
      offenders.join("; ") || `All functions <= ${MAX_CC} CC`,
      Date.now() - start
    );
  },
};
