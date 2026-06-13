/**
 * 测试 URL fragment 解析功能
 */

import { parseFragment } from "../dist/server/base/swagger/analys/url-parser.js";
import { loadDocument } from "../dist/server/base/swagger/analys/document.js";
import { clearCache } from "../dist/server/base/swagger/analys/cache.js";

const testUrl = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E4%B8%80%E8%B5%B7%E5%AE%89-%E5%AE%9E%E6%97%B6%E9%9F%B3%E8%A7%86%E9%A2%91-%E4%B8%9A%E5%8A%A1%E7%9B%B8%E5%85%B3/getCallSessionByIdUsingGET";

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║        URL Fragment 解析测试 - 真实 URL 验证            ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

console.log("📝 测试 URL:");
console.log(`${testUrl}\n`);

// 步骤 1: 解析 fragment
console.log("📋 步骤 1: 解析 URL fragment");
console.log("─".repeat(60));

const fragment = parseFragment(testUrl);

console.log("✓ Fragment 解析结果:");
console.log(`  - 分组 (group): ${fragment.fragmentGroup || "无"}`);
console.log(`  - 标签 (tag): ${fragment.fragmentTag || "无"}`);
console.log(`  - 操作 (operation): ${fragment.fragmentOperation || "无"}`);

// 验证解析结果
const expectedGroup = "任务管理";
const expectedTag = "一起安-实时音视频-业务相关";
const expectedOperation = "getCallSessionByIdUsingGET";

console.log("\n✓ 验证解析结果:");
console.log(`  - 分组: ${fragment.fragmentGroup === expectedGroup ? "✓ 正确" : `✗ 错误 (期望: ${expectedGroup})`}`);
console.log(`  - 标签: ${fragment.fragmentTag === expectedTag ? "✓ 正确" : `✗ 错误 (期望: ${expectedTag})`}`);
console.log(`  - 操作: ${fragment.fragmentOperation === expectedOperation ? "✓ 正确" : `✗ 错误 (期望: ${expectedOperation})`}`);

// 步骤 2: 生成缓存键
console.log("\n📋 步骤 2: 生成缓存键");
console.log("─".repeat(60));

const cacheKey = `${testUrl.split("#")[0]}#group=${fragment.fragmentGroup ?? ""}`;
console.log(`缓存键: ${cacheKey}`);

// 步骤 3: 加载文档
console.log("\n📋 步骤 3: 加载 Swagger 文档");
console.log("─".repeat(60));

async function testLoadDocument() {
  try {
    clearCache();
    console.log("开始加载文档...");
    
    const doc = await loadDocument({ source: testUrl });
    
    console.log("✓ 文档加载成功！\n");
    console.log("📊 文档信息:");
    console.log(`  - OpenAPI 版本: ${doc.openapi || "N/A"}`);
    console.log(`  - 标题: ${doc.info?.title || "N/A"}`);
    console.log(`  - 描述: ${doc.info?.description || "N/A"}`);
    console.log(`  - 标签数量: ${doc.tags?.length || 0}`);
    console.log(`  - 路径数量: ${Object.keys(doc.paths || {}).length}`);
    
    // 查找目标操作
    console.log("\n🔍 查找目标操作: getCallSessionByIdUsingGET");
    console.log("─".repeat(60));
    
    let found = false;
    for (const [path, methods] of Object.entries(doc.paths || {})) {
      for (const [method, operation] of Object.entries(methods)) {
        if (operation.operationId === "getCallSessionByIdUsingGET") {
          found = true;
          console.log(`✓ 找到目标操作:`);
          console.log(`  - 路径: ${method.toUpperCase()} ${path}`);
          console.log(`  - 操作ID: ${operation.operationId}`);
          console.log(`  - 摘要: ${operation.summary || "N/A"}`);
          console.log(`  - 标签: ${operation.tags?.join(", ") || "N/A"}`);
          
          // 检查响应
          if (operation.responses) {
            console.log(`\n  - 响应:`);
            for (const [code, response] of Object.entries(operation.responses)) {
              console.log(`    - ${code}: ${response.description || "N/A"}`);
            }
          }
          break;
        }
      }
      if (found) break;
    }
    
    if (!found) {
      console.log("✗ 未找到目标操作 getCallSessionByIdUsingGET");
    }
    
    // 查找模型
    console.log("\n🔍 查找相关模型");
    console.log("─".repeat(60));
    
    const schemas = doc.components?.schemas || {};
    const callSessionSchemas = Object.keys(schemas).filter(k => 
      k.toLowerCase().includes("callsession")
    );
    
    if (callSessionSchemas.length > 0) {
      console.log(`✓ 找到 ${callSessionSchemas.length} 个相关模型:`);
      callSessionSchemas.forEach(schema => {
        console.log(`  - ${schema}`);
      });
    } else {
      console.log("✗ 未找到包含 CallSession 的模型");
    }
    
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║                      测试完成 ✓                          ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    
  } catch (err) {
    console.error(`\n✗ 测试失败: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

testLoadDocument();
