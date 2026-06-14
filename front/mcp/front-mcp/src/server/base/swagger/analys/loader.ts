/**
 * Swagger/OpenAPI 文档加载器
 * 整合缓存管理、URL 解析、HTML 提取、远程多优先级加载
 */

import { isHttpUrl, normalizeSource } from "@/utils/url.js";
import type { SwaggerGetModelArgs } from "@/server/base/swagger/types.js";
import {
  isValidSpec,
  getCachedDocument,
  setCachedDocument,
  readDiskCache,
  writeDiskCache,
} from "./cache.js";
import { parseFragment, buildCandidateUrls, tryFetchJson } from "./url-parser.js";
import { loadAndParseHtmlPage } from "./html-parser.js";
import { logSwagger } from "@/server/base/swagger/utils/log.js";

// ── 从 swagger-resources 数组解析最终 JSON URL 并拉取 ─────────────────

export async function resolveFromSwaggerResources(
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
  return await tryFetchJson(resolvedUrl, 18000);
}

// ── 加载远程 HTTP Swagger 文档（多优先级策略）─────────────────────────

async function loadRemoteDocument(
  source: string,
  fragmentGroup?: string,
  fragmentOperation?: string,
): Promise<any> {
  const candidateInfo = buildCandidateUrls(source);

  if (!candidateInfo) {
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

  // 优先级1: 直接尝试 HTML 页面解析(支持 Swagger UI / Knife4j 页面)
  try {
    await logSwagger("优先级1: 尝试解析 HTML 页面 (Swagger UI / Knife4j)");
    const htmlDoc = await loadAndParseHtmlPage(source, baseUrl, fragmentGroup, fragmentOperation);
    if (htmlDoc && isValidSpec(htmlDoc)) {
      await logSwagger("✓ 优先级1 成功: 从 HTML 页面提取到完整 Swagger 文档");
      return htmlDoc;
    }
  } catch (err) {
    await logSwagger("优先级1 失败", { error: String(err) }, "warning");
  }
  await logSwagger("优先级1 失败", undefined, "warning");
  
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
    await logSwagger("优先级2: 直接尝试 API docs URLs", { urls: directUrls });
    const directResults = await Promise.allSettled(
      directUrls.map((url) => tryFetchJson(url, 15000))
    );
    for (const r of directResults) {
      if (r.status === "fulfilled" && isValidSpec(r.value)) {
        await logSwagger("✓ 优先级2 成功");
        return r.value;
      }
    }
  }

  // 优先级3: 尝试 swagger-resources 获取分组信息
  try {
    const swaggerResourcesUrl = new URL(`${baseUrl.pathname}swagger-resources`, baseUrl.origin).toString();
    await logSwagger("优先级3: 尝试 swagger-resources", { url: swaggerResourcesUrl });
    const resources = await tryFetchJson(swaggerResourcesUrl, 10000);

    if (Array.isArray(resources) && resources.length > 0) {
      await logSwagger(`swagger-resources 返回 ${resources.length} 项`, { count: resources.length });
      const resolved = await resolveFromSwaggerResources(resources, baseUrl, fragmentGroup, fragmentOperation);
      if (resolved && isValidSpec(resolved)) {
        await logSwagger("✓ 优先级3 成功");
        return resolved;
      }
    }
  } catch (err) {
    await logSwagger("优先级3 失败", { error: String(err) }, "warning");
  }

  // 优先级4: 并行探测其他候选 URL
  const PROBE_TIMEOUT = 3000;

  const results = await Promise.allSettled(
    probeUrls.map((url) => tryFetchJson(url, PROBE_TIMEOUT))
  );

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const doc = r.value;

    if (isValidSpec(doc)) return doc;

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

// ── 公开 API ──────────────────────────────────────────────────────────

/**
 * 加载 Swagger/OpenAPI 文档
 * - 优先级：传入对象 → 内存缓存 → 磁盘缓存 → 远程多策略加载
 */
export async function loadDocument(args: SwaggerGetModelArgs): Promise<any> {
  if (args.document && typeof args.document === "object" && Object.keys(args.document).length > 0) {
    return args.document;
  }

  const source = args.source !== undefined && args.source !== null && args.source.trim() !== ""
    ? normalizeSource(args.source)
    : "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/";

  if (!source || source.trim() === "") {
    throw new Error("get_swagger_mcp: 需要提供 source 或 document");
  }

  const { fragmentGroup, fragmentOperation } = parseFragment(String(source));

  // 查内存缓存：cacheKey 剔除 fragment（同站点同分组 → 仅拉取一次）
  const cacheKey = `${source.split("#")[0]}#group=${fragmentGroup ?? ""}`;
  const cachedDoc = getCachedDocument(cacheKey);
  // console.log(`[MCP Swagger Debug] cacheKey = ${cacheKey}`,cacheKey);
  if (cachedDoc) {
    return cachedDoc;
  }

  // 查磁盘缓存：跨会话复用，特别是 IDE MCP 超时后重试场景
  if (isHttpUrl(source)) {
    const diskDoc = await readDiskCache(cacheKey);
    if (diskDoc && isValidSpec(diskDoc)) {
      setCachedDocument(cacheKey, diskDoc);
      return diskDoc;
    }
  }

  const doc = await loadRemoteDocument(source, fragmentGroup, fragmentOperation);

  // 写入内存缓存
  setCachedDocument(cacheKey, doc);

  // 后台写入磁盘缓存（仅 HTTP 源），不阻塞返回
  if (isHttpUrl(source) && isValidSpec(doc)) {
    void writeDiskCache(cacheKey, doc);
  }

  return doc;
}

/**
 * 从 Swagger/OpenAPI 文档中提取模型定义根节点
 */
export function getSchemasRoot(doc: any): Record<string, any> {
  if (doc?.openapi && doc?.components?.schemas && typeof doc.components.schemas === "object") {
    return doc.components.schemas;
  }
  if (doc?.swagger === "2.0" && doc?.definitions && typeof doc.definitions === "object") {
    return doc.definitions;
  }
  if (doc?.components?.schemas && typeof doc.components.schemas === "object") {
    return doc.components.schemas;
  }
  if (doc?.definitions && typeof doc.definitions === "object") {
    return doc.definitions;
  }
  return {};
}
