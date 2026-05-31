/**
 * 测试并查看走的是哪条路径
 */

import { loadDocument } from "./dist/server/base/swagger/utils/document.js";

const testUrl = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E6%A3%80%E6%9F%A5%E4%BB%BB%E5%8A%A1%E6%8E%A5%E5%8F%A3/pageUsingPOST_11";

console.log("=".repeat(60));
console.log("开始测试 - 查看实际执行路径");
console.log("=".repeat(60));
console.log("URL:", testUrl);
console.log("=".repeat(60));
console.log("");

try {
  const doc = await loadDocument({ source: testUrl });
  console.log("");
  console.log("=".repeat(60));
  console.log("✅ 成功获取文档!");
  console.log("=".repeat(60));
  console.log("OpenAPI 版本:", doc.openapi || doc.swagger);
  console.log("路径数量:", Object.keys(doc.paths || {}).length);
  console.log("");
} catch (error) {
  console.error("\n❌ 测试失败:", error.message);
  process.exit(1);
}
