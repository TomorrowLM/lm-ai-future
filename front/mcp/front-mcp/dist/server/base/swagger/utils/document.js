/**
 * Swagger/OpenAPI 文档处理工具
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { isHttpUrl, normalizeSource } from "../../../../utils/url.js";
// ── 文档缓存（避免同一会话内重复拉取大 JSON）────────────────────────
const documentCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟
// 磁盘持久化缓存：跨会话 / 避免 IDE MCP 超时重试反复拉取
const DISK_CACHE_DIR = path.join(os.tmpdir(), "lm-mcp-swagger-cache");
const DISK_CACHE_TTL = 60 * 60 * 1000; // 1 小时
function hashKey(key) {
    return crypto.createHash("sha1").update(key).digest("hex");
}
async function readDiskCache(cacheKey) {
    try {
        const file = path.join(DISK_CACHE_DIR, `${hashKey(cacheKey)}.json`);
        const stat = await fs.stat(file);
        if (Date.now() - stat.mtimeMs > DISK_CACHE_TTL)
            return undefined;
        const raw = await fs.readFile(file, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
async function writeDiskCache(cacheKey, doc) {
    try {
        await fs.mkdir(DISK_CACHE_DIR, { recursive: true });
        const file = path.join(DISK_CACHE_DIR, `${hashKey(cacheKey)}.json`);
        await fs.writeFile(file, JSON.stringify(doc), "utf-8");
    }
    catch (err) {
        void err;
    }
}
/**
 * 验证文档是否为有效的 Swagger/OpenAPI 规范
 */
function isValidSpec(doc) {
    if (!doc || typeof doc !== "object")
        return false;
    if (typeof doc.openapi === "string")
        return true;
    if (doc.swagger === "2.0")
        return true;
    if (doc.components?.schemas && typeof doc.components.schemas === "object")
        return true;
    if (doc.definitions && typeof doc.definitions === "object")
        return true;
    return false;
}
/**
 * 尝试从 URL 获取 JSON 文档
 */
async function tryFetchJson(url, timeoutMs = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
        response = await fetch(url, {
            signal: controller.signal,
            headers: { "Accept-Encoding": "gzip, deflate" },
        });
    }
    finally {
        clearTimeout(timeoutId);
    }
    if (!response.ok) {
        throw new Error(`get_swagger_mcp: 拉取失败 ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    const trimmed = String(text ?? "").trim();
    if (!trimmed) {
        throw new Error(`get_swagger_mcp: 从 ${url} 获取到空响应`);
    }
    const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
    // 如果返回的不是 application/json 且内容看起来也不是 JSON，尝试从文本中提取首个 JSON 对象/数组
    if (!contentType.includes("application/json") && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        const m = trimmed.match(/({[\s\S]*}\s*)|(\[[\s\S]*][\s\S]*)/);
        if (m && m[0]) {
            try {
                return JSON.parse(m[0]);
            }
            catch (err) {
                // fallthrough to throw below with preview
                void err;
            }
        }
        throw new Error(`get_swagger_mcp: URL 返回非 JSON 内容 (content-type: ${contentType || "unknown"})，URL: ${url}，响应预览: ${trimmed.slice(0, 200)}`);
    }
    try {
        const json = JSON.parse(trimmed);
        return json;
    }
    catch (err) {
        throw new Error(`get_swagger_mcp: JSON 解析失败 ${url}: ${err?.message ?? String(err)}，响应预览: ${trimmed.slice(0, 200)}`);
    }
}
// ── doc.html URL → 候选探测 URL（swagger-resources 优先）────────────────
function buildCandidateUrls(source) {
    try {
        const inputUrl = new URL(source);
        inputUrl.hash = "";
        const pathname = inputUrl.pathname.replace(/\/+$/, "");
        const isDocHtml = /\/doc\.html$/i.test(pathname) || /\/swagger-ui\.html$/i.test(pathname);
        if (!isDocHtml)
            return null;
        const basePath = pathname.replace(/\/(doc\.html|swagger-ui\.html)$/i, "/");
        const baseUrl = new URL(inputUrl.toString());
        baseUrl.pathname = basePath;
        baseUrl.search = "";
        // swagger-resources 排首位：knife4j 等框架下响应最快、信息量最大
        const urls = [
            new URL("v3/api-docs", baseUrl).toString(),
            new URL("v2/api-docs", baseUrl).toString(),
            new URL("swagger-resources", baseUrl).toString(),
        ];
        return { baseUrl, urls };
    }
    catch {
        return null;
    }
}
// ── 从 swagger-resources 数组解析最终 JSON URL 并拉取 ─────────────────
async function resolveFromSwaggerResources(resources, baseUrl, fragmentGroup, fragmentOperation) {
    let match;
    if (fragmentGroup) {
        const g = fragmentGroup.toLowerCase();
        match = resources.find((item) => {
            if (!item)
                return false;
            const n = String(item.name ?? item.title ?? "").toLowerCase();
            const u = String(item.url ?? "").toLowerCase();
            return n.includes(g) || u.includes(encodeURIComponent(g)) || u.includes(g);
        });
    }
    if (!match && fragmentOperation) {
        const op = fragmentOperation.toLowerCase();
        match = resources.find((item) => {
            const n = String(item.name ?? item.title ?? "").toLowerCase();
            const u = String(item.url ?? "").toLowerCase();
            return n.includes(op) || u.includes(encodeURIComponent(op)) || u.includes(op);
        });
    }
    const target = match ?? resources.find((item) => item && typeof item.url === "string");
    if (!target?.url)
        return undefined;
    const resolvedUrl = new URL(String(target.url).replace(/^\//, ""), baseUrl).toString();
    // 拉取实际 JSON，使用 18s 超时（配合探测阶段 3s，总耗时应 < IDE MCP 约 25s 的限制）
    return await tryFetchJson(resolvedUrl, 18000);
}
// ── 从 URL fragment 中提取分组名/标签/操作标识 ─────────────────────────
// knife4j 的 doc.html 路径形如：#/{group}/{tag}/{operationId}
// 例：#/任务管理/城市管理-检查任务接口/pageUsingPOST_11
//      group  = 任务管理
//      tag    = 城市管理-检查任务接口
//      opId   = pageUsingPOST_11
function parseFragment(source) {
    try {
        if (!source.includes("#"))
            return {};
        const frag = source.split("#")[1] ?? "";
        const parts = frag.split("/").filter(Boolean).map((p) => {
            try {
                return decodeURIComponent(p);
            }
            catch {
                return p;
            }
        });
        if (parts.length === 0)
            return {};
        if (parts.length === 1) {
            // 仅一段，无法判断含义，视为操作标识
            return { fragmentOperation: parts[0] };
        }
        if (parts.length === 2) {
            // 两段：约定第一段为分组，第二段为操作
            return { fragmentGroup: parts[0], fragmentOperation: parts[1] };
        }
        // 三段及以上：首段=分组，末段=操作，中间合并为 tag
        return {
            fragmentGroup: parts[0],
            fragmentTag: parts.slice(1, -1).join("/"),
            fragmentOperation: parts[parts.length - 1],
        };
    }
    catch {
        return {};
    }
}
// ── 从 HTML 页面中提取 Swagger JSON 数据（优化版）─────────────────────
// 支持多种策略：全局变量、script 标签、内联配置等
async function extractSwaggerFromHtml(html, baseUrl, fragmentGroup, fragmentOperation) {
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
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    catch (err) {
        console.error(`[MCP Swagger HTML] script 标签解析失败:`, err);
    }
    console.error(`[MCP Swagger HTML] 未找到有效数据`);
    return null;
}
// ── 直接从 HTML 页面加载并解析接口信息（新策略）─────────────────────
// 这是优先级最高的策略：先尝试获取 HTML 页面，提取接口信息
async function loadAndParseHtmlPage(source, baseUrl, fragmentGroup, fragmentOperation) {
    console.error(`[MCP Swagger HTML Page] 开始加载 HTML 页面: ${source}`);
    try {
        // 1. 获取 HTML 页面内容
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        let response;
        try {
            response = await fetch(source, {
                signal: controller.signal,
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate"
                },
            });
        }
        finally {
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
            }
            catch (err) {
                console.error(`[MCP Swagger HTML Page] Swagger JSON 获取失败:`, err);
            }
        }
        console.error(`[MCP Swagger HTML Page] 无法从 HTML 页面提取接口信息`);
        return null;
    }
    catch (err) {
        console.error(`[MCP Swagger HTML Page] HTML 页面加载失败:`, err);
        return null;
    }
}
// ── 加载远程 HTTP Swagger 文档（并行探测候选 URL）─────────────────────
async function loadRemoteDocument(source, fragmentGroup, fragmentOperation) {
    // 如果是 doc.html 类 URL，跳过直接 JSON 拉取（已知返回 HTML），直接并行探测
    const candidateInfo = buildCandidateUrls(source);
    if (!candidateInfo) {
        // 非 doc.html URL：直接尝试作为 JSON 拉取（适配直链 JSON 地址）
        try {
            const doc = await tryFetchJson(source, 8000);
            if (isValidSpec(doc))
                return doc;
        }
        catch {
            // fallthrough
        }
        throw new Error(`get_swagger_mcp: 无法从该 URL 获取可解析的 Swagger/OpenAPI JSON。` +
            `请传入 JSON 文档地址（如 /v2/api-docs 或 /v3/api-docs），当前: ${source}`);
    }
    const { baseUrl, urls: probeUrls } = candidateInfo;
    // ★ 优先级最高：尝试直接解析 HTML 页面获取接口信息
    if (fragmentOperation) {
        try {
            console.error(`[MCP Swagger] 优先级1: 尝试直接解析 HTML 页面获取接口信息`);
            const htmlDoc = await loadAndParseHtmlPage(source, baseUrl, fragmentGroup, fragmentOperation);
            if (htmlDoc && isValidSpec(htmlDoc)) {
                console.error(`[MCP Swagger] ✓ 优先级1 成功: 从 HTML 页面提取到接口数据`);
                return htmlDoc;
            }
        }
        catch (err) {
            console.error(`[MCP Swagger] 优先级1 失败:`, err);
        }
    }
    // 快路径 1：已知分组名，直接拉取 v3/v2 api-docs?group=xxx
    if (fragmentGroup) {
        const groupEncoded = encodeURIComponent(fragmentGroup);
        const basePath = baseUrl.pathname;
        const directUrls = [
            new URL(`${basePath}v3/api-docs?group=${groupEncoded}`, baseUrl.origin).toString(),
            new URL(`${basePath}v2/api-docs?group=${groupEncoded}`, baseUrl.origin).toString(),
            new URL(`v3/api-docs?group=${groupEncoded}`, baseUrl).toString(),
            new URL(`v2/api-docs?group=${groupEncoded}`, baseUrl).toString(),
        ];
        console.error(`[MCP Swagger Debug] 快路径1: 直接尝试 API docs URLs:`, directUrls);
        const directResults = await Promise.allSettled(directUrls.map((url) => tryFetchJson(url, 15000)));
        for (const r of directResults) {
            if (r.status === "fulfilled" && isValidSpec(r.value)) {
                console.error(`[MCP Swagger Debug] ✓ 快路径1 成功`);
                return r.value;
            }
        }
    }
    // 快路径2: 尝试 swagger-resources 获取分组信息
    try {
        const swaggerResourcesUrl = new URL(`${baseUrl.pathname}swagger-resources`, baseUrl.origin).toString();
        console.error(`[MCP Swagger Debug] 快路径2: 尝试 swagger-resources:`, swaggerResourcesUrl);
        const resources = await tryFetchJson(swaggerResourcesUrl, 10000);
        if (Array.isArray(resources) && resources.length > 0) {
            console.error(`[MCP Swagger Debug] swagger-resources 返回 ${resources.length} 项`);
            const resolved = await resolveFromSwaggerResources(resources, baseUrl, fragmentGroup, fragmentOperation);
            if (resolved && isValidSpec(resolved)) {
                console.error(`[MCP Swagger Debug] ✓ 快路径2 成功`);
                return resolved;
            }
        }
    }
    catch (err) {
        console.error(`[MCP Swagger Debug] 快路径2 失败:`, err);
    }
    const PROBE_TIMEOUT = 3000; // 探测阶段短超时（404/502 通常 <1s 返回）
    const results = await Promise.allSettled(probeUrls.map((url) => tryFetchJson(url, PROBE_TIMEOUT)));
    // 并行处理所有成功结果
    for (const r of results) {
        if (r.status !== "fulfilled")
            continue;
        const doc = r.value;
        // 命中有效规范 → 立即返回
        if (isValidSpec(doc))
            return doc;
        // 命中 swagger-resources 数组 → 解析并拉取真实 JSON
        if (Array.isArray(doc)) {
            try {
                const resolved = await resolveFromSwaggerResources(doc, baseUrl, fragmentGroup, fragmentOperation);
                if (resolved && isValidSpec(resolved))
                    return resolved;
            }
            catch {
                // fallthrough
            }
        }
    }
    throw new Error(`get_swagger_mcp: 无法从该 URL 获取可解析的 Swagger/OpenAPI JSON。` +
        `请传入 JSON 文档地址（如 /v2/api-docs 或 /v3/api-docs），当前: ${source}`);
}
/**
 * 加载 Swagger/OpenAPI 文档（支持 HTTP URL 和本地文件路径）
 * - 支持 swagger-resources 自动发现
 * - 并行探测候选 URL 以减少等待
 * - 内存缓存避免重复拉取
 */
export async function loadDocument(args) {
    // 如果调用方显式传入了非空对象形式的 document，则使用它；空对象会被忽略以避免覆盖有效的远程文档加载
    if (args.document && typeof args.document === "object" && Object.keys(args.document).length > 0) {
        return args.document;
    }
    // 从 URL fragment 中提取分组名/标签/操作标识
    const { fragmentGroup, fragmentOperation } = parseFragment(String(args.source ?? ""));
    // 使用默认 URL 如果 source 未提供或为空
    const defaultSource = "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/";
    let source;
    if (args.source !== undefined && args.source !== null && args.source.trim() !== "") {
        source = normalizeSource(args.source);
    }
    else {
        source = defaultSource;
    }
    if (!source || source.trim() === "") {
        throw new Error("get_swagger_mcp: 需要提供 source 或 document");
    }
    // 查内存缓存：cacheKey 剔除 fragment（同站点同分组 → 仅拉取一次）
    const cacheKey = `${source.split("#")[0]}#group=${fragmentGroup ?? ""}`;
    const cached = documentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.doc;
    }
    // 查磁盘缓存：跨会话复用，特别是 IDE MCP 超时后重试场景
    if (isHttpUrl(source)) {
        const diskDoc = await readDiskCache(cacheKey);
        if (diskDoc && isValidSpec(diskDoc)) {
            documentCache.set(cacheKey, { doc: diskDoc, timestamp: Date.now() });
            return diskDoc;
        }
    }
    let doc;
    if (isHttpUrl(source)) {
        doc = await loadRemoteDocument(source, fragmentGroup, fragmentOperation);
    }
    else {
        const filePath = path.isAbsolute(source) ? source : path.resolve(process.cwd(), source);
        const raw = await fs.readFile(filePath, "utf-8");
        const trimmed = String(raw ?? "").trim();
        if (!trimmed)
            throw new Error(`get_swagger_mcp: 本地文件 ${filePath} 内容为空`);
        try {
            doc = JSON.parse(trimmed);
        }
        catch (err) {
            throw new Error(`get_swagger_mcp: 解析本地 JSON 文件失败 ${filePath}: ${err?.message ?? String(err)}，文件预览: ${trimmed.slice(0, 200)}`);
        }
    }
    // 写入内存缓存
    documentCache.set(cacheKey, { doc, timestamp: Date.now() });
    // 后台写入磁盘缓存（仅 HTTP 源，本地文件无需），不阻塞返回
    if (isHttpUrl(source) && isValidSpec(doc)) {
        void writeDiskCache(cacheKey, doc);
    }
    return doc;
}
/**
 * 从 Swagger/OpenAPI 文档中提取模型定义根节点
 */
export function getSchemasRoot(doc) {
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
