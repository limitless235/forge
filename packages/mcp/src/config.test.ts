import { describe, it, expect } from "vitest";
import { loadForgeConfig } from "./config.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadForgeConfig", () => {
  it("applies defaults when no config exists", async () => {
    const dir = join(tmpdir(), `forge-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, "src", "app.ts");
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(filePath, "", "utf8");

    const { config } = await loadForgeConfig(filePath);
    expect(config.maxIterations).toBe(4);
    expect(config.scoreThreshold).toBe(0.82);

    await rm(dir, { recursive: true, force: true });
  });

  it("applies glob overrides", async () => {
    const dir = join(tmpdir(), `forge-test-${Date.now()}-override`);
    await mkdir(join(dir, "src", "legacy"), { recursive: true });
    const filePath = join(dir, "src", "legacy", "old.ts");
    await writeFile(filePath, "", "utf8");
    await writeFile(
      join(dir, ".forge.json"),
      JSON.stringify({
        scoreThreshold: 0.82,
        overrides: {
          "src/legacy/**": { scoreThreshold: 0.65 },
        },
      }),
      "utf8"
    );

    const { config } = await loadForgeConfig(filePath);
    expect(config.scoreThreshold).toBe(0.65);

    await rm(dir, { recursive: true, force: true });
  });
});
