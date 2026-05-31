/**
 * 远程文档加载器
 * 负责从远程 URL 加载 Swagger/OpenAPI 文档，支持多种策略和优先级
 */

import { isValidSpec } from "./cache.js";
import { buildCandidateUrls, tryFetchJson, parseFragment } from "./url-parser.js";
import { loadAndParseHtmlPage } from "./html-parser.js";

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

// ── 加载远程 HTTP Swagger 文档（并行探测候选 URL）─────────────────────

export async function loadRemoteDocument(
  source: string,
  fragmentGroup?: string,
  fragmentOperation?: string,
): Promise<any> {
  // 如果是 doc.html 类 URL，跳过直接 JSON 拉取（已知返回 HTML），直接并行探测
  const candidateInfo = buildCandidateUrls(source);

  if (!candidateInfo) {
    // 非 doc.html URL：直接尝试作为 JSON 拉取（适配直链 JSON 地址）
    try {
      const doc = await tryFetchJson(source, 8000);
      if (isValidSpec(doc)) return doc;
    } catch {
      // fallthrough
    }
    throw new Error(
      `get_swagger_mcp: 无法从该 URL 获取可解析的 Swagger/OpenAPI JSON。` +
      `请传入 JSON 文档地址（如 /v2/api-docs 或 /v3/api-docs），当前: ${source}`
    );
  }

  const { baseUrl, urls: probeUrls } = candidateInfo;

  // ★ 优先级1：尝试直接解析 HTML 页面获取接口信息
  if (fragmentOperation) {
    try {
      console.error(`[MCP Swagger] 优先级1: 尝试直接解析 HTML 页面获取接口信息`);
      const htmlDoc = await loadAndParseHtmlPage(source, baseUrl, fragmentGroup, fragmentOperation);
      if (htmlDoc && isValidSpec(htmlDoc)) {
        console.error(`[MCP Swagger] ✓ 优先级1 成功: 从 HTML 页面提取到接口数据`);
        return htmlDoc;
      }
    } catch (err) {
      console.error(`[MCP Swagger] 优先级1 失败:`, err);
    }
  }

  // 优先级2：已知分组名，直接拉取 v3/v2 api-docs?group=xxx
  if (fragmentGroup) {
    const groupEncoded = encodeURIComponent(fragmentGroup);
    const basePath = baseUrl.pathname;
    const directUrls = [
      new URL(`${basePath}v3/api-docs?group=${groupEncoded}`, baseUrl.origin).toString(),
      new URL(`${basePath}v2/api-docs?group=${groupEncoded}`, baseUrl.origin).toString(),
      new URL(`v3/api-docs?group=${groupEncoded}`, baseUrl).toString(),
      new URL(`v2/api-docs?group=${groupEncoded}`, baseUrl).toString(),
    ];
    console.error(`[MCP Swagger Debug] 优先级2: 直接尝试 API docs URLs:`, directUrls);
    const directResults = await Promise.allSettled(
      directUrls.map((url) => tryFetchJson(url, 15000))
    );
    for (const r of directResults) {
      if (r.status === "fulfilled" && isValidSpec(r.value)) {
        console.error(`[MCP Swagger Debug] ✓ 优先级2 成功`);
        return r.value;
      }
    }
  }

  // 优先级3: 尝试 swagger-resources 获取分组信息
  try {
    const swaggerResourcesUrl = new URL(`${baseUrl.pathname}swagger-resources`, baseUrl.origin).toString();
    console.error(`[MCP Swagger Debug] 优先级3: 尝试 swagger-resources:`, swaggerResourcesUrl);
    const resources = await tryFetchJson(swaggerResourcesUrl, 10000);
    
    if (Array.isArray(resources) && resources.length > 0) {
      console.error(`[MCP Swagger Debug] swagger-resources 返回 ${resources.length} 项`);
      const resolved = await resolveFromSwaggerResources(resources, baseUrl, fragmentGroup, fragmentOperation);
      if (resolved && isValidSpec(resolved)) {
        console.error(`[MCP Swagger Debug] ✓ 优先级3 成功`);
        return resolved;
      }
    }
  } catch (err) {
    console.error(`[MCP Swagger Debug] 优先级3 失败:`, err);
  }

  // 优先级4: 并行探测其他候选 URL
  const PROBE_TIMEOUT = 3000; // 探测阶段短超时（404/502 通常 <1s 返回）

  const results = await Promise.allSettled(
    probeUrls.map((url) => tryFetchJson(url, PROBE_TIMEOUT))
  );

  // 并行处理所有成功结果
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const doc = r.value;

    // 命中有效规范 → 立即返回
    if (isValidSpec(doc)) return doc;

    // 命中 swagger-resources 数组 → 解析并拉取真实 JSON
    if (Array.isArray(doc)) {
      try {
        const resolved = await resolveFromSwaggerResources(doc, baseUrl, fragmentGroup, fragmentOperation);
        if (resolved && isValidSpec(resolved)) return resolved;
      } catch {
        // fallthrough
      }
    }
  }

  throw new Error(
    `get_swagger_mcp: 无法从该 URL 获取可解析的 Swagger/OpenAPI JSON。` +
    `请传入 JSON 文档地址（如 /v2/api-docs 或 /v3/api-docs），当前: ${source}`
  );
}
