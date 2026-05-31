/**
 * Swagger/OpenAPI 文档处理工具（主入口）
 * 整合缓存管理、URL 解析、HTML 解析和远程加载
 */

import fs from "node:fs/promises";
import path from "node:path";
import { isHttpUrl, normalizeSource } from "@/utils/url.js";
import type { SwaggerGetModelArgs } from "@/server/base/swagger/types.js";
import {
  isValidSpec,
  getCachedDocument,
  setCachedDocument,
  readDiskCache,
  writeDiskCache,
} from "./cache.js";
import { parseFragment } from "./url-parser.js";
import { loadRemoteDocument } from "./remote-loader.js";

/**
 * 加载 Swagger/OpenAPI 文档（支持 HTTP URL 和本地文件路径）
 * - 支持 swagger-resources 自动发现
 * - 并行探测候选 URL 以减少等待
 * - 内存缓存避免重复拉取
 * - 优先级策略：HTML 解析 → 直接 API → swagger-resources → 并行探测
 */
export async function loadDocument(args: SwaggerGetModelArgs): Promise<any> {
  // 如果调用方显式传入了非空对象形式的 document，则使用它；空对象会被忽略以避免覆盖有效的远程文档加载
  if (args.document && typeof args.document === "object" && Object.keys(args.document).length > 0) {
    return args.document;
  }

  // ★ 第一优先级：URL 解析 - 从 URL fragment 中提取分组名/标签/操作标识
  const source = args.source !== undefined && args.source !== null && args.source.trim() !== ""
    ? normalizeSource(args.source)
    : "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/";

  if (!source || source.trim() === "") {
    throw new Error("get_swagger_mcp: 需要提供 source 或 document");
  }

  // 优先解析 URL fragment，提取分组信息用于后续缓存和加载策略
  const { fragmentGroup, fragmentTag, fragmentOperation } = parseFragment(String(source));

  // 查内存缓存：cacheKey 剔除 fragment（同站点同分组 → 仅拉取一次）
  const cacheKey = `${source.split("#")[0]}#group=${fragmentGroup ?? ""}`;
  const cachedDoc = getCachedDocument(cacheKey);
  console.log(`[MCP Swagger Debug] cacheKey = ${cacheKey}`,cacheKey);
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

  let doc: any;

  if (isHttpUrl(source)) {
    // 远程 URL：使用多级优先级策略加载
    doc = await loadRemoteDocument(source, fragmentGroup, fragmentOperation);
  } else {
    // 本地文件
    const filePath = path.isAbsolute(source) ? source : path.resolve(process.cwd(), source);
    const raw = await fs.readFile(filePath, "utf-8");
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) throw new Error(`get_swagger_mcp: 本地文件 ${filePath} 内容为空`);
    try {
      doc = JSON.parse(trimmed) as unknown;
    } catch (err: any) {
      throw new Error(
        `get_swagger_mcp: 解析本地 JSON 文件失败 ${filePath}: ${err?.message ?? String(err)}，文件预览: ${trimmed.slice(0,200)}`
      );
    }
  }

  // 写入内存缓存
  setCachedDocument(cacheKey, doc);
  
  // 后台写入磁盘缓存（仅 HTTP 源，本地文件无需），不阻塞返回
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
