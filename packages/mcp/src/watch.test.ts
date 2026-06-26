import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  shouldWatchFile,
  Debouncer,
  resolveWatchConfig,
} from "./watch.js";
import { DEFAULT_FORGE_CONFIG } from "@forge/core";

describe("resolveWatchConfig", () => {
  it("merges defaults", () => {
    const watch = resolveWatchConfig(DEFAULT_FORGE_CONFIG);
    expect(watch.debounceMs).toBe(2000);
    expect(watch.mode).toBe("refine");
    expect(watch.exclude).toContain("node_modules/**");
  });
});

describe("shouldWatchFile", () => {
  const watch = resolveWatchConfig({
    ...DEFAULT_FORGE_CONFIG,
    watch: {
      include: ["src/**"],
      exclude: ["node_modules/**"],
    },
  });

  it("includes matching source files", () => {
    expect(
      shouldWatchFile("/proj/src/app.ts", "/proj", watch)
    ).toBe(true);
  });

  it("excludes node_modules", () => {
    expect(
      shouldWatchFile(
        "/proj/node_modules/pkg/index.js",
        "/proj",
        watch
      )
    ).toBe(false);
  });

  it("excludes files outside include globs", () => {
    expect(
      shouldWatchFile("/proj/docs/readme.md", "/proj", watch)
    ).toBe(false);
  });
});

describe("Debouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces rapid calls", () => {
    const debouncer = new Debouncer();
    const fn = vi.fn();

    debouncer.schedule("a", 1000, fn);
    debouncer.schedule("a", 1000, fn);
    debouncer.schedule("a", 1000, fn);

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clears pending timers", () => {
    const debouncer = new Debouncer();
    const fn = vi.fn();
    debouncer.schedule("a", 1000, fn);
    debouncer.clear();
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
  });
});
