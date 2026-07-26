import { server } from "../../../server-instance.js";
import { getSchemasRoot, loadDocument, } from "../../../server/base/swagger/analys/index.js";
import { parseFragment } from "../../../server/base/swagger/analys/url-parser.js";
import { querySwaggerDocument } from "../../../server/base/swagger/query.js";
import { swaggerGetModelInputSchema } from "../../../server/base/swagger/schema.js";
import { textResponseFromJson } from "../../../utils/text.js";
export const swaggerGetModelTool = {
    name: "get_swagger_mcp",
    description: "查询 Swagger/OpenAPI：支持完整单接口 URL、Tag URL、显式 operationId/tag、兼容 name 模型查询，以及分页模型目录；请求体和响应体可解析 $ref。",
    inputSchema: swaggerGetModelInputSchema,
};
export async function handleSwaggerGetModelTool(request) {
    const args = (request.params.arguments ?? {});
    const source = typeof args.source === "string" ? args.source : "";
    const fragment = parseFragment(source);
    const doc = await loadDocument(args);
    const modelNames = Object.keys(getSchemasRoot(doc)).sort((left, right) => left.localeCompare(right));
    await server.sendLoggingMessage({
        level: "info",
        logger: "swagger-tool",
        data: {
            message: "Document loaded successfully",
            totalModels: modelNames.length,
            firstModels: modelNames.slice(0, 3),
            fragment: {
                group: fragment.fragmentGroup,
                tag: fragment.fragmentTag,
                operationId: fragment.fragmentOperation,
            },
        },
    });
    return textResponseFromJson(querySwaggerDocument({ doc, args, fragment }));
}
