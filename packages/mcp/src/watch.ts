import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { minimatch } from "minimatch";
import {
  detectLanguage,
  findProjectRoot,
  findTestFile,
  forgeLoop,
  parseImports,
  type ForgeConfig,
  type WatchConfig,
} from "@forge/core";
import { getScorersForLanguage } from "@forge/rewards";
import { loadForgeConfig } from "./config.js";

export function resolveWatchConfig(config: ForgeConfig): WatchConfig {
  return {
    enabled: config.watch?.enabled ?? false,
    mode: config.watch?.mode ?? "refine",
    debounceMs: config.watch?.debounceMs ?? 2000,
    include: config.watch?.include ?? ["**/*"],
    exclude: config.watch?.exclude ?? [
      "node_modules/**",
      "dist/**",
      ".forge/**",
    ],
  };
}

export function shouldWatchFile(
  filePath: string,
  projectRoot: string,
  watch: WatchConfig
): boolean {
  const rel = relative(projectRoot, filePath).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..")) return false;

  const excluded = watch.exclude.some((pattern) =>
    minimatch(rel, pattern, { dot: true })
  );
  if (excluded) return false;

  return watch.include.some((pattern) =>
    minimatch(rel, pattern, { dot: true })
  );
}

export async function processWatchedFile(
  filePath: string,
  watch: WatchConfig
): Promise<{ action: "refined" | "scored" | "skipped"; score?: number }> {
  const absPath = resolve(filePath);
  const { config, projectRoot } = await loadForgeConfig(absPath);

  if (!shouldWatchFile(absPath, projectRoot, watch)) {
    return { action: "skipped" };
  }

  let existingCode: string;
  try {
    existingCode = await readFile(absPath, "utf8");
  } catch {
    return { action: "skipped" };
  }

  if (!existingCode.trim()) {
    return { action: "skipped" };
  }

  const language = detectLanguage(absPath, existingCode);
  const task =
    "Refine this code to improve quality, tests, types, and lint compliance while preserving existing behavior.";

  const context = {
    filePath: absPath,
    language,
    existingCode,
    imports: parseImports(existingCode, language),
    testFilePath: await findTestFile(absPath, projectRoot),
    projectRoot,
  };

  const scorers = getScorersForLanguage(language, config, task);
  const result = await forgeLoop.run(
    {
      task,
      context,
      language,
      config,
    },
    scorers
  );

  if (watch.mode === "score-only") {
    return { action: "scored", score: result.best.compositeScore };
  }

  if (
    result.best.code !== existingCode &&
    result.best.compositeScore >= config.scoreThreshold
  ) {
    await writeFile(absPath, result.best.code, "utf8");
    return { action: "refined", score: result.best.compositeScore };
  }

  return { action: "scored", score: result.best.compositeScore };
}

export class Debouncer {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  schedule(key: string, delayMs: number, fn: () => void): void {
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, delayMs);

    this.timers.set(key, timer);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
