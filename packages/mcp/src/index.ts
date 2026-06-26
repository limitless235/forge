import { startServer } from "./server.js";

startServer().catch((error) => {
  console.error("FORGE MCP server failed:", error);
  process.exit(1);
});
