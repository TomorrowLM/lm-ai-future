export const helloWorldTool = {
    name: "hello_world_mcp",
    description: "一个简单的测试工具，返回打招呼的信息",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "对方的名字",
            },
        },
        required: ["name"],
    },
};
export async function handleHelloWorldTool(request) {
    const args = request.params.arguments;
    const name = args?.name || "World";
    console.info(`Hello, ${name}! This is the MCP server speaking.`);
    return {
        content: [
            {
                type: "text",
                text: `Hello, ${name}! This is the MCP server speaking.`,
            },
        ],
    };
}
