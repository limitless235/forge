import { watch } from "node:fs";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { findProjectRoot } from "@forge/core";
import { loadForgeConfig } from "./config.js";
import {
  Debouncer,
  processWatchedFile,
  resolveWatchConfig,
  shouldWatchFile,
} from "./watch.js";

export async function startWatch(projectDir?: string): Promise<void> {
  const cwd = projectDir ?? process.cwd();
  const projectRoot = await findProjectRoot(cwd);
  const { config } = await loadForgeConfig(join(projectRoot, ".forge.json"));
  const watchConfig = resolveWatchConfig(config);

  console.log(`FORGE watch: monitoring ${projectRoot}`);
  console.log(
    `  mode=${watchConfig.mode} debounce=${watchConfig.debounceMs}ms`
  );

  const debouncer = new Debouncer();

  const handleFile = (filePath: string) => {
    const absPath = resolve(filePath);
    if (!existsSync(absPath)) return;
    if (!shouldWatchFile(absPath, projectRoot, watchConfig)) return;

    debouncer.schedule(absPath, watchConfig.debounceMs, () => {
      void processWatchedFile(absPath, watchConfig)
        .then((result) => {
          if (result.action === "skipped") return;
          const score =
            result.score !== undefined
              ? ` (score ${result.score.toFixed(2)})`
              : "";
          console.log(`[forge watch] ${result.action}: ${absPath}${score}`);
        })
        .catch((error) => {
          console.error(
            `[forge watch] error on ${absPath}:`,
            error instanceof Error ? error.message : error
          );
        });
    });
  };

  try {
    const watcher = watch(
      projectRoot,
      { recursive: true },
      (_event, filename) => {
        if (!filename) return;
        handleFile(join(projectRoot, filename.toString()));
      }
    );

    process.on("SIGINT", () => {
      console.log("\nFORGE watch: stopped");
      debouncer.clear();
      watcher.close();
      process.exit(0);
    });

    console.log("FORGE watch: running (Ctrl+C to stop)");
  } catch (error) {
    console.error(
      "Recursive watch not supported on this platform. Use forge watch with Linux/macOS or Node 20+."
    );
    throw error;
  }
}
