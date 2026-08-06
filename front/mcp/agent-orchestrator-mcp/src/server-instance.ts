import { Server } from '@modelcontextprotocol/sdk/server/index.js'

export const server = new Server(
  {
    name: 'agent-orchestrator-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  },
)
