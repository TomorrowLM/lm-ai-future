import { server } from "../../../server-instance.js";
import { getSchemasRoot, isValidSpec, loadDocument, } from "../../../server/base/swagger/analys/index.js";
import { parseFragment, buildCandidateUrls, tryFetchJson, } from "../../../server/base/swagger/analys/url-parser.js";
import { DEFAULT_SWAGGER_SOURCE, resolveSwaggerSource, SWAGGER_NETWORK_TIMEOUT_MS, } from "../../../server/base/swagger/config/index.js";
import { querySwaggerDocument } from "../../../server/base/swagger/query.js";
import { swaggerGetModelInputSchema } from "../../../server/base/swagger/schema.js";
import { findOperationByKeyword } from "../../../server/base/swagger/utils/index.js";
import { textResponseFromJson } from "../../../utils/text.js";
export const swaggerGetModelTool = {
    name: "get_swagger_mcp",
    description: "查询 Swagger/OpenAPI：支持完整单接口 URL、Tag URL、显式 operationId/tag、兼容 name 模型查询，以及分页模型目录；请求体和响应体可解析 $ref。",
    inputSchema: swaggerGetModelInputSchema,
};
/**
 * 跨所有 Knife4j 分组搜索 API 路径
 * 通过 swagger-resources 发现所有分组，逐个加载文档并用关键词匹配
 * @returns 匹配到的文档和 operationId，未找到返回 undefined
 */
async function searchAcrossGroups(apiPath, swaggerSource) {
    const candidateInfo = buildCandidateUrls(swaggerSource);
    if (!candidateInfo)
        return undefined;
    const { baseUrl } = candidateInfo;
    const swaggerResourcesUrl = new URL(`${baseUrl.pathname}swagger-resources`, baseUrl.origin).toString();
    let resources;
    try {
        resources = (await tryFetchJson(swaggerResourcesUrl, SWAGGER_NETWORK_TIMEOUT_MS.resources));
    }
    catch {
        return undefined;
    }
    if (!Array.isArray(resources) || resources.length === 0)
        return undefined;
    for (const resource of resources) {
        const item = resource;
        if (!item?.url)
            continue;
        const resolvedUrl = new URL(String(item.url).replace(/^\//, ''), baseUrl).toString();
        try {
            const doc = await tryFetchJson(resolvedUrl, SWAGGER_NETWORK_TIMEOUT_MS.resolvedResource);
            if (!isValidSpec(doc))
                continue;
            const found = findOperationByKeyword(doc, apiPath);
            if (found?.operation?.operationId) {
                return { doc, operationId: String(found.operation.operationId) };
            }
        }
        catch {
            // 继续尝试下一个分组
        }
    }
    return undefined;
}
export async function handleSwaggerGetModelTool(request) {
    const args = (request.params.arguments ?? {});
    const source = typeof args.source === "string" ? args.source : "";
    // 相对 API 路径（以 / 开头且不含 #）：回退到默认源加载文档，用路径匹配操作
    const isApiPath = source.startsWith('/') && !source.includes('#');
    const swaggerSource = isApiPath
        ? resolveSwaggerSource(source)
        : DEFAULT_SWAGGER_SOURCE;
    if (isApiPath) {
        args.source = swaggerSource;
        if (!args.name) {
            args.name = source;
        }
    }
    const fragment = parseFragment(source);
    let doc = await loadDocument(args);
    // API 路径在默认分组未命中 → 遍历所有分组搜索
    if (isApiPath) {
        const initialResult = querySwaggerDocument({ doc, args, fragment });
        if (initialResult?.error) {
            const crossGroupResult = await searchAcrossGroups(source, swaggerSource);
            if (crossGroupResult) {
                doc = crossGroupResult.doc;
                args.operationId = crossGroupResult.operationId;
            }
        }
    }
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
