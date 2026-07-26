#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { tools, dispatchTool } from "./server/index.js";
import { server } from "./server-instance.js";
export { server } from "./server-instance.js";
// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools,
    };
});
// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await dispatchTool(request);
    if (result)
        return result;
    throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${request.params.name}`);
});
// 错误处理边界
server.onerror = (error) => {
    console.error('[MCP Error]', error);
};
process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
});
// 通过 stdio 启动服务并监听
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // 发送启动通知到 Inspector
    await server.sendLoggingMessage({
        level: "info",
        logger: "lm-mcp-server",
        data: "LM MCP Server v2.0 已通过 stdio 启动",
    });
}
main().catch(console.error);
