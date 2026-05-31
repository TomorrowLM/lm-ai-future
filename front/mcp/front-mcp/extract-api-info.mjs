/**
 * 从 Swagger JSON 中提取接口详细信息
 * 包括：接口名称、API路径、请求方式、请求参数、响应参数
 */

import { loadDocument, findOperationByKeyword, extractOperationIO, resolveSchemaNode } from "./dist/server/base/swagger/utils/index.js";

const testUrl = "https://api-test.17an.com/dsb/yqarw/api/doc.html#/%E4%BB%BB%E5%8A%A1%E7%AE%A1%E7%90%86/%E5%9F%8E%E5%B8%82%E7%AE%A1%E7%90%86-%E6%A3%80%E6%9F%A5%E4%BB%BB%E5%8A%A1%E6%8E%A5%E5%8F%A3/pageUsingPOST_11";

console.log("=".repeat(80));
console.log("接口详细信息提取");
console.log("=".repeat(80));

try {
  // 1. 加载文档
  const doc = await loadDocument({ source: testUrl });
  console.log("\n✅ 文档加载成功\n");
  
  // 2. 查找目标接口
  const keyword = "pageUsingPOST_11";
  const operation = findOperationByKeyword(doc, keyword);
  
  if (!operation) {
    console.log("❌ 未找到接口");
    process.exit(1);
  }
  
  // 3. 提取接口的输入输出
  const io = extractOperationIO(doc, operation);
  
  // 4. 解析请求体和响应体的完整 schema
  const maxDepth = 10;
  const requestSchema = io.request.body 
    ? resolveSchemaNode({ doc, node: io.request.body, depth: maxDepth, seenRefs: new Set() })
    : null;
    
  const responseSchema = io.response.body
    ? resolveSchemaNode({ doc, node: io.response.body, depth: maxDepth, seenRefs: new Set() })
    : null;
  
  // 5. 格式化输出
  console.log("📋 接口基本信息");
  console.log("-".repeat(80));
  console.log(`接口名称: ${io.operation.summary || io.operation.operationId}`);
  console.log(`API 路径: ${io.operation.path}`);
  console.log(`请求方式: ${io.operation.method.toUpperCase()}`);
  console.log(`操作 ID: ${io.operation.operationId}`);
  console.log(`标签: ${(io.operation.tags || []).join(', ')}`);
  
  // 6. 请求参数
  console.log("\n📥 请求参数");
  console.log("-".repeat(80));
  
  if (io.request.parameters && io.request.parameters.length > 0) {
    io.request.parameters.forEach((param, idx) => {
      console.log(`${idx + 1}. ${param.name}`);
      console.log(`   说明: ${param.description || '-'}`);
      console.log(`   位置: ${param.in}`);
      console.log(`   必须: ${param.required ? '是' : '否'}`);
      console.log(`   类型: ${param.schema?.type || param.type || '-'}`);
      console.log('');
    });
  }
  
  if (requestSchema) {
    console.log('请求体 Schema:');
    printSchemaProperties(requestSchema, '   ', 0, 3);
  }
  
  // 7. 响应参数
  console.log("\n📤 响应参数");
  console.log("-".repeat(80));
  console.log(`状态码: ${io.response.code}`);
  
  if (responseSchema) {
    console.log('响应体 Schema:');
    printSchemaProperties(responseSchema, '   ', 0, 3);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ 提取完成");
  console.log("=".repeat(80));
  
} catch (error) {
  console.error("\n❌ 失败:", error.message);
  console.error(error.stack);
  process.exit(1);
}

/**
 * 打印 Schema 的属性（递归，限制深度）
 */
function printSchemaProperties(schema, indent = '', depth = 0, maxDepth = 3) {
  if (depth > maxDepth || !schema || typeof schema !== 'object') return;
  
  if (schema.type === 'object' && schema.properties) {
    const required = schema.required || [];
    
    Object.entries(schema.properties).forEach(([key, value]) => {
      const isRequired = required.includes(key);
      const type = value.type || (value.$ref ? value.$ref.split('/').pop() : 'object');
      const description = value.description || '';
      
      console.log(`${indent}├─ ${key}${isRequired ? ' *' : ''}`);
      console.log(`${indent}│  类型: ${type}`);
      if (description) {
        console.log(`${indent}│  说明: ${description}`);
      }
      
      // 递归打印嵌套对象
      if (value.type === 'object' && value.properties && depth < maxDepth) {
        printSchemaProperties(value, indent + '│  ', depth + 1, maxDepth);
      }
      
      // 处理数组类型
      if (value.type === 'array' && value.items) {
        if (value.items.type === 'object' && value.items.properties) {
          console.log(`${indent}│  数组元素:`);
          printSchemaProperties(value.items, indent + '│  ', depth + 1, maxDepth);
        } else {
          console.log(`${indent}│  数组类型: ${value.items.type || 'object'}`);
        }
      }
      
      console.log('');
    });
  } else if (schema.allOf) {
    // 处理 allOf 组合
    schema.allOf.forEach((part, idx) => {
      console.log(`${indent}├─ [组合 ${idx + 1}]`);
      printSchemaProperties(part, indent + '│  ', depth + 1, maxDepth);
    });
  }
}
