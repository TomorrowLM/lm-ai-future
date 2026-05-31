/**
 * HTML 页面解析器
 * 从 knife4j/swagger-ui 的 HTML 页面中提取 Swagger JSON 数据
 */

import { isValidSpec } from "./cache.js";
import { tryFetchJson } from "./url-parser.js";

// ── 从 swagger-resources 数组解析最终 JSON URL 并拉取 ─────────────────

async function resolveFromSwaggerResources(
  resources: any[],
  baseUrl: URL,
  fragmentGroup?: string,
  fragmentOperation?: string,
): Promise<any> {
  let match: any;

  if (fragmentGroup) {
    const g = fragmentGroup.toLowerCase();
    match = resources.find((item: any) => {
      if (!item) return false;
      const n = String(item.name ?? item.title ?? "").toLowerCase();
      const u = String(item.url ?? "").toLowerCase();
      return n.includes(g) || u.includes(encodeURIComponent(g)) || u.includes(g);
    });
  }

  if (!match && fragmentOperation) {
    const op = fragmentOperation.toLowerCase();
    match = resources.find((item: any) => {
      const n = String(item.name ?? item.title ?? "").toLowerCase();
      const u = String(item.url ?? "").toLowerCase();
      return n.includes(op) || u.includes(encodeURIComponent(op)) || u.includes(op);
    });
  }

  const target = match ?? resources.find((item: any) => item && typeof item.url === "string");
  if (!target?.url) return undefined;

  const resolvedUrl = new URL(String(target.url).replace(/^\//, ""), baseUrl).toString();
  // 拉取实际 JSON，使用 18s 超时（配合探测阶段 3s，总耗时应 < IDE MCP 约 25s 的限制）
  return await tryFetchJson(resolvedUrl, 18000);
}

// ── 从 HTML 页面中提取 Swagger JSON 数据（优化版）─────────────────────
// 支持多种策略：全局变量、script 标签、内联配置等

export async function extractSwaggerFromHtml(
  html: string, 
  baseUrl: URL, 
  fragmentGroup?: string, 
  fragmentOperation?: string
): Promise<any> {
  console.error(`[MCP Swagger HTML] 开始从 HTML 解析 Swagger 数据`);

  // 策略 1: 从 window.swaggerResources 提取（Knife4j 最常见）
  try {
    const swaggerResMatch = html.match(/window\.swaggerResources\s*=\s*(\[[\s\S]*?\]);?/i);
    if (swaggerResMatch) {
      console.error(`[MCP Swagger HTML] 发现 window.swaggerResources`);
      const data = JSON.parse(swaggerResMatch[1]);
      if (Array.isArray(data)) {
        console.error(`[MCP Swagger HTML] swaggerResources 数组共 ${data.length} 项`);
        const resolved = await resolveFromSwaggerResources(data, baseUrl, fragmentGroup, fragmentOperation);
        if (resolved && isValidSpec(resolved)) {
          console.error(`[MCP Swagger HTML] ✓ 从 swaggerResources 成功提取`);
          return resolved;
        }
      }
    }
  } catch (err) {
    console.error(`[MCP Swagger HTML] swaggerResources 解析失败:`, err);
  }

  // 策略 2: 从 window.config 或类似配置对象提取
  try {
    const configMatch = html.match(/window\.config\s*=\s*({[\s\S]*?});?/i);
    if (configMatch) {
      const data = JSON.parse(configMatch[1]);
      if (data?.url) {
        const resolvedUrl = new URL(data.url, baseUrl).toString();
        console.error(`[MCP Swagger HTML] 从 window.config 提取到 URL: ${resolvedUrl}`);
        const resolved = await tryFetchJson(resolvedUrl, 18000);
        if (isValidSpec(resolved)) {
          console.error(`[MCP Swagger HTML] ✓ 从 window.config 成功提取`);
          return resolved;
        }
      }
    }
  } catch (err) {
    console.error(`[MCP Swagger HTML] window.config 解析失败:`, err);
  }

  // 策略 3: 从 JavaScript 代码中提取 URL 配置
  try {
    const urlPatterns = [
      /url\s*:\s*["'](\/[^"']*api-docs[^"']*?)["']/i,
      /swaggerUrl\s*[:=]\s*["']([^"']+?)["']/i,
      /apiDocsUrl\s*[:=]\s*["']([^"']+?)["']/i,
    ];

    for (const pattern of urlPatterns) {
      const urlMatch = html.match(pattern);
      if (urlMatch) {
        const endpoint = urlMatch[1];
        const fullUrl = new URL(endpoint, baseUrl).toString();
        console.error(`[MCP Swagger HTML] 发现 API URL: ${fullUrl}`);
        const doc = await tryFetchJson(fullUrl, 18000);
        if (isValidSpec(doc)) {
          console.error(`[MCP Swagger HTML] ✓ 从 URL 配置成功提取`);
          return doc;
        }
      }
    }
  } catch (err) {
    console.error(`[MCP Swagger HTML] URL 配置解析失败:`, err);
  }

  // 策略 4: 从 <script> 标签中提取完整 JSON 对象
  try {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const scriptContent = scriptMatch[1];
      // 查找包含 Swagger 关键字的 JSON
      const jsonMatch = scriptContent.match(/({[\s\S]*?(?:"openapi"\s*:\s*"[^"]*"|"swagger"\s*:\s*"2\.0")[\s\S]*?"paths"[\s\S]*?})/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        if (isValidSpec(json)) {
          console.error(`[MCP Swagger HTML] ✓ 从 script 标签提取到完整 JSON`);
          return json;
        }
      }
    }
  } catch (err) {
    console.error(`[MCP Swagger HTML] script 标签解析失败:`, err);
  }

  console.error(`[MCP Swagger HTML] 未找到有效数据`);
  return null;
}

// ── 直接从 HTML 页面加载并解析接口信息（新策略）─────────────────────
// 这是优先级最高的策略：先尝试获取 HTML 页面，提取接口信息

export async function loadAndParseHtmlPage(
  source: string,
  baseUrl: URL,
  fragmentGroup?: string,
  fragmentOperation?: string
): Promise<any> {
  console.error(`[MCP Swagger HTML Page] 开始加载 HTML 页面: ${source}`);

  try {
    // 1. 获取 HTML 页面内容
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let response: Response;
    try {
      response = await fetch(source, {
        signal: controller.signal,
        headers: { 
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate"
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.error(`[MCP Swagger HTML Page] HTML 页面加载成功，大小: ${html.length} bytes`);

    // 2. 尝试从 HTML 中提取 Swagger JSON URL
    const swaggerDoc = await extractSwaggerFromHtml(html, baseUrl, fragmentGroup, fragmentOperation);
    if (swaggerDoc && isValidSpec(swaggerDoc)) {
      console.error(`[MCP Swagger HTML Page] ✓ 从 HTML 页面成功提取 Swagger 文档`);
      return swaggerDoc;
    }

    // 3. 如果提取失败，尝试直接构造 Swagger JSON URL 并返回一个简化文档
    if (fragmentGroup && fragmentOperation) {
      console.error(`[MCP Swagger HTML Page] 尝试构造 Swagger JSON URL`);
      const groupEncoded = encodeURIComponent(fragmentGroup);
      const swaggerJsonUrl = new URL(`${baseUrl.pathname}v3/api-docs?group=${groupEncoded}`, baseUrl.origin).toString();
      
      try {
        const doc = await tryFetchJson(swaggerJsonUrl, 15000);
        if (isValidSpec(doc)) {
          console.error(`[MCP Swagger HTML Page] ✓ 成功获取 Swagger JSON 文档`);
          return doc;
        }
      } catch (err) {
        console.error(`[MCP Swagger HTML Page] Swagger JSON 获取失败:`, err);
      }
    }

    console.error(`[MCP Swagger HTML Page] 无法从 HTML 页面提取接口信息`);
    return null;

  } catch (err) {
    console.error(`[MCP Swagger HTML Page] HTML 页面加载失败:`, err);
    return null;
  }
}
