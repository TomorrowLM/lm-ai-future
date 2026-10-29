# Swagger HTML 解析功能验证报告

## 测试目标
验证 `get_swagger_mcp` 工具能否正确处理 knife4j 的 doc.html URL：
```
https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E6%A3%80%E6%9F%A5%E4%BB%BB%E5%8A%A1%E6%8E%A5%E5%8F%A3/pageUsingPOST_11
```

## 分析结果

### 1. 网络请求分析
通过 chrome-devtools 观察到页面加载时的关键请求：
- ✅ `GET /dsb/yqarw/api/doc.html` - HTML 页面
- ✅ `GET /dsb/yqarw/api/swagger-resources` - 返回分组列表
- ✅ `GET /dsb/yqarw/api/v3/api-docs?group=任务管理` - 实际的 Swagger JSON

### 2. swagger-resources 响应
```json
[
  {
    "name": "任务管理",
    "url": "/v3/api-docs?group=任务管理",
    "swaggerVersion": "3.0.3",
    "location": "/v3/api-docs?group=任务管理"
  }
]
```

### 3. HTML 页面特点
- ❌ HTML 中**没有**内联的 `window.swaggerResources`
- ❌ HTML 中**没有**内联的 Swagger JSON 数据
- ✅ 数据通过 JavaScript 动态调用 API 加载

## 优化策略

由于 knife4j 的 HTML 页面不包含内联数据，我们采用了以下优化：

### 快路径 1：直接 URL 构造
当 URL fragment 中包含分组名时（如 `#/任务管理/...`），直接构造 API docs URL：
```
/dsb/yqarw/api/v3/api-docs?group=任务管理
/dsb/yqarw/api/v2/api-docs?group=任务管理
```

### 快路径 2：swagger-resources 查询
如果快路径 1 失败，则：
1. 调用 `/swagger-resources` 获取分组列表
2. 根据 fragment 中的分组名匹配对应项
3. 从匹配项中提取 URL 并拉取 Swagger JSON

### 降级策略
如果以上快路径都失败，回退到原有的并行探测机制。

## 使用方式

### MCP 工具调用示例
```json
{
  "name": "get_swagger_mcp",
  "arguments": {
    "source": "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E6%A3%80%E6%9F%A5%E4%BB%BB%E5%8A%A1%E6%8E%A5%E5%8F%A3/pageUsingPOST_11"
  }
}
```

### 预期行为
1. 解析 fragment 提取分组名：`任务管理`
2. 快路径 1：尝试直接构造的 4 个 URL
3. 快路径 2：调用 swagger-resources 获取分组信息
4. 返回对应分组的完整 Swagger 文档

## 性能优化
- 快路径 1 超时：15 秒/URL（并行执行）
- 快路径 2 超时：10 秒
- 总体预期响应时间：< 20 秒（在缓存命中时 < 1 秒）

## 缓存机制
- 内存缓存：10 分钟 TTL
- 磁盘缓存：1 小时 TTL
- 缓存键：`{baseUrl}#group={分组名}`

## 验证状态
✅ 代码已优化并编译成功
✅ 支持 knife4j doc.html URL 解析
✅ 支持 fragment 中的分组名提取
✅ 支持多级降级策略
✅ **实际测试验证通过**（2026-05-23）

## 实际测试结果

### 测试 1: 文档加载
```bash
$ node test-swagger.mjs
✅ 成功获取文档!
OpenAPI 版本: 3.0.3
路径数量: 1596
```

### 测试 2: 接口查找
```bash
$ node test-operation.mjs
✅ 找到接口:
  路径: /dsb/yqarw/api/yqa/urban/checkplan/task/page
  方法: post
  评分: 3
  摘要: 检查任务分页查询
  操作ID: pageUsingPOST_11
  标签: [ '城市管理-检查任务接口' ]
```

### 关键成功因素
1. **快路径 1 生效**: 直接从 fragment 提取"任务管理"分组名
2. **URL 构造正确**: `/dsb/yqarw/api/v3/api-docs?group=任务管理`
3. **接口匹配准确**: 通过 operationId `pageUsingPOST_11` 精确定位
4. **响应时间**: < 5 秒（首次加载）
