import { textResponseFromJson } from "../../../utils/text.js";
import { loadDocument, getSchemasRoot, } from "../../../server/base/swagger/analys/index.js";
import { resolveSchemaNode } from "../../../server/base/swagger/utils/schema.js";
import { findOperationByKeyword, extractOperationIO, } from "../../../server/base/swagger/utils/operation.js";
import { swaggerGetModelInputSchema } from "../../../server/base/swagger/schema.js";
import { server } from "../../../index.js";
export const swaggerGetModelTool = {
    name: "get_swagger_mcp",
    description: "读取 Swagger/OpenAPI 文档，列出模型或返回指定模型的数据结构（支持解析 $ref）",
    inputSchema: swaggerGetModelInputSchema,
};
// 处理 Swagger/OpenAPI 模型获取工具调用
export async function handleSwaggerGetModelTool(request) {
    const args = (request.params.arguments ?? {});
    // 如果传入的是 Swagger UI 带 fragment 的具体接口链接，且未显式提供 name，
    // 则从 fragment 的最后一段提取操作标识（解码）并赋值给 args.name，便于定位该接口。
    try {
        const rawSource = request.params.arguments?.source;
        if (!args.name &&
            typeof rawSource === "string" &&
            rawSource.includes("#")) {
            const frag = rawSource.split("#")[1] ?? "";
            const parts = frag.split("/").filter(Boolean);
            const last = parts.length > 0 ? decodeURIComponent(parts[parts.length - 1]) : "";
            if (last) {
                args.name = last;
                // console.error(`[MCP Swagger Debug] extracted name from fragment: ${args.name}`);
            }
        }
    }
    catch (err) {
        void err;
    }
    // 调试信息 - 会在 MCP 服务器终端显示
    // console.error(`[MCP Swagger Debug] request.params.arguments = ${JSON.stringify(request.params.arguments)}`);
    // console.error(`[MCP Swagger Debug] args.source = ${JSON.stringify(args.source)}`);
    // console.error(`[MCP Swagger Debug] final args.source = ${JSON.stringify(args.source)}`);
    const doc = await loadDocument(args); // 加载 Swagger/OpenAPI 文档
    // 发送日志通知到 Inspector
    await server.sendLoggingMessage({
        level: "info",
        logger: "swagger-tool",
        data: {
            message: "Document123 loaded successfully",
            totalModels: doc,
        },
    });
    const schemas = getSchemasRoot(doc); // 提取模型定义根节点
    const names = Object.keys(schemas).sort((a, b) => a.localeCompare(b));
    // 发送日志通知到 Inspector
    await server.sendLoggingMessage({
        level: "info",
        logger: "swagger-tool",
        data: {
            message: "Document loaded successfully",
            totalModels: names.length,
            firstModels: names.slice(0, 3),
        },
    });
    const resolveRefs = args.resolveRefs ?? true;
    const maxDepth = Number.isFinite(args.maxDepth)
        ? Math.max(0, Math.floor(args.maxDepth))
        : 15;
    if (!args.name) {
        return textResponseFromJson({
            _debug: {
                message: "document loaded successfully",
                totalModels: names.length,
                schemas: schemas, // 显示完整的 schemas 对象
            },
            models: names,
        });
    }
    const rawModel = schemas[args.name];
    if (!rawModel) {
        const found = findOperationByKeyword(doc, args.name);
        // console.error(`DEBUG handleSwaggerGetModelTool: found operation = ${JSON.stringify(found)}`);
        if (found) {
            const io = extractOperationIO(doc, found);
            const operationResult = {
                match: "operation",
                keyword: args.name,
                operation: io.operation,
                request: {
                    ...io.request,
                    body: resolveRefs && io.request.body
                        ? resolveSchemaNode({
                            doc,
                            node: io.request.body,
                            depth: maxDepth,
                            seenRefs: new Set(),
                        })
                        : io.request.body,
                },
                response: {
                    ...io.response,
                    body: resolveRefs && io.response.body
                        ? resolveSchemaNode({
                            doc,
                            node: io.response.body,
                            depth: maxDepth,
                            seenRefs: new Set(),
                        })
                        : io.response.body,
                },
            };
            return textResponseFromJson(operationResult);
        }
        return textResponseFromJson({
            error: `未找到模型: ${args.name}`,
            models: names,
        });
    }
    const model = resolveRefs
        ? resolveSchemaNode({
            doc,
            node: rawModel,
            depth: maxDepth,
            seenRefs: new Set(),
        })
        : rawModel;
    return textResponseFromJson({ name: args.name, schema: model });
}
