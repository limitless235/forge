import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { getDefaultConfigJson } from "./config.js";
import { startServer } from "./server.js";

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

async function installCursor(): Promise<void> {
  const cursorDir = join(process.cwd(), ".cursor");
  const mcpPath = join(cursorDir, "mcp.json");
  await mkdir(cursorDir, { recursive: true });

  const entry = {
    mcpServers: {
      forge: {
        command: "forge-mcp",
        args: [],
        env: {},
      },
    },
  };

  if (existsSync(mcpPath)) {
    const existing = JSON.parse(await readFile(mcpPath, "utf8")) as {
      mcpServers?: Record<string, unknown>;
    };
    existing.mcpServers = { ...existing.mcpServers, ...entry.mcpServers };
    await writeFile(mcpPath, JSON.stringify(existing, null, 2), "utf8");
  } else {
    await writeFile(mcpPath, JSON.stringify(entry, null, 2), "utf8");
  }

  console.log("Registered FORGE in .cursor/mcp.json");
}

async function installClaudeCode(): Promise<void> {
  const configPath = join(homedir(), ".claude", "claude_desktop_config.json");
  const configDir = dirname(configPath);
  await mkdir(configDir, { recursive: true });

  let config: { mcpServers?: Record<string, unknown> } = {};
  if (existsSync(configPath)) {
    config = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers?: Record<string, unknown>;
    };
  }

  config.mcpServers = {
    ...config.mcpServers,
    forge: { command: "forge-mcp", args: [], env: {} },
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
  forge install --cursor      Register MCP server in .cursor/mcp.json
  forge install --claude-code Register MCP server in Claude Code config
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
