# Swagger MCP 查询模块

`get_swagger_mcp` 加载 Swagger 2.0 / OpenAPI 3.x 文档，并按单接口、Tag 或模型查询返回有界 JSON。它支持 Knife4j `doc.html` fragment、显式选择器和原有 `name` 调用。

## 目录与职责

```text
src/server/base/swagger/
├── index.ts              # MCP handler：解析、加载、记录有界摘要、查询、响应
├── query.ts              # 无 I/O 的查询优先级、过滤、分页与返回塑形
├── schema.ts             # MCP public input schema
├── types.ts
├── config/               # Swagger 模块运行策略配置
│   ├── defaults.ts       # 默认源、分页与 $ref 深度
│   ├── network.ts        # v2/v3/resources 路径及网络超时
│   ├── cache.ts          # 内存/磁盘 TTL
│   └── index.ts
├── analys/               # 文档加载、fragment、HTML、缓存
└── utils/                # operation 提取与 $ref 解析
```

## 查询优先级

1. 显式 `operationId`
2. 三段 fragment：`#/分组/Tag/operationId`
3. 显式 `tag`
4. Tag fragment；两段 `#/分组/值` 先按 operationId 查找，未命中再按 Tag
5. 兼容 `name`：先查模型，再按接口关键词查找
6. 无选择器：仅返回分页后的模型名称目录

一段 fragment `#/分组` 只用于选择 Swagger 文档分组，不作为接口或 Tag 选择器。

## 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `source` | string | JSON URL、本地 JSON 路径、Tag URL 或单接口 URL；省略时使用默认源 |
| `document` | object | 直接传入 Swagger/OpenAPI 文档，优先于 `source` |
| `operationId` | string | 精确查询单个接口 |
| `tag` | string | 精确查询 Tag 下的接口列表 |
| `name` | string | 兼容参数：模型名，未命中模型时按接口关键词查询 |
| `keyword` | string | 不区分大小写过滤 Tag 接口或模型目录 |
| `offset` | integer | 分页起点，负值会收敛为 0 |
| `limit` | integer | 返回上限，受 `config/defaults.ts` 的最大值约束 |
| `refresh` | boolean | 跳过内存和磁盘缓存读取；加载成功后仍更新缓存 |
| `resolveRefs` | boolean | 是否展开 `$ref`，默认 `true` |
| `maxDepth` | integer | `$ref` 最大解析深度 |

默认源保留为：

```text
https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/
```

## 调用示例

### 默认源的模型目录

```json
{}
```

返回 `match: "models"`、`models` 和 `total/offset/limit/returned`；不会返回完整 schemas 或 `_debug.schemas`。

### 单接口 URL

```json
{
  "source": "https://apit-dsb.dingtax.cn/dsb/api/doc.html#/1.所有接口/一起安-算粒-套餐/deleteByIdUsingGET"
}
```

### Tag URL

```json
{
  "source": "https://apit-dsb.dingtax.cn/dsb/api/doc.html#/1.所有接口/一起安-算粒-套餐"
}
```

### 显式 operationId

```json
{
  "source": "https://apit-dsb.dingtax.cn/dsb/api/doc.html#/1.所有接口",
  "operationId": "deleteByIdUsingGET"
}
```

### 显式 Tag 与分页过滤

```json
{
  "source": "https://apit-dsb.dingtax.cn/dsb/api/doc.html#/1.所有接口",
  "tag": "一起安-算粒-套餐",
  "keyword": "套餐",
  "offset": 0,
  "limit": 20
}
```

### 强制刷新

```json
{
  "source": "https://apit-dsb.dingtax.cn/dsb/api/doc.html#/1.所有接口",
  "refresh": true
}
```

### 兼容模型查询

```json
{
  "source": "https://example.com/v3/api-docs",
  "name": "PackageResponse",
  "resolveRefs": true,
  "maxDepth": 10
}
```

模型命中时结构仍为 `{ "name": "...", "schema": { ... } }`。

## 返回结构

- 单接口：`match: "operationId"`、`operation`（method/path/summary/operationId/tags）、请求参数、请求体和响应体。
- Tag：`match: "tag"`、Tag、分页元数据及稳定按 operationId 排序的 `operations`。
- 模型目录：仅分页模型名称和元数据。
- 未命中：`error.code` 分别为 `OPERATION_NOT_FOUND`、`TAG_NOT_FOUND` 或 `MODEL_NOT_FOUND`，不会附带全量模型。

## 加载与缓存

远程 `doc.html` 按 HTML 配置、分组 v3/v2 文档、`swagger-resources`、候选路径探测的顺序加载。网络路径和超时统一位于 `config/network.ts`。

缓存键剔除 fragment 并保留 group 维度：

```text
${baseUrl}#group=${fragmentGroup}
```

同一会话使用内存缓存，跨会话使用系统临时目录磁盘缓存；TTL 统一位于 `config/cache.ts`。`refresh: true` 只跳过读取，不跳过成功后的写入。

## 手动验证

```bash
pnpm run build
pnpm run call-get-swagger -- --source 'https://example.com/doc.html#/分组/Tag'
pnpm run call-get-swagger -- --operation-id operationId
pnpm run call-get-swagger -- --tag Tag --keyword keyword --offset 0 --limit 20
pnpm run call-get-swagger -- --refresh
```
