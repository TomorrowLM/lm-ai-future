/**
 * 测试工具 - 使用带时间戳的 URL 绕过缓存
 */

import { handleSwaggerGetModelTool } from "./dist/server/base/swagger/index.js";

const baseUrl = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E6%A3%80%E6%9F%A5%E4%BB%BB%E5%8A%A1%E6%8E%A5%E5%8F%A3/pageUsingPOST_11";
const testSource = baseUrl + "?t=" + Date.now();

console.log("开始测试...");
console.log("URL:", testSource.substring(0, 80) + "...");

const mockRequest = {
  params: {
    arguments: {
      source: testSource,
      name: "pageUsingPOST_11"
    }
  }
};

try {
  const start = Date.now();
  const result = await handleSwaggerGetModelTool(mockRequest);
  const elapsed = Date.now() - start;
  
  console.log(`\n✅ 成功! 耗时: ${elapsed}ms`);
  
  if (result.content?.[0]) {
    const data = JSON.parse(result.content[0].text);
    if (data.operation) {
      console.log("\n接口:", data.operation.summary);
      console.log("路径:", data.operation.path);
      console.log("方法:", data.operation.method);
    }
  }
} catch (err) {
  console.error("\n❌ 失败:", err.message);
  process.exit(1);
}
