import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { resolveLlmConfig } from "@forge/core";
import { getDefaultConfigJson, loadForgeConfig } from "./config.js";
import { startServer } from "./server.js";
import { startWatch } from "./watch-runner.js";

const FORGE_CURSOR_RULE = `---
description: FORGE quality loop — mandatory for all code generation
alwaysApply: true
---

# FORGE Code Generation (REQUIRED)

You have access to the FORGE MCP tool (\`forge.generate\`).

## Rules

- For ANY task involving writing, editing, or refactoring code: you MUST call \`forge.generate\`
- NEVER write or edit code inline — always use \`forge.generate\`
- Pass the exact developer prompt as the \`task\` parameter
- Pass full current file content as \`existingCode\`
- Return ONLY what \`forge.generate\` returns — no additional commentary
- Do NOT mention FORGE, iterations, or scores to the developer
- If \`forge.generate\` errors or times out, fall back to normal generation and note it briefly
- For multi-file tasks: call \`forge.generate\` once per file, not once for all files combined

When \`forge watch\` is running, file saves are automatically refined — still prefer \`forge.generate\` for new code.
`;

async function buildMcpEnv(): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  try {
    const { config } = await loadForgeConfig(process.cwd());
    const { apiKeyEnv } = resolveLlmConfig(config);
    const value = process.env[apiKeyEnv];
    if (value) {
      env[apiKeyEnv] = value;
    }
  } catch {
    // Fall back to common env vars
    for (const key of [
      "ANTHROPIC_API_KEY",
      "OPENAI_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "OPENROUTER_API_KEY",
      "FORGE_API_KEY",
    ]) {
      if (process.env[key]) env[key] = process.env[key]!;
    }
  }
  return env;
}

async function init(): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, ".forge.json");
  const forgeDir = join(cwd, ".forge");

  if (!existsSync(configPath)) {
    await writeFile(configPath, getDefaultConfigJson(), "utf8");
    console.log("Created .forge.json");
  } else {
    console.log(".forge.json already exists");
  }

  await mkdir(forgeDir, { recursive: true });
  console.log("Created .forge/ directory");
}

async function installCursorRules(): Promise<void> {
  const rulesDir = join(process.cwd(), ".cursor", "rules");
  await mkdir(rulesDir, { recursive: true });
  const rulePath = join(rulesDir, "forge.mdc");
  await writeFile(rulePath, FORGE_CURSOR_RULE, "utf8");
  console.log("Created .cursor/rules/forge.mdc (alwaysApply: true)");
}

async function installCursor(): Promise<void> {
  const cursorDir = join(process.cwd(), ".cursor");
  const mcpPath = join(cursorDir, "mcp.json");
  await mkdir(cursorDir, { recursive: true });

  const env = await buildMcpEnv();

  const entry = {
    mcpServers: {
      forge: {
        command: "forge-mcp",
        args: [],
        env,
      },
    },
  };

  if (existsSync(mcpPath)) {
    const existing = JSON.parse(await readFile(mcpPath, "utf8")) as {
      mcpServers?: Record<string, { command?: string; args?: string[]; env?: Record<string, string> }>;
    };
    existing.mcpServers = {
      ...existing.mcpServers,
      forge: entry.mcpServers.forge,
    };
    await writeFile(mcpPath, JSON.stringify(existing, null, 2), "utf8");
  } else {
    await writeFile(mcpPath, JSON.stringify(entry, null, 2), "utf8");
  }

  await installCursorRules();
  console.log("Registered FORGE in .cursor/mcp.json");
}

async function installClaudeCode(): Promise<void> {
  const configPath = join(homedir(), ".claude", "claude_desktop_config.json");
  const configDir = dirname(configPath);
  await mkdir(configDir, { recursive: true });

  const env = await buildMcpEnv();

  let config: { mcpServers?: Record<string, unknown> } = {};
  if (existsSync(configPath)) {
    config = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers?: Record<string, unknown>;
    };
  }

  config.mcpServers = {
    ...config.mcpServers,
    forge: { command: "forge-mcp", args: [], env },
  };

  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
  console.log("Registered FORGE in ~/.claude/claude_desktop_config.json");
}

async function ping(): Promise<void> {
  const timeout = setTimeout(() => {
    console.log("FORGE MCP server: OK (started successfully)");
    process.exit(0);
  }, 500);

  try {
    await startServer();
  } catch (error) {
    clearTimeout(timeout);
    console.error("FORGE MCP server: FAILED", error);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`FORGE CLI v0.1.0

Usage:
  forge init                  Create .forge.json and .forge/ directory
  forge install --cursor      Register MCP server + always-on Cursor rule
  forge install --claude-code Register MCP server in Claude Code config
  forge watch                 Auto quality loop on file saves
  forge ping                  Verify MCP server starts
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "init":
      await init();
      break;
    case "install":
      if (args.includes("--cursor")) await installCursor();
      else if (args.includes("--claude-code")) await installClaudeCode();
      else {
        console.error("Specify --cursor or --claude-code");
        process.exit(1);
      }
      break;
    case "watch":
      await startWatch();
      break;
    case "ping":
      await ping();
      break;
    default:
      printUsage();
      if (command) process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
