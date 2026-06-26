import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import type { RewardScore } from "./types.js";

const execAsync = promisify(exec);

export async function findProjectRoot(startPath: string): Promise<string> {
  let dir = dirname(startPath);
  const fileName = basename(startPath);
  if (existsSync(startPath) && !fileName.includes(".")) {
    dir = startPath;
  }

  let current = dir;
  while (current !== dirname(current)) {
    if (
      existsSync(join(current, ".forge.json")) ||
      existsSync(join(current, ".git"))
    ) {
      return current;
    }
    current = dirname(current);
  }
  return dir;
}

export async function findTestFile(
  filePath: string,
  projectRoot: string
): Promise<string | undefined> {
  const base = basename(filePath);
  const dir = dirname(filePath);
  const ext = base.includes(".") ? base.slice(base.lastIndexOf(".")) : "";
  const name = base.slice(0, base.length - ext.length);

  const candidates = [
    join(dir, `${name}.test${ext}`),
    join(dir, `${name}.spec${ext}`),
    join(dir, "__tests__", `${name}${ext}`),
    join(dir, "tests", `${name}${ext}`),
    join(projectRoot, "tests", `${base}`),
    join(projectRoot, `test_${base}`),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

export function parseImports(code: string, language: string): string[] {
  const imports: string[] = [];
  const lines = code.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (language === "python") {
      if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
        imports.push(trimmed);
      }
    } else if (language === "rust") {
      if (trimmed.startsWith("use ") || trimmed.startsWith("extern crate")) {
        imports.push(trimmed);
      }
    } else {
      if (
        trimmed.startsWith("import ") ||
        trimmed.startsWith("export ") ||
        trimmed.includes("require(")
      ) {
        imports.push(trimmed);
      }
    }
  }

  return imports;
}

export async function writeTempFile(
  code: string,
  filePath: string
): Promise<string> {
  const ext = filePath.includes(".")
    ? filePath.slice(filePath.lastIndexOf("."))
    : ".txt";
  const tempDir = join(
    process.env.TMPDIR ?? "/tmp",
    "forge",
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await mkdir(tempDir, { recursive: true });
  const tempPath = join(tempDir, `candidate${ext}`);
  await writeFile(tempPath, code, "utf8");
  return tempPath;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execTool(
  command: string,
  cwd: string,
  timeoutMs = 60_000
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? String(error),
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}

export function commandExists(command: string): Promise<boolean> {
  return execTool(`command -v ${command} 2>/dev/null`, process.cwd(), 5000).then(
    (r) => r.exitCode === 0
  );
}

export function weightedAverage(scores: RewardScore[]): number {
  const active = scores.filter((s) => !s.skipped && s.weight > 0);
  if (active.length === 0) return 0;
  const totalWeight = active.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  return active.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;
}

export function taskHash(task: string): string {
  return createHash("sha256").update(task).digest("hex").slice(0, 6);
}
