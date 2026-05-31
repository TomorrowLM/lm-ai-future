# Swagger 工具文档

## 目录

- [默认 Source 参数配置](#默认-source-参数配置)
- [Analys 模块架构](#analys-模块架构)
- [解析优先级策略](#解析优先级策略)
- [使用方式](#使用方式)

---

## 默认 Source 参数配置

## 概述

已成功修改 MCP Swagger 工具，使其在未提供 `source` 参数时自动使用默认 URL：`https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/`

## 修改内容

### 1. 修改 `swaggerGetModelInputSchema`（ai/mcp/src/tools/swagger/index.ts:13-38）

在 `source` 属性中添加了 `default` 字段：
```typescript
source: {
  type: "string",
  description: "Swagger/OpenAPI 文档 URL 或本地文件路径（JSON）",
  default: "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/",
},
```

### 2. 修改 `loadDocument` 函数（ai/mcp/src/tools/swagger/index.ts:109-124）

增强了默认值处理逻辑：
```typescript
// 使用默认 URL 如果 source 未提供或为空
const defaultSource = "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/";
let source: string | undefined;

if (args.source !== undefined && args.source !== null && args.source.trim() !== "") {
  source = normalizeSource(args.source);
} else {
  source = defaultSource;
}

if (!source || source.trim() === "") {
  throw new Error("get_swagger_mcp: 需要提供 source 或 document");
}
```

### 3. 修改 `handleSwaggerGetModelTool` 函数（ai/mcp/src/tools/swagger/index.ts:443-452）

添加了额外的默认值设置以确保健壮性：
```typescript
// 确保 args 有默认的 source 值
if (!args.source || args.source.trim() === "") {
  args.source = "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/";
}
```

## 测试结果

### 成功测试
1. **提供明确的 source 参数**：工具正常工作，成功从指定 URL 获取了 1000+ 个模型定义
2. **工具功能完整性**：TypeScript 编译无错误，工具核心功能正常

### 已知问题
- 当完全不提供任何参数调用工具时，MCP SDK 可能不会自动应用 schema 中的默认值
- 需要传递空字符串 `""` 作为 `source` 参数才能触发默认值逻辑

## 使用方式

### 方式一：使用默认 URL（推荐）
```json
{
  "resolveRefs": false
}
```
或传递空字符串作为 source：
```json
{
  "source": "",
  "resolveRefs": false
}
```

### 方式二：使用自定义 URL
```json
{
  "source": "https://custom-swagger-url.com/api-docs",
  "resolveRefs": true
}
```

### 方式三：获取特定模型
```json
{
  "name": "YqaExpertResp对象",
  "resolveRefs": true
}
```

## 技术细节

### 默认值处理策略
1. **Schema 级别**：在 OpenAPI schema 中定义默认值，供客户端参考
2. **运行时级别**：在 `loadDocument` 函数中实现回退逻辑
3. **双重保障**：在 `handleSwaggerGetModelTool` 中再次设置默认值

### 健壮性考虑
- 处理 `undefined`、`null` 和空字符串情况
- 使用 `trim()` 去除空白字符
- 多层验证确保不会因空值而崩溃

## 后续优化建议

1. **MCP SDK 集成**：研究 MCP SDK 是否支持自动应用 schema 默认值
2. **错误信息改进**：当使用默认 URL 时，在错误信息中提示使用的是默认值
3. **配置化**：将默认 URL 提取为配置常量，便于维护
4. **日志记录**：添加调试日志以跟踪默认值的使用情况

## 文件清单

修改的文件：
- `ai/mcp/src/tools/swagger/index.ts`

相关文件：
- `ai/mcp/src/tools/index.ts`（工具注册）
- `ai/mcp/src/index.ts`（MCP 服务器入口）

---

## Analys 模块架构

### 概述

`analys` 模块是 Swagger 文档解析的核心引擎，采用模块化设计，将不同的解析策略分离到独立文件中，提高代码的可维护性和可扩展性。

### 文件结构

```
src/server/base/swagger/analys/
├── index.ts              # 统一导出入口
├── document.ts           # 主入口：loadDocument 和 getSchemasRoot
├── cache.ts              # 缓存管理：内存缓存、磁盘缓存、验证
├── url-parser.ts         # URL 解析：fragment 提取、候选 URL 构造、fetch JSON
├── html-parser.ts        # HTML 解析：从 HTML 页面提取 Swagger 数据
└── remote-loader.ts      # 远程加载：多级优先级策略加载远程文档
```

### 模块职责

#### 1. cache.ts - 缓存管理
- **内存缓存**：10 分钟 TTL，避免同一会话内重复拉取
- **磁盘缓存**：1 小时 TTL，跨会话复用
- **文档验证**：`isValidSpec()` 验证 Swagger/OpenAPI 规范
- **缓存操作**：get/set/clear/hashKey

#### 2. url-parser.ts - URL 解析
- **parseFragment()**：从 URL fragment 提取分组名和操作 ID
  - 支持格式：`#/{group}/{tag}/{operationId}`
  - 示例：`#/任务管理/城市管理-检查任务接口/pageUsingPOST_11`
- **buildCandidateUrls()**：构造候选探测 URL
  - v3/api-docs
  - v2/api-docs
  - swagger-resources
- **tryFetchJson()**：从 URL 获取 JSON 数据，支持超时和智能解析

#### 3. html-parser.ts - HTML 解析
- **extractSwaggerFromHtml()**：从 HTML 提取 Swagger 数据（4 种策略）
  - 策略 1：`window.swaggerResources`（Knife4j 最常见）
  - 策略 2：`window.config` 配置对象
  - 策略 3：JavaScript 代码中的 URL 配置
  - 策略 4：`<script>` 标签中的完整 JSON
- **loadAndParseHtmlPage()**：加载并解析 HTML 页面（优先级最高）
  - 获取 HTML 内容
  - 尝试提取 Swagger JSON
  - 失败时自动降级到直接 API 调用

#### 4. remote-loader.ts - 远程加载
- **loadRemoteDocument()**：多级优先级策略
  - 优先级 1：HTML 页面解析
  - 优先级 2：直接 API docs URL（v3/v2/api-docs?group=xxx）
  - 优先级 3：swagger-resources 查询
  - 优先级 4：并行探测候选 URL

#### 5. document.ts - 主入口
- **loadDocument()**：整合所有模块的文档加载入口
  - 支持 HTTP URL 和本地文件路径
  - 自动应用缓存策略
  - 调用 remote-loader 进行远程加载
- **getSchemasRoot()**：提取 schema 定义根节点
  - 支持 OpenAPI 3.x（components.schemas）
  - 支持 Swagger 2.0（definitions）

#### 6. index.ts - 统一导出
- 导出所有公共 API
- 方便其他模块引用

---

## 解析优先级策略

### 执行流程

```
输入: doc.html URL
    ↓
【优先级 1】尝试直接解析 HTML 页面
    ├─ 获取 HTML 内容
    ├─ 从 HTML 中提取 Swagger JSON URL
    │   ├─ 策略 1: window.swaggerResources
    │   ├─ 策略 2: window.config  
    │   ├─ 策略 3: JavaScript 中的 URL 配置
    │   └─ 策略 4: <script> 标签中的 JSON
    └─ 如果提取失败，构造 Swagger JSON URL 直接获取
    ↓
【优先级 2】快路径 1：直接尝试 v3/v2 api-docs?group=xxx
    ↓
【优先级 3】快路径 2：swagger-resources 查询
    ↓
【优先级 4】并行探测其他候选 URL
```

### 策略说明

1. **HTML 解析（优先级最高）**
   - 直接从 doc.html 页面提取数据
   - 适用于 knife4j 等现代 Swagger UI
   - 支持多种提取策略

2. **直接 API URL**
   - 根据 fragment 中的分组名构造 URL
   - 例如：`/v3/api-docs?group=任务管理`
   - 快速且可靠

3. **swagger-resources**
   - 查询分组列表
   - 自动匹配目标分组
   - 信息量最大

4. **并行探测**
   - 同时尝试多个候选 URL
   - 使用短超时（3 秒）
   - 作为最后的降级策略

---

## 使用方式

### MCP 工具调用

#### 方式一：使用默认 URL（推荐）
```json
{
  "resolveRefs": false
}
```
或传递空字符串作为 source：
```json
{
  "source": "",
  "resolveRefs": false
}
```

#### 方式二：使用 doc.html URL
```json
{
  "source": "https://api-test.17an.com/dsb/yqarw/api/doc.html#/任务管理/一起安-同步任务-三方信息表dx接口/getByIdUsingGET_3",
  "name": "getByIdUsingGET_3"
}
```

#### 方式三：使用自定义 JSON URL
```json
{
  "source": "https://custom-swagger-url.com/v3/api-docs?group=任务管理",
  "resolveRefs": true
}
```

#### 方式四：获取特定模型
```json
{
  "name": "YqaExpertResp对象",
  "resolveRefs": true
}
```

### 代码示例

```typescript
import { loadDocument } from "@/server/base/swagger/analys/index.js";

// 加载文档
const doc = await loadDocument({
  source: "https://api-test.17an.com/dsb/yqarw/api/doc.html#/任务管理/接口名称/operationId"
});

// 获取 schemas
const schemas = getSchemasRoot(doc);

// 查找接口
const operation = findOperationByKeyword(doc, "operationId");

// 提取接口信息
const io = extractOperationIO(doc, operation);
```

---

## 技术细节

### 缓存策略

1. **内存缓存**
   - TTL: 10 分钟
   - 适用于同一会话内的重复请求
   - 自动清理过期缓存

2. **磁盘缓存**
   - TTL: 1 小时
   - 位置：`os.tmpdir()/lm-mcp-swagger-cache`
   - 跨会话复用，避免 IDE MCP 超时重试

3. **缓存键**
   - 格式：`${baseUrl}#group=${fragmentGroup}`
   - 剔除 fragment，同站点同分组仅拉取一次

### 默认值处理策略

1. **Schema 级别**：在 OpenAPI schema 中定义默认值，供客户端参考
2. **运行时级别**：在 `loadDocument` 函数中实现回退逻辑
3. **双重保障**：在 `handleSwaggerGetModelTool` 中再次设置默认值

### 健壮性考虑

- 处理 `undefined`、`null` 和空字符串情况
- 使用 `trim()` 去除空白字符
- 多层验证确保不会因空值而崩溃
- 超时控制避免无限等待

---

## 后续优化建议

1. **MCP SDK 集成**：研究 MCP SDK 是否支持自动应用 schema 默认值
2. **错误信息改进**：当使用默认 URL 时，在错误信息中提示使用的是默认值
3. **配置化**：将默认 URL 提取为配置常量，便于维护
4. **日志记录**：添加调试日志以跟踪默认值的使用情况
5. **性能监控**：添加性能指标统计，优化加载策略
6. **错误重试**：实现智能重试机制，提高成功率