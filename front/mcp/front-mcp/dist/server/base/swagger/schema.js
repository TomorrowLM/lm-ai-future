import { DEFAULT_SWAGGER_SOURCE, SWAGGER_QUERY_DEFAULTS, } from "../../../server/base/swagger/config/index.js";
export const swaggerGetModelInputSchema = {
    type: "object",
    properties: {
        source: {
            type: "string",
            description: "Swagger/OpenAPI 文档 URL、Tag/单接口 doc.html URL 或本地 JSON 文件路径",
            default: DEFAULT_SWAGGER_SOURCE,
        },
        document: {
            type: "object",
            description: "直接传入 Swagger/OpenAPI 文档对象（优先于 source）",
        },
        name: {
            type: "string",
            description: "兼容参数：模型名，未命中模型时按接口关键词查询",
            default: "",
        },
        tag: {
            type: "string",
            description: "精确查询该 Tag 下的接口列表",
        },
        operationId: {
            type: "string",
            description: "精确查询单个接口的 operationId",
        },
        keyword: {
            type: "string",
            description: "不区分大小写过滤 Tag 接口列表或模型目录",
        },
        offset: {
            type: "integer",
            minimum: 0,
            default: SWAGGER_QUERY_DEFAULTS.offset,
            description: "分页起点",
        },
        limit: {
            type: "integer",
            minimum: 1,
            maximum: SWAGGER_QUERY_DEFAULTS.maxLimit,
            default: SWAGGER_QUERY_DEFAULTS.limit,
            description: "分页返回数量上限",
        },
        refresh: {
            type: "boolean",
            default: false,
            description: "跳过内存和磁盘缓存重新加载；成功后仍更新缓存",
        },
        resolveRefs: {
            type: "boolean",
            default: true,
            description: "是否解析 $ref",
        },
        maxDepth: {
            type: "integer",
            minimum: 0,
            default: SWAGGER_QUERY_DEFAULTS.maxDepth,
            description: "解析 $ref 的最大深度",
        },
    },
};
