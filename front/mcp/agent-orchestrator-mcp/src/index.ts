#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { dispatchTool, tools } from './server/index.js'
import { server } from './server-instance.js'

export { server } from './server-instance.js'

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await dispatchTool(request)
  if (result) return result
  throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${request.params.name}`)
})

server.onerror = (error) => {
  console.error('[agent-orchestrator-mcp]', error)
}

process.on('SIGINT', async () => {
  await server.close()
  process.exit(0)
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  await server.sendLoggingMessage({
    level: 'info',
    logger: 'agent-orchestrator-mcp',
    data: 'Agent Orchestrator MCP 已通过 stdio 启动',
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
