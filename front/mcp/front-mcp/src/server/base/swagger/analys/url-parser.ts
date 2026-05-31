/**
 * URL 解析工具
 * 负责解析 Swagger/Knife4j URL，提取 fragment 信息和构造候选 URL
 */

// ── 从 URL fragment 中提取分组名/标签/操作标识 ─────────────────────────
// knife4j 的 doc.html 路径形如：#/{group}/{tag}/{operationId}
// 例：#/任务管理/城市管理-检查任务接口/pageUsingPOST_11
//      group  = 任务管理
//      tag    = 城市管理-检查任务接口
//      opId   = pageUsingPOST_11

export function parseFragment(source: string): {
  fragmentGroup?: string;
  fragmentTag?: string;
  fragmentOperation?: string;
} {
  try {
    if (!source.includes("#")) return {};
    const frag = source.split("#")[1] ?? "";
    const parts = frag.split("/").filter(Boolean).map((p) => {
      try { return decodeURIComponent(p); } catch { return p; }
    });
    if (parts.length === 0) return {};
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
  } catch {
    return {};
  }
}

// ── doc.html URL → 候选探测 URL（swagger-resources 优先）────────────────

export function buildCandidateUrls(source: string): { baseUrl: URL; urls: string[] } | null {
  try {
    const inputUrl = new URL(source);
    inputUrl.hash = "";
    const pathname = inputUrl.pathname.replace(/\/+$/, "");
    const isDocHtml = /\/doc\.html$/i.test(pathname) || /\/swagger-ui\.html$/i.test(pathname);
    if (!isDocHtml) return null;

    const basePath = pathname.replace(/\/(doc\.html|swagger-ui\.html)$/i, "/");
    const baseUrl = new URL(inputUrl.toString());
    baseUrl.pathname = basePath;
    baseUrl.search = "";

    // swagger-resources 排首位：knife4j 等框架下响应最快、信息量最大
    const urls: string[] = [
      new URL("v3/api-docs", baseUrl).toString(),
      new URL("v2/api-docs", baseUrl).toString(),
      new URL("swagger-resources", baseUrl).toString(),
    ];
    return { baseUrl, urls };
  } catch {
    return null;
  }
}

/**
 * 尝试从 URL 获取 JSON 文档
 */
export async function tryFetchJson(url: string, timeoutMs = 20000): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept-Encoding": "gzip, deflate" },
    });
  } finally {
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
      } catch (err) {
        // fallthrough to throw below with preview
        void err;
      }
    }

    throw new Error(
      `get_swagger_mcp: URL 返回非 JSON 内容 (content-type: ${contentType || "unknown"})，URL: ${url}，响应预览: ${trimmed.slice(0,200)}`
    );
  }

  try {
    const json = JSON.parse(trimmed) as unknown;
    return json;
  } catch (err: any) {
    throw new Error(`get_swagger_mcp: JSON 解析失败 ${url}: ${err?.message ?? String(err)}，响应预览: ${trimmed.slice(0,200)}`);
  }
}
