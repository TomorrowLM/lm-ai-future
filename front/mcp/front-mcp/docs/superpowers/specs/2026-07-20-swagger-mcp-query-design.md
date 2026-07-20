# Swagger MCP 查询能力优化设计

## 背景

`get_swagger_mcp` 已能从 Swagger/Knife4j 文档地址加载规范，并根据 URL fragment 查询模型或接口。但当前工具参数仍以“模型查询”为中心，无参数调用会返回全部 Schema 内容，Tag 与 operationId 的输入方式不够明确，网络、缓存和默认地址等策略值也散落在实现文件中。

本次优化保持现有调用兼容，同时让调用方既可以传入单独接口地址获得接口详情，也可以传入 Tag 获得该 Tag 下的接口列表。

## 目标

1. 保留现有 `get_swagger_mcp` 工具名称和已有参数。
2. 支持完整接口 URL 和显式 `operationId` 精确查询单个接口。
3. 支持 Tag URL 和显式 `tag` 查询 Tag 下的接口。
4. 保留默认文档地址 `https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/`。
5. 将 Swagger 模块的可配置硬编码集中到 `config/` 目录。
6. 限制目录和模型列表输出，避免返回完整 Schema 集合造成超大上下文。
7. 增加结构化错误和自动化回归测试。

## 非目标

- 不修改业务项目 `src/services/ai-credit/index.ts`。
- 不拆分或重命名 MCP 工具。
- 不改变 Swagger/OpenAPI 文档的远程认证方式。
- 不在本次工作中生成业务接口代码。

## 输入设计

在原参数基础上增加：

- `tag?: string`：显式指定接口 Tag。
- `operationId?: string`：显式指定单个接口。
- `keyword?: string`：对目录结果进行不区分大小写的关键词过滤。
- `offset?: number`：分页起点，默认 0。
- `limit?: number`：返回数量上限，采用配置中的默认值和最大值。
- `refresh?: boolean`：跳过缓存重新拉取文档。

`source` 仍可传完整文档地址、Tag 地址或单接口地址；未传时使用配置中的默认文档地址。

## 查询优先级

1. 显式 `operationId`。
2. 三段 fragment 中的 operationId：`#/分组/Tag/operationId`。
3. 显式 `tag`。
4. fragment 中的 Tag：`#/分组/Tag`。
5. 原有 `name`：先查模型，再按接口关键词兼容查询。
6. 未提供查询条件：返回分页后的模型名称目录，不返回完整 Schema 对象。

为兼容已有两段 fragment 行为，`#/分组/值` 会先尝试将最后一段作为 operationId 精确查询；未命中时再作为 Tag 查询。新调用推荐使用显式 `tag` 或 `operationId` 消除歧义。

## 返回设计

### 单接口

返回 `match: "operationId"`、查询条件、接口基本信息、请求参数、请求体和响应体。

### Tag

返回 `match: "tag"`、Tag、过滤和分页元数据，以及接口数组。Tag 列表中的每个接口保留 path、method、summary、operationId、request 和 response，兼容当前返回结构。

### 模型目录

只返回模型名称和分页元数据，不再在 `_debug.schemas` 中返回全部模型结构。

### 错误

查询未命中时返回稳定结构：

```json
{
  "error": {
    "code": "OPERATION_NOT_FOUND",
    "message": "未找到接口",
    "query": "..."
  }
}
```

Tag 和模型分别使用 `TAG_NOT_FOUND`、`MODEL_NOT_FOUND`，不再把全部模型名称附加到错误结果。

## 配置目录

新增 `src/server/base/swagger/config/`：

- `defaults.ts`：默认文档地址、默认分页和最大深度。
- `network.ts`：远程请求、分组请求、资源请求、探测请求的超时值及 API 文档候选路径。
- `cache.ts`：内存和磁盘缓存 TTL。
- `index.ts`：统一导出。

配置目录只收敛 Swagger 模块内可调的策略硬编码；错误文案、日志文案、HTTP 状态码和测试样例不作为运行配置。

## 缓存行为

`refresh` 为 `true` 时跳过内存和磁盘读取，远程加载成功后仍更新缓存。现有 fragment 去除与 group 维度缓存键策略保持不变。

## 测试策略

使用 Node 内置测试运行器配合 `tsx --test`，先添加失败测试，再实现功能。至少覆盖：

1. 单接口 URL 精确返回接口详情。
2. 显式 `operationId` 查询。
3. Tag URL 返回对应接口。
4. 显式 `tag` 查询。
5. 两段 fragment 的 operationId/Tag 兼容回退。
6. 模型目录不再包含完整 Schema 集合，并支持分页过滤。
7. 未命中返回结构化错误。
8. 默认地址、缓存 TTL、超时和候选路径来自配置目录。
9. `refresh` 跳过缓存读取。

## 验收标准

- 原有接口 URL 调用继续成功。
- Tag URL 与显式 Tag 均能返回正确接口集合。
- 默认地址保持不变。
- 无参数结果不会包含完整 Schema 对象。
- `pnpm test`、`pnpm run build` 和相关静态检查通过。
