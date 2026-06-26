import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { existsSync } from "node:fs";
import { minimatch } from "minimatch";
import {
  DEFAULT_FORGE_CONFIG,
  findProjectRoot,
  type ForgeConfig,
} from "@forge/core";

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key];
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        val as Record<string, unknown>
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

export async function loadForgeConfig(
  filePath: string
): Promise<{ config: ForgeConfig; projectRoot: string }> {
  const projectRoot = await findProjectRoot(filePath);
  const configPath = join(projectRoot, ".forge.json");

  let userConfig: Partial<ForgeConfig> = {};
  if (existsSync(configPath)) {
    const raw = await readFile(configPath, "utf8");
    userConfig = JSON.parse(raw) as Partial<ForgeConfig>;
  }

  let config = deepMerge(
    { ...DEFAULT_FORGE_CONFIG },
    userConfig as Partial<typeof DEFAULT_FORGE_CONFIG>
  );

  const overrides = userConfig.overrides ?? {};
  const relativePath = relative(projectRoot, filePath);
  for (const [pattern, delta] of Object.entries(overrides)) {
    if (
      minimatch(filePath, pattern, { dot: true }) ||
      minimatch(relativePath, pattern, { dot: true })
    ) {
      config = deepMerge(config, delta as Partial<ForgeConfig>);
    }
  }

  return { config, projectRoot };
}

export function getDefaultConfigJson(): string {
  return JSON.stringify(
    {
      $schema: "https://forgecode.dev/schema/v1.json",
      ...DEFAULT_FORGE_CONFIG,
    },
    null,
    2
  );
}
