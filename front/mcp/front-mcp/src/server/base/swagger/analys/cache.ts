/**
 * Swagger 文档缓存管理
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

// ── 文档缓存（避免同一会话内重复拉取大 JSON）────────────────────────
const documentCache = new Map<string, { doc: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

// 磁盘持久化缓存：跨会话 / 避免 IDE MCP 超时重试反复拉取
const DISK_CACHE_DIR = path.join(os.tmpdir(), "lm-mcp-swagger-cache");
const DISK_CACHE_TTL = 60 * 60 * 1000; // 1 小时

export function hashKey(key: string): string {
  return crypto.createHash("sha1").update(key).digest("hex");
}

export async function readDiskCache(cacheKey: string): Promise<any | undefined> {
  try {
    const file = path.join(DISK_CACHE_DIR, `${hashKey(cacheKey)}.json`);
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > DISK_CACHE_TTL) return undefined;
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function writeDiskCache(cacheKey: string, doc: any): Promise<void> {
  try {
    await fs.mkdir(DISK_CACHE_DIR, { recursive: true });
    const file = path.join(DISK_CACHE_DIR, `${hashKey(cacheKey)}.json`);
    await fs.writeFile(file, JSON.stringify(doc), "utf-8");
  } catch (err) {
    void err;
  }
}

/**
 * 验证文档是否为有效的 Swagger/OpenAPI 规范
 */
export function isValidSpec(doc: any): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (typeof doc.openapi === "string") return true;
  if (doc.swagger === "2.0") return true;
  if (doc.components?.schemas && typeof doc.components.schemas === "object") return true;
  if (doc.definitions && typeof doc.definitions === "object") return true;
  return false;
}

/**
 * 获取缓存的文档
 */
export function getCachedDocument(cacheKey: string): any | undefined {
  const cached = documentCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.doc;
  }
  return undefined;
}

/**
 * 设置缓存文档
 */
export function setCachedDocument(cacheKey: string, doc: any): void {
  documentCache.set(cacheKey, { doc, timestamp: Date.now() });
}

/**
 * 清空缓存
 */
export function clearCache(): void {
  documentCache.clear();
}
