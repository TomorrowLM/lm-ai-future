/**
 * loadDocument 函数测试
 * 验证 fragment 解析和优先级策略
 */

import { loadDocument } from "../dist/server/base/swagger/analys/document.js";
import { parseFragment, getCachedDocument, clearCache } from "../dist/server/base/swagger/analys/index.js";

// 测试计数器
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ ${message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════
// 测试 1: parseFragment 基本功能
// ═══════════════════════════════════════════════════════════

console.log("\n📋 测试 1: parseFragment 基本功能\n");

// 1.1 完整的三段式 fragment
const frag1 = parseFragment("https://example.com/doc.html#/任务管理/城市管理-检查任务接口/pageUsingPOST_11");
assert(frag1.fragmentGroup === "任务管理", "提取分组名: 任务管理");
assert(frag1.fragmentTag === "城市管理-检查任务接口", "提取标签: 城市管理-检查任务接口");
assert(frag1.fragmentOperation === "pageUsingPOST_11", "提取操作: pageUsingPOST_11");

// 1.2 两段式 fragment（分组 + 操作）
const frag2 = parseFragment("https://example.com/doc.html#/用户管理/getUserById");
assert(frag2.fragmentGroup === "用户管理", "两段式 - 提取分组名: 用户管理");
assert(frag2.fragmentTag === undefined, "两段式 - 无标签");
assert(frag2.fragmentOperation === "getUserById", "两段式 - 提取操作: getUserById");

// 1.3 单段 fragment（仅操作）
const frag3 = parseFragment("https://example.com/doc.html#/listAllUsers");
assert(frag3.fragmentGroup === undefined, "单段式 - 无分组");
assert(frag3.fragmentOperation === "listAllUsers", "单段式 - 提取操作: listAllUsers");

// 1.4 无 fragment
const frag4 = parseFragment("https://example.com/doc.html");
assert(frag4.fragmentGroup === undefined, "无 fragment - 无分组");
assert(frag4.fragmentOperation === undefined, "无 fragment - 无操作");

// ═══════════════════════════════════════════════════════════
// 测试 2: loadDocument 缓存策略
// ═══════════════════════════════════════════════════════════

console.log("\n📋 测试 2: loadDocument 缓存策略\n");

// 2.1 测试传入 document 对象直接返回
async function testDirectDocument() {
  const testDoc = { openapi: "3.0.0", info: { title: "Test", version: "1.0" } };
  const result = await loadDocument({ document: testDoc });
  assert(result === testDoc, "传入 document 对象时直接返回");
}

// 2.2 测试空 document 对象被忽略
async function testEmptyDocument() {
  try {
    // 空对象应该被忽略，尝试从默认 URL 加载
    await loadDocument({ document: {} });
    assert(false, "空 document 对象应该被忽略");
  } catch (err) {
    assert(
      err.message.includes("无法从该 URL 获取可解析的 Swagger/OpenAPI JSON"),
      "空 document 被忽略，尝试从 URL 加载"
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 测试 3: URL fragment 缓存键生成
// ═══════════════════════════════════════════════════════════

console.log("\n📋 测试 3: URL fragment 缓存键生成\n");

// 3.1 相同分组应该使用相同缓存键
async function testCacheKeySameGroup() {
  clearCache();
  
  const url1 = "https://example.com/doc.html#/任务管理/标签1/op1";
  const url2 = "https://example.com/doc.html#/任务管理/标签2/op2";
  
  // 解析 fragment
  const frag1 = parseFragment(url1);
  const frag2 = parseFragment(url2);
  
  assert(frag1.fragmentGroup === frag2.fragmentGroup, "相同分组名");
  
  // 生成缓存键（模拟 document.ts 中的逻辑）
  const cacheKey1 = `${url1.split("#")[0]}#group=${frag1.fragmentGroup ?? ""}`;
  const cacheKey2 = `${url2.split("#")[0]}#group=${frag2.fragmentGroup ?? ""}`;
  
  assert(cacheKey1 === cacheKey2, "相同分组生成相同缓存键");
}

// 3.2 不同分组应该使用不同缓存键
async function testCacheKeyDifferentGroup() {
  clearCache();
  
  const url1 = "https://example.com/doc.html#/任务管理/op1";
  const url2 = "https://example.com/doc.html#/用户管理/op2";
  
  const frag1 = parseFragment(url1);
  const frag2 = parseFragment(url2);
  
  const cacheKey1 = `${url1.split("#")[0]}#group=${frag1.fragmentGroup ?? ""}`;
  const cacheKey2 = `${url2.split("#")[0]}#group=${frag2.fragmentGroup ?? ""}`;
  
  assert(cacheKey1 !== cacheKey2, "不同分组生成不同缓存键");
}

// ═══════════════════════════════════════════════════════════
// 测试 4: loadDocument 实际加载（需要网络）
// ═══════════════════════════════════════════════════════════

console.log("\n📋 测试 4: loadDocument 实际加载（需要网络）\n");

// 4.1 测试带 fragment 的 URL 加载
async function testLoadWithFragment() {
  try {
    clearCache();
    const url = "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/";
    console.log(`  加载 URL: ${url}`);
    
    const doc = await loadDocument({ source: url });
    
    assert(doc !== undefined, "成功加载文档");
    assert(
      typeof doc === "object" && (doc.openapi || doc.swagger || doc.definitions || doc.components),
      "文档包含 Swagger/OpenAPI 结构"
    );
    
    // 验证缓存
    const cacheKey = `${url.split("#")[0]}#group=`;
    const cached = getCachedDocument(cacheKey);
    assert(cached === doc, "文档已缓存");
    
    console.log(`  ✓ 文档类型: ${doc.openapi ? "OpenAPI 3.x" : doc.swagger === "2.0" ? "Swagger 2.0" : "未知"}`);
    console.log(`  ✓ 分组: ${parseFragment(url).fragmentGroup || "默认"}`);
    
  } catch (err) {
    console.error(`  ✗ 加载失败: ${err.message}`);
    assert(false, "带 fragment 的 URL 应该能加载");
  }
}

// 4.2 测试带分组名的 URL 加载
async function testLoadWithGroup() {
  try {
    clearCache();
    const url = "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/任务管理";
    console.log(`  加载 URL: ${url}`);
    
    const doc = await loadDocument({ source: url });
    
    assert(doc !== undefined, "成功加载带分组名的文档");
    
    const frag = parseFragment(url);
    assert(frag.fragmentGroup === "任务管理", "正确解析分组名");
    
    console.log(`  ✓ 分组: ${frag.fragmentGroup}`);
    console.log(`  ✓ 标签: ${frag.fragmentTag || "无"}`);
    console.log(`  ✓ 操作: ${frag.fragmentOperation || "无"}`);
    
  } catch (err) {
    console.error(`  ✗ 加载失败: ${err.message}`);
    assert(false, "带分组名的 URL 应该能加载");
  }
}

// ═══════════════════════════════════════════════════════════
// 执行所有测试
// ═══════════════════════════════════════════════════════════

async function runTests() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║       loadDocument 函数测试 - Fragment 解析优先级        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  // 同步测试
  console.log("▶ 执行同步测试...\n");
  
  // 异步测试
  console.log("▶ 执行异步测试...\n");
  await testDirectDocument();
  await testEmptyDocument();
  await testCacheKeySameGroup();
  await testCacheKeyDifferentGroup();
  
  // 网络测试（可选）
  console.log("\n▶ 执行网络测试（需要网络连接）...\n");
  await testLoadWithFragment();
  await testLoadWithGroup();
  
  // 测试结果
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                      测试结果汇总                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n✓ 通过: ${passed}`);
  console.log(`✗ 失败: ${failed}`);
  console.log(`📊 总计: ${passed + failed}\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
