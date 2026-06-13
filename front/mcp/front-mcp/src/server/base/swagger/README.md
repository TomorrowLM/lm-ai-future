# Swagger 解析模块

## 目录

- [模块架构](#模块架构)
- [Swagger 解析流程](#swagger-解析流程)
- [入口层：handleSwaggerGetModelTool](#入口层handleswaggergetmodeltool)
- [analys 文档分析层](#analys-文档分析层)
  - [document.ts - 加载入口](#documentts---加载入口)
  - [remote-loader.ts - 远程加载](#remote-loaderts---远程加载)
  - [html-parser.ts - HTML 提取](#html-parserts---html-提取)
  - [url-parser.ts - URL 解析](#url-parserts---url-解析)
  - [cache.ts - 缓存管理](#cachets---缓存管理)
- [utils 工具函数层](#utils-工具函数层)
  - [operation.ts - 操作查找与提取](#operationts---操作查找与提取)
  - [schema.ts - $ref 递归解析](#schemats---ref-递归解析)
- [解析优先级策略](#解析优先级策略)
- [使用方式](#使用方式)
- [缓存策略](#缓存策略)

---

## 模块架构

```
src/server/base/swagger/
├── index.ts          # 入口：handleSwaggerGetModelTool（MCP 工具处理函数）
├── schema.ts         # 输入参数 JSON Schema
├── types.ts          # 类型定义
├── analys/           # 文档分析层
│   ├── index.ts      # 统一导出
│   ├── document.ts   # 主入口：loadDocument
│   ├── cache.ts      # 内存+磁盘缓存
│   ├── url-parser.ts # URL fragment 解析 + 拉取
│   ├── remote-loader.ts  # 多优先级远程加载
│   └── html-parser.ts    # 从 HTML 提取 Swagger JSON
├── utils/            # 工具函数层
│   ├── index.ts      # 统一导出
│   ├── operation.ts  # 操作查找 + I/O 提取
│   └── schema.ts     # $ref 递归解析
└── README.md
```

---

## Swagger 解析流程

```
handleSwaggerGetModelTool (swagger/index.ts)
         │
    ┌────┴────┐
    │ fragment │ 自动提取 operationId
    │ 解析     │ source#/分组/标签/操作ID → args.name
    └────┬────┘
         │
         ▼
    loadDocument(args) (analys/document.ts)
         │
    ┌────┼──────────────────────────────────┐
    │    │ ① 传入 document 对象？           │ → 直接返回
    │    │ ② 解析 URL fragment              │
    │    │ ③ 查内存缓存 (10min TTL)         │ → 命中返回
    │    │ ④ 查磁盘缓存 (1h TTL)            │ → 命中返回
    │    │ ⑤ 远程加载 / 本地 JSON 文件      │
    └────┼──────────────────────────────────┘
         │
         ▼
    loadRemoteDocument(source, group, opId) (analys/remote-loader.ts)
         │
    ┌────┴────────────────────────────────────────────────────┐
    │                                                          │
    │ 不是 doc.html URL？ → 直接 tryFetchJson，无效则报错      │
    │                                                          │
    │ ★ 优先级1: HTML 页面解析                                 │
    │   (已在 fragmentOperation 前提下执行)                     │
    │   loadAndParseHtmlPage → extractSwaggerFromHtml          │
    │   ┌─────────────────────────────────────────────┐        │
    │   │ 策略1: window.swaggerResources (Knife4j)    │        │
    │   │ 策略2: window.config → 提取 URL             │        │
    │   │ 策略3: 内联 URL 配置 (url/swaggerUrl 等)    │        │
    │   │ 策略4: <script> 标签提取完整 JSON            │        │
    │   └─────────────────────────────────────────────┘        │
    │                                                          │
    │ ★ 优先级2: 已知分组，直接拉取                            │
    │   v3/v2/api-docs?group=xxx (并行4条URL)                  │
    │                                                          │
    │ ★ 优先级3: swagger-resources 发现                        │
    │   → 解析资源列表 → 匹配分组 → 拉取目标 JSON              │
    │                                                          │
    │ ★ 优先级4: 并行探测候选 URL (3s 短超时)                  │
    │   v3/api-docs / v2/api-docs / swagger-resources          │
    │   → 有效规范直接返回 / swagger-resources 二次解析         │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
         │
         ▼
    handleSwaggerGetModelTool (返回结果)
         │
    ┌────┴──────────────────────┐
    │ ① !args.name → 模型名列表 │
    │ ② 查找模型                 │
    │    → 未命中？查找操作       │
    │    → 命中？返回解析后的模型  │
    └───────────────────────────┘
```

---

## 入口层：handleSwaggerGetModelTool

**文件：** [swagger/index.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/index.ts)

### 职责

MCP 工具 `get_swagger_mcp` 的处理函数，接收参数 -> 加载文档 -> 按 name 返回结果。

### 处理流程

```
handleSwaggerGetModelTool(request)
    │
    ├─ ① 自动提取 fragment 中的 operationId
    │    未提供 name，且 source 含 # → 取 fragment 末段作为 name
    │
    ├─ ② loadDocument(args) 加载文档
    │
    └─ ③ 按 name 分发：
          ├─ !name → 返回所有模型名列表
          ├─ 模型名命中 → 返回模型 schema（可选解析 $ref）
          └─ 模型未命中 → 查找操作（模糊匹配）
                └─ 命中 → 返回操作 I/O（请求参数 + 响应参数）
```

### 参数说明

| 参数 | 类型 | 说明 |
|---|---|---|
| `source` | string | Swagger JSON URL 或 doc.html URL（默认：`https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/`） |
| `document` | object | 直接传入文档对象（优先于 source） |
| `name` | string | 模型名或操作ID，不传则返回所有模型名 |
| `resolveRefs` | boolean | 是否解析 $ref（默认 true） |
| `maxDepth` | number | 解析递归深度（默认 15） |

---

## analys 文档分析层

### document.ts - 加载入口

**文件：** [analys/document.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/analys/document.ts)

整合所有子模块的文档加载入口：

```
loadDocument(args)
    │
    ├─ 传入 document 对象？ → 直接返回
    ├─ 解析 URL fragment（分组/标签/操作ID）
    ├─ 查内存缓存 → 命中返回
    ├─ 查磁盘缓存 → 命中返回并回填内存
    ├─ 远程 URL → loadRemoteDocument()
    └─ 本地文件 → 读取 JSON → 写入缓存
```

**getSchemasRoot(doc)**：提取模型定义根节点
- OpenAPI 3.x：`doc.components.schemas`
- Swagger 2.0：`doc.definitions`

---

### remote-loader.ts - 远程加载

**文件：** [analys/remote-loader.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/analys/remote-loader.ts)

四优先级远程文档加载，逐步降级：

| 优先级 | 条件 | 策略 | 超时 |
|---|---|---|---|
| 1 | 有 fragmentOperation | HTML 页面解析 | 15s |
| 2 | 有 fragmentGroup | 直接拉取 `v3/v2/api-docs?group=xxx`（4条并行） | 15s |
| 3 | - | `swagger-resources` → 匹配分组 → 拉取目标 JSON | 10s |
| 4 | - | 候选 URL 并行探测：`v3/api-docs` / `v2/api-docs` / `swagger-resources` | 3s |

非 doc.html 的 URL 直接作为 JSON 尝试拉取。

---

### html-parser.ts - HTML 提取

**文件：** [analys/html-parser.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/analys/html-parser.ts)

从 Knife4j / Swagger UI 的 HTML 页面中提取 Swagger JSON。

**extractSwaggerFromHtml()** 四种提取策略：

| 策略 | 来源 | 适用场景 |
|---|---|---|
| 1 | `window.swaggerResources` | Knife4j 最常见 |
| 2 | `window.config` → 提取 url | 配置对象中的 JSON 地址 |
| 3 | 内联 URL 配置（url/swaggerUrl/apiDocsUrl） | JS 代码中的硬编码 URL |
| 4 | `<script>` 标签中的完整 JSON | 页面内嵌完整 Swagger 文档 |

---

### url-parser.ts - URL 解析

**文件：** [analys/url-parser.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/analys/url-parser.ts)

**parseFragment(source)**：解析 Knife4j URL fragment

```
#/任务管理/城市管理-检查任务接口/pageUsingPOST_11
  ↑  group     ↑ tag               ↑ operationId

#/任务管理/pageUsingPOST_11
  ↑  group     ↑ operationId

#/listAllUsers
  ↑ operationId
```

**buildCandidateUrls(source)**：为 doc.html URL 构造候选探测地址

```
v3/api-docs          ← 首位（Knife4j 响应最快）
v2/api-docs
swagger-resources
```

**tryFetchJson(url, timeoutMs)**：HTTP 拉取 JSON
- 支持超时控制
- 非 JSON Content-Type 时尝试从文本中提取 JSON 对象

---

### cache.ts - 缓存管理

**文件：** [analys/cache.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/analys/cache.ts)

| 缓存层 | 位置 | TTL | 用途 |
|---|---|---|---|
| 内存 | Map | 10min | 同一会话内避免重复拉取 |
| 磁盘 | `os.tmpdir()/lm-mcp-swagger-cache/` | 1h | 跨会话复用，IDE MCP 超时重试 |

**缓存键**：`${baseUrl}#group=${fragmentGroup}`（剔除 fragment 路径，同站点同分组仅拉取一次）

---

## utils 工具函数层

### operation.ts - 操作查找与提取

**文件：** [utils/operation.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/utils/operation.ts)

**findOperationByKeyword(doc, keyword)**：全文档模糊匹配操作
- 扫描所有 path + method，对 summary / description / operationId / tags / path 打分
- 返回匹配度最高的操作

**extractOperationIO(doc, found)**：提取操作的输入输出
- **OpenAPI 3.x**：`requestBody.content` → parameters + body schema；`responses[200/201].content` → response schema
- **Swagger 2.0**：`parameters` 中过滤 body → 区分 path/query 参数和 body schema

### schema.ts - $ref 递归解析

**文件：** [utils/schema.ts](file:///Users/zm/lm/lm-ai-future/front/mcp/front-mcp/src/server/base/swagger/utils/schema.ts)

**resolveSchemaNode(options)**：递归展开 $ref 引用
- 循环引用检测（`seenRefs` Set）
- 支持组合类型：`allOf` / `oneOf` / `anyOf`
- 递归解析 `properties` / `items` / `additionalProperties`
- 深度限制避免栈溢出

---

## 解析优先级策略

```
输入: doc.html URL
    │
    ▼
【优先级 1】HTML 页面解析
    ├─ 获取 HTML 内容
    ├─ 策略1: window.swaggerResources
    ├─ 策略2: window.config
    ├─ 策略3: JS URL 配置
    └─ 策略4: <script> 标签完整 JSON
    │
    ▼
【优先级 2】直拉 v3/v2 api-docs?group=xxx
    │
    ▼
【优先级 3】swagger-resources 查询 → 匹配分组 → 拉取
    │
    ▼
【优先级 4】并行探测候选 URL（v3/v2/swagger-resources，3s 短超时）
```

---

## 使用方式

### MCP 工具调用

#### 获取所有模型名
```json
{
  "source": "https://api-test.17an.com/dsb/yqarw/api/doc.html#/"
}
```

#### 获取单个模型
```json
{
  "source": "https://api-test.17an.com/dsb/yqarw/api/doc.html#/任务管理",
  "name": "YqaExpertResp对象",
  "resolveRefs": true
}
```

#### 通过 fragment 自动提取操作（无需传 name）
```json
{
  "source": "https://api-test.17an.com/dsb/yqarw/api/doc.html#/任务管理/一起安-同步任务-三方信息表dx接口/getByIdUsingGET_3"
}
```

#### 使用直链 JSON URL
```json
{
  "source": "https://api-test.17an.com/dsb/yqarw/v3/api-docs?group=任务管理",
  "name": "pageUsingPOST",
  "maxDepth": 10
}
```

### 代码调用

```typescript
import { loadDocument, getSchemasRoot } from "@/server/base/swagger/analys/index.js";
import { findOperationByKeyword, extractOperationIO } from "@/server/base/swagger/utils/operation.js";

// 加载文档
const doc = await loadDocument({
  source: "https://api-test.17an.com/dsb/yqarw/api/doc.html#/任务管理/接口名称/operationId"
});

// 获取所有模型
const schemas = getSchemasRoot(doc);

// 查找操作
const operation = findOperationByKeyword(doc, "operationId");

// 提取接口信息
const io = extractOperationIO(doc, operation);
```

---

## 缓存策略

```
请求 → 缓存键: url#group=分组名
    │
    ├─ 内存缓存 (10min TTL) → 命中直接返回
    │
    └─ 磁盘缓存 (1h TTL, 系统临时目录)
         └─ 命中 → 回填内存 → 返回
              └─ 未命中 → 远程加载 → 写入内存+磁盘
```

- 同站点同分组仅拉取一次，后续请求走缓存
- 磁盘缓存路径：`os.tmpdir()/lm-mcp-swagger-cache/{sha1}.json`
- 写磁盘不阻塞返回（fire-and-forget）
