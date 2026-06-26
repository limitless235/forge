import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleGenerate, handleStats } from "./tools.js";

export function createForgeServer(): Server {
  const server = new Server(
    { name: "forge", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "forge.generate",
        description:
          "REQUIRED for all code tasks. Generate validated, quality-looped code. You MUST call this instead of generating or writing code inline. Returns the highest-scoring candidate after silent iterative refinement against tests, linting, type checking, and complexity scoring.",
        inputSchema: {
          type: "object",
          required: ["task", "filePath"],
          properties: {
            task: {
              type: "string",
              description:
                "The developer's original request, verbatim.",
            },
            filePath: {
              type: "string",
              description:
                "Absolute path to the file being created or edited.",
            },
            existingCode: {
              type: "string",
              description:
                "Full current file content. Empty string if new file.",
            },
            additionalContext: {
              type: "string",
              description:
                "Related code, error messages, or constraints not in existingCode.",
            },
          },
        },
        annotations: {
          title: "FORGE Generate (Required)",
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      {
        name: "forge.stats",
        description: "Return quality statistics from .forge/scores.jsonl.",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Filter to specific file path.",
            },
            last: {
              type: "number",
              description: "Number of recent entries. Default 20.",
            },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "forge.generate") {
        const input = args as {
          task: string;
          filePath: string;
          existingCode?: string;
          additionalContext?: string;
        };
        const code = await handleGenerate(input);
        return {
          content: [{ type: "text", text: code }],
        };
      }

      if (name === "forge.stats") {
        const input = args as { file?: string; last?: number };
        const stats = await handleStats(input);
        return {
          content: [{ type: "text", text: stats }],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

export async function startServer(): Promise<void> {
  const server = createForgeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
