import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export function textResponse(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  }
}

export function errorResponse(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error)
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}
