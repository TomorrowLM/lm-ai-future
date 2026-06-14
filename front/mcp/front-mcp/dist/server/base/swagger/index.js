import { textResponseFromJson } from "../../../utils/text.js";
import { loadDocument, getSchemasRoot, } from "../../../server/base/swagger/analys/index.js";
import { resolveSchemaNode } from "../../../server/base/swagger/utils/schema.js";
import { findOperationByKeyword, findOperationsByTag, findOperationById, extractOperationIO, } from "../../../server/base/swagger/utils/operation.js";
import { parseFragment } from "../../../server/base/swagger/analys/url-parser.js";
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
    // 从 fragment 中解析分组/标签/操作ID
    let fragmentTag;
    let fragmentOperationId;
    try {
        const rawSource = request.params.arguments?.source;
        if (typeof rawSource === "string" && rawSource.includes("#")) {
            const parsed = parseFragment(rawSource);
            fragmentTag = parsed.fragmentTag;
            fragmentOperationId = parsed.fragmentOperation;
            // 向下兼容：如果未显式提供 name，取 fragment 最后一段作为 name
            if (!args.name && fragmentOperationId) {
                args.name = fragmentOperationId;
            }
        }
    }
    catch (err) {
        void err;
    }
    const doc = await loadDocument(args); // 加载 Swagger/OpenAPI 文档
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
    // 辅助函数：解析 $ref
    const resolveBody = (body) => resolveRefs && body
        ? resolveSchemaNode({ doc, node: body, depth: maxDepth, seenRefs: new Set() })
        : body;
    // 场景1: 有 operationId 且无 tag → 先尝试精确匹配 operationId，
    // 找不到则回退为 tag 匹配（因为两段 URL 的第二段可能是 tag 也可能是 operationId）
    if (fragmentOperationId && !fragmentTag) {
        const found = findOperationById(doc, fragmentOperationId);
        if (found) {
            const io = extractOperationIO(doc, found);
            return textResponseFromJson({
                match: "operationId",
                keyword: fragmentOperationId,
                operation: io.operation,
                request: { ...io.request, body: resolveBody(io.request.body) },
                response: { ...io.response, body: resolveBody(io.response.body) },
            });
        }
        // 回退：尝试当作 tag 匹配
        const tagOps = findOperationsByTag(doc, fragmentOperationId);
        if (tagOps.length > 0) {
            const list = tagOps.map((op) => {
                const io = extractOperationIO(doc, op);
                return {
                    path: io.operation.path,
                    method: io.operation.method,
                    summary: io.operation.summary,
                    operationId: io.operation.operationId,
                    request: { ...io.request, body: resolveBody(io.request.body) },
                    response: { ...io.response, body: resolveBody(io.response.body) },
                };
            });
            return textResponseFromJson({
                match: "tag",
                tag: fragmentOperationId,
                total: tagOps.length,
                operations: list,
            });
        }
    }
    // 场景2: 有 tag（可能同时有 operationId）
    if (fragmentTag) {
        // 2a: 有 operationId → 精确查找单个接口
        if (fragmentOperationId) {
            const found = findOperationById(doc, fragmentOperationId);
            if (found) {
                const io = extractOperationIO(doc, found);
                return textResponseFromJson({
                    match: "operationId",
                    keyword: fragmentOperationId,
                    tag: fragmentTag,
                    operation: io.operation,
                    request: { ...io.request, body: resolveBody(io.request.body) },
                    response: { ...io.response, body: resolveBody(io.response.body) },
                });
            }
        }
        // 2b: 仅有 tag → 返回该 tag 下的所有接口列表
        const operations = findOperationsByTag(doc, fragmentTag);
        if (operations.length > 0) {
            const list = operations.map((op) => {
                const io = extractOperationIO(doc, op);
                return {
                    path: io.operation.path,
                    method: io.operation.method,
                    summary: io.operation.summary,
                    operationId: io.operation.operationId,
                    request: { ...io.request, body: resolveBody(io.request.body) },
                    response: { ...io.response, body: resolveBody(io.response.body) },
                };
            });
            return textResponseFromJson({
                match: "tag",
                tag: fragmentTag,
                total: operations.length,
                operations: list,
            });
        }
    }
    // 场景3: 原有逻辑 - 按 name 查找模型或操作
    if (!args.name) {
        return textResponseFromJson({
            _debug: {
                message: "document loaded successfully",
                totalModels: names.length,
                schemas: schemas,
            },
            models: names,
        });
    }
    const rawModel = schemas[args.name];
    if (!rawModel) {
        const found = findOperationByKeyword(doc, args.name);
        if (found) {
            const io = extractOperationIO(doc, found);
            return textResponseFromJson({
                match: "operation",
                keyword: args.name,
                operation: io.operation,
                request: { ...io.request, body: resolveBody(io.request.body) },
                response: { ...io.response, body: resolveBody(io.response.body) },
            });
        }
        return textResponseFromJson({
            error: `未找到模型: ${args.name}`,
            models: names,
        });
    }
    const model = resolveRefs
        ? resolveSchemaNode({ doc, node: rawModel, depth: maxDepth, seenRefs: new Set() })
        : rawModel;
    return textResponseFromJson({ name: args.name, schema: model });
}
