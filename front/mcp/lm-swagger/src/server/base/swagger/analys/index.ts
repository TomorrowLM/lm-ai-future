/**
 * Swagger 文档分析器模块
 * 整合所有解析策略：缓存、URL 解析、HTML 提取、远程多优先级加载
 */

// 主入口
// 加载器：对象直接返回 → 缓存 → 远程多优先级策略
export { loadDocument, getSchemasRoot } from "./loader.js";

// 缓存管理
export {
  isValidSpec,
  getCachedDocument,
  setCachedDocument,
  readDiskCache,
  writeDiskCache,
  clearCache,
  hashKey,
} from "./cache.js";

// URL 解析 + 远程获取策略
export {
  parseFragment,
  buildCandidateUrls,
  tryFetchJson,
  fetchDocsByGroup,
  fetchDocFromSwaggerResources,
  probeCandidateUrls,
} from "./url-parser.js";

// HTML 提取
export {
  extractSwaggerFromHtml,
  loadAndParseHtmlPage,
} from "./html-parser.js";
