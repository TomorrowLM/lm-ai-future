/**
 * 绕过缓存测试执行路径
 */

// 直接调用 loadRemoteDocument 函数，绕过缓存层
import fs from "node:fs/promises";

// 动态导入并清除缓存
const documentModule = await import("./dist/server/base/swagger/utils/document.js");

const testUrl = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E6%A3%80%E6%9F%A5%E4%BB%BB%E5%8A%A1%E6%8E%A5%E5%8F%A3/pageUsingPOST_11";

console.log("=".repeat(70));
console.log("测试执行路径 - 使用带时间戳的 URL 绕过缓存");
console.log("=".repeat(70));

// 添加时间戳参数绕过缓存
const urlWithTimestamp = testUrl + "?t=" + Date.now();

try {
  const doc = await documentModule.loadDocument({ source: urlWithTimestamp });
  console.log("\n✅ 成功!");
  console.log("版本:", doc.openapi || doc.swagger);
} catch (error) {
  console.error("\n❌ 失败:", error.message);
}
