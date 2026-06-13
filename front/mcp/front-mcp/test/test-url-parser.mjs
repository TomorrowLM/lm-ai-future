/**
 * 测试 URL 解析功能
 */

import { parseFragment, buildCandidateUrls, tryFetchJson } from "../dist/server/base/swagger/analys/url-parser.js";

const testUrl = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E4%B8%80%E8%B5%B7%E5%AE%89-%E5%AE%9E%E6%97%B6%E9%9F%B3%E8%A7%86%E9%A2%91-%E4%B8%9A%E5%8A%A1%E7%9B%B8%E5%85%B3/getCallSessionByIdUsingGET";

console.log("=".repeat(80));
console.log("测试 URL 解析功能");
console.log("=".repeat(80));
console.log("\n测试 URL:", testUrl);
console.log("");

// 1. 测试 fragment 解析
console.log("【测试 1】Fragment 解析");
console.log("-".repeat(80));
const fragment = parseFragment(testUrl);
console.log("解析结果:");
console.log("  分组名 (group):", fragment.fragmentGroup || "未提取到");
console.log("  标签 (tag):", fragment.fragmentTag || "未提取到");
console.log("  操作ID (operation):", fragment.fragmentOperation || "未提取到");
console.log("");

// 2. 测试候选 URL 构造
console.log("【测试 2】候选 URL 构造");
console.log("-".repeat(80));
const candidateInfo = buildCandidateUrls(testUrl);
if (candidateInfo) {
  console.log("BaseUrl:", candidateInfo.baseUrl.toString());
  console.log("\n候选 URLs:");
  candidateInfo.urls.forEach((url, idx) => {
    console.log(`  ${idx + 1}. ${url}`);
  });
} else {
  console.log("❌ 无法构造候选 URL");
}
console.log("");

// 3. 测试直接获取 Swagger JSON
if (fragment.fragmentGroup && candidateInfo) {
  console.log("【测试 3】直接获取 Swagger JSON");
  console.log("-".repeat(80));
  
  const groupEncoded = encodeURIComponent(fragment.fragmentGroup);
  const swaggerJsonUrl = new URL(
    `${candidateInfo.baseUrl.pathname}v3/api-docs?group=${groupEncoded}`,
    candidateInfo.baseUrl.origin
  ).toString();
  
  console.log("请求 URL:", swaggerJsonUrl);
  console.log("");
  
  try {
    console.log("开始请求...");
    const startTime = Date.now();
    const doc = await tryFetchJson(swaggerJsonUrl, 15000);
    const elapsed = Date.now() - startTime;
    
    console.log(`\n✅ 成功! 耗时: ${elapsed}ms\n`);
    console.log("文档信息:");
    console.log("  OpenAPI 版本:", doc.openapi || doc.swagger || "未知");
    console.log("  API 标题:", doc.info?.title || "未知");
    console.log("  路径数量:", Object.keys(doc.paths || {}).length);
    console.log("  Schema 数量:", Object.keys(doc.components?.schemas || doc.definitions || {}).length);
    
    // 4. 查找目标接口
    if (fragment.fragmentOperation) {
      console.log("\n【测试 4】查找目标接口");
      console.log("-".repeat(80));
      console.log("操作 ID:", fragment.fragmentOperation);
      
      const paths = doc.paths || {};
      let found = false;
      
      for (const [path, methods] of Object.entries(paths)) {
        if (methods && typeof methods === 'object') {
          for (const [method, operation] of Object.entries(methods)) {
            if (operation && typeof operation === 'object' && operation.operationId === fragment.fragmentOperation) {
              console.log(`\n✅ 找到接口!`);
              console.log(`  路径: ${path}`);
              console.log(`  方法: ${method.toUpperCase()}`);
              console.log(`  操作ID: ${operation.operationId}`);
              console.log(`  摘要: ${operation.summary || '无'}`);
              console.log(`  标签: ${(operation.tags || []).join(', ')}`);
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      
      if (!found) {
        console.log(`\n❌ 未找到操作 ID 为 "${fragment.fragmentOperation}" 的接口`);
      }
    }
    
  } catch (error) {
    console.error(`\n❌ 失败: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
} else {
  console.log("❌ 缺少必要信息，无法测试获取 Swagger JSON");
}

console.log("\n" + "=".repeat(80));
console.log("测试完成");
console.log("=".repeat(80));
