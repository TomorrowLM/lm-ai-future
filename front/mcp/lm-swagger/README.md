
# lm-swagger

这是一个基于 `@modelcontextprotocol/sdk` 的 MCP Server，通过 `stdio` 与宿主（如 IDE/Agent）通信。

## 本地开发

```bash
cd front/mcp/lm-swagger
npm install
npm run dev
```

## 构建与启动

```bash
cd front/mcp/lm-swagger
npm run build
node dist/index.js
```

启动后会输出：

```
LM MCP Server 已通过 stdio 启动...
```

## 工具列表

- `hello_world_mcp`：输入 `{ "name": "xxx" }`，返回一段问候文本

## MCP 客户端配置示例

多数 MCP 客户端会以“启动命令 + 参数”的形式拉起该服务（必须是 stdio 模式）。

```json
{
  "mcpServers": {
    "lm-swagger": {
      "command": "node",
      "args": ["D:/LM/lm-ai-future/front/mcp/lm-swagger/dist/index.js"]
    }
  }
}
```

## 如何通信

- 通信通道：子进程 `stdin/stdout`（stdio）
- 消息格式：JSON-RPC 2.0（每条消息是一个 JSON 对象，由 SDK 负责收发与解析）
- 常见流程：客户端 connect → listTools → callTool → close

## Node 客户端调用示例

先构建：

```bash
cd front/mcp/lm-swagger
npm run build
```

再调用工具（把参数透传给脚本）：

```bash
cd front/mcp/lm-swagger
npm run call:hello -- --name 555
```
