/**
 * Swagger 解析流程逐步骤测试
 * URL: 城市管理/城市管理-事件接口/detailUsingGET_60
 * 覆盖所有解析步骤：parseFragment → buildCandidateUrls → tryFetchJson →
 * loadDocument → getSchemasRoot → handleSwaggerGetModelTool →
 * findOperationByKeyword → extractOperationIO → resolveSchemaNode
 */

import { parseFragment, buildCandidateUrls, tryFetchJson } from "../dist/server/base/swagger/analys/url-parser.js";
import { loadDocument, getSchemasRoot } from "../dist/server/base/swagger/analys/document.js";
import { handleSwaggerGetModelTool } from "../dist/server/base/swagger/index.js";
import { findOperationByKeyword, extractOperationIO } from "../dist/server/base/swagger/utils/operation.js";
import { resolveSchemaNode } from "../dist/server/base/swagger/utils/schema.js";
import { getCachedDocument, clearCache, isValidSpec } from "../dist/server/base/swagger/analys/cache.js";

// 注意：不能用 URL 作为变量名，会覆盖全局 URL 构造函数
const TEST_URL = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E4%BA%8B%E4%BB%B6%E6%8E%A5%E5%8F%A3/detailUsingGET_60";

let docCache = null;
async function getDoc() {
  if (!docCache) {
    clearCache();
    docCache = await loadDocument({ source: TEST_URL });
  }
  return docCache;
}

/** 合并 MCP 多部分响应中的 text 内容 */
function mergeContent(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text.replace(/^\[part \d+\/\d+\]\r?\n/, ""))
    .join("");
}

let pass = 0;
let fail = 0;

function result(ok, msg) {
  if (ok) {
    console.log(`  ✅ ${msg}`);
    pass++;
  } else {
    console.log(`  ❌ ${msg}`);
    fail++;
  }
}

// ════════════════════════════════════════════
// 步骤 1: parseFragment - URL fragment 解析
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 1: parseFragment - URL fragment 解析");
console.log(`${"━".repeat(70)}`);

const frag = parseFragment(TEST_URL);
console.log(`  URL: ${TEST_URL}`);
console.log(`  解码: 城市管理/城市管理-事件接口/detailUsingGET_60`);
console.log(`  fragmentGroup: ${frag.fragmentGroup}`);
console.log(`  fragmentTag: ${frag.fragmentTag}`);
console.log(`  fragmentOperation: ${frag.fragmentOperation}`);

result(frag.fragmentGroup === "城市管理", `分组解析: ${frag.fragmentGroup}`);
result(frag.fragmentTag === "城市管理-事件接口", `标签解析: ${frag.fragmentTag}`);
result(frag.fragmentOperation === "detailUsingGET_60", `操作解析: ${frag.fragmentOperation}`);

// ════════════════════════════════════════════
// 步骤 2: buildCandidateUrls - 候选 URL 构造
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 2: buildCandidateUrls - 候选 URL 构造");
console.log(`${"━".repeat(70)}`);

const info = buildCandidateUrls(TEST_URL);
result(info !== null, "buildCandidateUrls 返回非 null");
if (info) {
  result(info.baseUrl.href === "https://api-test.17an.com/dsb/yqarw/api/", `baseUrl: ${info.baseUrl.href}`);
  result(info.urls.length === 3, `候选 URL 数: ${info.urls.length}`);
  info.urls.forEach((u, i) => console.log(`    ${i + 1}. ${u}`));
}

// ════════════════════════════════════════════
// 步骤 3: tryFetchJson - 拉取 swagger-resources
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 3: tryFetchJson - 拉取 swagger-resources");
console.log(`${"━".repeat(70)}`);

try {
  const resources = await tryFetchJson("https://api-test.17an.com/dsb/yqarw/api/swagger-resources", 15000);
  result(Array.isArray(resources) && resources.length > 0, `swagger-resources: ${resources.length} 个资源组`);
  resources.forEach((r, i) => console.log(`    ${i + 1}. name="${r.name}" url="${r.url}"`));
} catch (err) {
  result(false, `失败: ${err.message}`);
}

// ════════════════════════════════════════════
// 步骤 4: swagger-resources → 匹配分组 → 拉取文档
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 4: swagger-resources → 匹配分组 → 拉取文档");
console.log(`${"━".repeat(70)}`);

try {
  const resources = await tryFetchJson("https://api-test.17an.com/dsb/yqarw/api/swagger-resources", 15000);

  const group = "城市管理";
  const match = resources.find((item) => {
    const n = String(item.name ?? "").toLowerCase();
    const u = String(item.url ?? "").toLowerCase();
    return n.includes(group.toLowerCase()) || u.includes(encodeURIComponent(group)) || u.includes(group);
  });
  result(!!match, `匹配分组 "${group}"`);
  if (match) {
    const apiBase = "https://api-test.17an.com/dsb/yqarw/api/";
    const resolvedUrl = new URL(String(match.url).replace(/^\//, ""), apiBase).href;
    console.log(`    拉取: ${resolvedUrl}`);
    const swaggerDoc = await tryFetchJson(resolvedUrl, 18000);
    result(isValidSpec(swaggerDoc), `文档有效`);
    if (isValidSpec(swaggerDoc)) {
      console.log(`    openapi: ${swaggerDoc.openapi}`);
      console.log(`    paths: ${Object.keys(swaggerDoc.paths || {}).length}`);
      console.log(`    schemas: ${Object.keys(swaggerDoc.components?.schemas || {}).length}`);
    }
  }
} catch (err) {
  result(false, `失败: ${err.message}`);
}

// ════════════════════════════════════════════
// 步骤 5: loadDocument 完整加载
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 5: loadDocument 完整加载（入口）");
console.log(`${"━".repeat(70)}`);

try {
  const d = await getDoc();
  result(!!d?.openapi, `文档加载成功, openapi: ${d.openapi}`);
  console.log(`  paths: ${Object.keys(d.paths || {}).length}`);
  console.log(`  schemas: ${Object.keys(d.components?.schemas || {}).length}`);

  // 验证缓存
  const cacheKey = `${TEST_URL.split("#")[0]}#group=${frag.fragmentGroup ?? ""}`;
  result(!!getCachedDocument(cacheKey), `缓存命中: ${cacheKey}`);
} catch (err) {
  result(false, `loadDocument 失败: ${err.message}`);
}

// ════════════════════════════════════════════
// 步骤 6: getSchemasRoot - 提取模型
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 6: getSchemasRoot - 提取模型定义");
console.log(`${"━".repeat(70)}`);

const d = await getDoc();
const schemas = getSchemasRoot(d);
const names = Object.keys(schemas).sort();
result(names.length > 0, `模型总数: ${names.length}`);
console.log(`  前 10 个: ${names.slice(0, 10).join(", ")}`);

// ════════════════════════════════════════════
// 步骤 7: handleSwaggerGetModelTool - 返回模型列表
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 7: handleSwaggerGetModelTool - 模型列表");
console.log(`${"━".repeat(70)}`);

try {
  const MODEL_LIST_SOURCE = TEST_URL.split("#")[0] + "#/";
  clearCache();
  const listResult = await handleSwaggerGetModelTool({ params: { arguments: { source: MODEL_LIST_SOURCE } } });
  const listText = mergeContent(listResult.content);
  const listData = JSON.parse(listText);
  result(Array.isArray(listData.models), `模型列表: ${listData.models?.length || 0} 个`);
  console.log(`  前 5 个: ${(listData.models || []).slice(0, 5).join(", ")}`);
} catch (err) {
  result(false, `失败: ${err.message}`);
}

// ════════════════════════════════════════════
// 步骤 8: handleSwaggerGetModelTool - fragment 自动提取操作
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 8: handleSwaggerGetModelTool - fragment 自动提取操作");
console.log(`${"━".repeat(70)}`);

try {
  clearCache();
  const opResult = await handleSwaggerGetModelTool({ params: { arguments: { source: TEST_URL } } });
  const opText = mergeContent(opResult.content);
  const opData = JSON.parse(opText);
  result(opData.match === "operation", `匹配类型: ${opData.match}`);
  console.log(`  keyword: ${opData.keyword}`);
  console.log(`  operationId: ${opData.operation?.operationId}`);
  console.log(`  path: ${opData.operation?.method?.toUpperCase()} ${opData.operation?.path}`);
  console.log(`  summary: ${opData.operation?.summary}`);
  result(opData.operation?.operationId === "detailUsingGET_60", `操作 ID: ${opData.operation?.operationId}`);
} catch (err) {
  result(false, `失败: ${err.message}`);
}

// ════════════════════════════════════════════
// 步骤 9: findOperationByKeyword + extractOperationIO
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 9: findOperationByKeyword + extractOperationIO");
console.log(`${"━".repeat(70)}`);

const op = findOperationByKeyword(d, "detailUsingGET_60");
result(!!op, `找到操作, 路径: ${op?.method?.toUpperCase()} ${op?.path}`);
if (op) {
  const io = extractOperationIO(d, op);
  console.log(`  operationId: ${io.operation.operationId}`);
  console.log(`  method: ${io.operation.method}`);
  console.log(`  path: ${io.operation.path}`);
  console.log(`  summary: ${io.operation.summary}`);
  console.log(`  请求参数: ${io.request.parameters.length} 个`);
  console.log(`  请求体: ${io.request.body ? "有" : "无"}`);
  console.log(`  响应码: ${io.response.code}`);
  console.log(`  响应体: ${io.response.body ? "有" : "无"}`);
  result(!!io.operation.operationId, `操作 ID: ${io.operation.operationId}`);

  if (io.request.parameters.length > 0) {
    console.log(`\n  📥 请求参数详情:`);
    io.request.parameters.forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.name} (${p.in})${p.required ? " *必填" : ""}`);
    });
  }
}

// ════════════════════════════════════════════
// 步骤 10: resolveSchemaNode - $ref 解析
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("▶ 步骤 10: resolveSchemaNode - $ref 递归解析");
console.log(`${"━".repeat(70)}`);

if (op) {
  const io = extractOperationIO(d, op);

  if (io.response.body) {
    console.log(`  📤 解析响应体...`);
    const resolved = resolveSchemaNode({ doc: d, node: io.response.body, depth: 10, seenRefs: new Set() });
    console.log(`  类型: ${resolved.type || "object"}`);
    const props = resolved.properties || {};
    console.log(`  属性数: ${Object.keys(props).length}`);
    Object.entries(props).slice(0, 8).forEach(([k, v]) => {
      const desc = v.description ? ` - ${v.description}` : "";
      console.log(`    ${k}: ${v.type || "object"}${desc}`);
    });
    result(Object.keys(props).length > 0, `响应体 ${Object.keys(props).length} 个属性`);
  } else {
    result(true, `无响应体（GET 请求正常）`);
  }

  if (io.request.body) {
    console.log(`\n  📥 解析请求体...`);
    const resolved = resolveSchemaNode({ doc: d, node: io.request.body, depth: 10, seenRefs: new Set() });
    const props = resolved.properties || {};
    result(Object.keys(props).length > 0, `请求体 ${Object.keys(props).length} 个属性`);
  } else {
    console.log(`  📥 无请求体（GET 请求）`);
  }
}

// ════════════════════════════════════════════
// 汇总
// ════════════════════════════════════════════
console.log(`\n${"━".repeat(70)}`);
console.log("  测试汇总");
console.log(`${"━".repeat(70)}`);
console.log(`  ✅ 通过: ${pass}`);
console.log(`  ❌ 失败: ${fail}`);
console.log(`  📊 总计: ${pass + fail}`);
if (fail > 0) process.exit(1);
