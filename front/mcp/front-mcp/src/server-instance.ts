import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export const server = new Server(
  {
    name: "lm-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  },
);
