/**
 * 验证 get_swagger_mcp 工具的实际功能
 * 模拟完整的工具调用流程
 */

import { handleSwaggerGetModelTool } from "../dist/server/base/swagger/index.js";

const testSource = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E6%A3%80%E6%9F%A5%E4%BB%BB%E5%8A%A1%E6%8E%A5%E5%8F%A3/pageUsingPOST_11";

console.log("=".repeat(80));
console.log("验证 get_swagger_mcp 工具功能");
console.log("=".repeat(80));
console.log("\n测试 URL:", testSource);
console.log("");

// 模拟 MCP 工具调用请求
const mockRequest = {
  params: {
    arguments: {
      source: testSource,
      name: "pageUsingPOST_11"  // 从 fragment 中提取的操作 ID
    }
  }
};

try {
  console.log("开始调用 handleSwaggerGetModelTool...");
  const startTime = Date.now();
  
  const result = await handleSwaggerGetModelTool(mockRequest);
  const elapsed = Date.now() - startTime;
  
  console.log(`\n✅ 成功! 耗时: ${elapsed}ms`);
  console.log("\n返回结果预览:");
  
  // 解析并显示结果
  if (result.content && result.content[0]) {
    const data = JSON.parse(result.content[0].text);
    
    if (data.match === "operation") {
      console.log("\n 接口信息:");
      console.log(`  名称: ${data.operation?.summary || data.keyword}`);
      console.log(`  路径: ${data.operation?.path}`);
      console.log(`  方法: ${data.operation?.method?.toUpperCase()}`);
      console.log(`  操作ID: ${data.operation?.operationId}`);
      console.log(`  标签: ${(data.operation?.tags || []).join(', ')}`);
      
      console.log("\n📥 请求参数:");
      if (data.request?.parameters?.length > 0) {
        data.request.parameters.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (${p.in}) - ${p.schema?.type || p.type || 'unknown'}`);
        });
      }
      if (data.request?.body) {
        console.log(`  Body: ${data.request.body.type || 'object'}`);
      }
      
      console.log("\n📤 响应参数:");
      console.log(`  状态码: ${data.response?.code}`);
      if (data.response?.body) {
        console.log(`  Body: ${data.response.body.type || 'object'}`);
      }
    } else {
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ 验证完成 - 工具功能正常");
  console.log("=".repeat(80));
  
} catch (error) {
  console.error("\n 验证失败:", error.message);
  console.error(error.stack);
  process.exit(1);
}
