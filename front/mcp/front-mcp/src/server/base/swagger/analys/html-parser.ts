/**
 * HTML 页面解析器
 * 从 knife4j/swagger-ui 的 HTML 页面中提取 Swagger JSON 数据
 */

import { isValidSpec } from "./cache.js";
import { tryFetchJson } from "./url-parser.js";
import { resolveFromSwaggerResources } from "./loader.js";
import { logSwagger } from "@/server/base/swagger/utils/log.js";

// ── 从 HTML 页面中提取 Swagger JSON 数据（优化版）─────────────────────
// 支持多种策略：全局变量、script 标签、内联配置等

export async function extractSwaggerFromHtml(
  html: string, 
  baseUrl: URL, 
  fragmentGroup?: string, 
  fragmentOperation?: string
): Promise<any> {
  // await logSwagger("开始从 HTML 解析 Swagger 数据");

  // 策略 1: 从 window.swaggerResources 提取（Knife4j 最常见）
  try {
    const swaggerResMatch = html.match(/window\.swaggerResources\s*=\s*(\[[\s\S]*?\]);?/i);
    if (swaggerResMatch) {
      // await logSwagger("发现 window.swaggerResources");
      const data = JSON.parse(swaggerResMatch[1]);
      if (Array.isArray(data)) {
        // await logSwagger(`swaggerResources 数组共 ${data.length} 项`, { count: data.length });
        const resolved = await resolveFromSwaggerResources(data, baseUrl, fragmentGroup, fragmentOperation);
        if (resolved && isValidSpec(resolved)) {
          // await logSwagger("✓ 从 swaggerResources 成功提取");
          return resolved;
        }
      }
    }
  } catch (err) {
    // await logSwagger("swaggerResources 解析失败", { error: String(err) }, "warning");
  }

  // 策略 2: 从 window.config 或类似配置对象提取
  try {
    const configMatch = html.match(/window\.config\s*=\s*({[\s\S]*?});?/i);
    if (configMatch) {
      const data = JSON.parse(configMatch[1]);
      if (data?.url) {
        const resolvedUrl = new URL(data.url, baseUrl).toString();
        // await logSwagger(`从 window.config 提取到 URL`, { url: resolvedUrl });
        const resolved = await tryFetchJson(resolvedUrl, 18000);
        if (isValidSpec(resolved)) {
          // await logSwagger("✓ 从 window.config 成功提取");
          return resolved;
        }
      }
    }
  } catch (err) {
    // await logSwagger("window.config 解析失败", { error: String(err) }, "warning");
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
        // await logSwagger(`发现 API URL`, { url: fullUrl });
        const doc = await tryFetchJson(fullUrl, 18000);
        if (isValidSpec(doc)) {
          // await logSwagger("✓ 从 URL 配置成功提取");
          return doc;
        }
      }
    }
  } catch (err) {
    // await logSwagger("URL 配置解析失败", { error: String(err) }, "warning");
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
          // await logSwagger("✓ 从 script 标签提取到完整 JSON");
          return json;
        }
      }
    }
  } catch (err) {
    // await logSwagger("script 标签解析失败", { error: String(err) }, "warning");
  }

  // await logSwagger("未找到有效数据", undefined, "warning");
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
  // await logSwagger(`开始加载 HTML 页面`, { url: source });

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
    // await logSwagger("HTML 页面加载成功", { size: html.length });

    // 2. 尝试从 HTML 中提取 Swagger JSON URL
    const swaggerDoc = await extractSwaggerFromHtml(html, baseUrl, fragmentGroup, fragmentOperation);
    if (swaggerDoc && isValidSpec(swaggerDoc)) {
      // await logSwagger("✓ 从 HTML 页面成功提取 Swagger 文档");
      return swaggerDoc;
    }

    // 3. 如果提取失败，尝试直接构造 Swagger JSON URL 并返回一个简化文档
    if (fragmentGroup && fragmentOperation) {
      // await logSwagger("尝试构造 Swagger JSON URL");
      const groupEncoded = encodeURIComponent(fragmentGroup);
      const swaggerJsonUrl = new URL(`${baseUrl.pathname}v3/api-docs?group=${groupEncoded}`, baseUrl.origin).toString();
      
      try {
        const doc = await tryFetchJson(swaggerJsonUrl, 15000);
        if (isValidSpec(doc)) {
          // await logSwagger("✓ 成功获取 Swagger JSON 文档");
          return doc;
        }
      } catch (err) {
        // await logSwagger("Swagger JSON 获取失败", { error: String(err) }, "warning");
      }
    }

    // await logSwagger("无法从 HTML 页面提取接口信息", undefined, "warning");
    return null;

  } catch (err) {
    // await logSwagger("HTML 页面加载失败", { error: String(err) }, "error");
    return null;
  }
}
