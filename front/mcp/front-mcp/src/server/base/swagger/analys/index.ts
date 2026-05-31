/**
 * Swagger 文档分析器模块
 * 整合所有解析策略：缓存、URL 解析、HTML 解析、远程加载
 */

// 主入口
export { loadDocument, getSchemasRoot } from "./document.js";

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

// URL 解析
export {
  parseFragment,
  buildCandidateUrls,
  tryFetchJson,
} from "./url-parser.js";

// HTML 解析
export {
  extractSwaggerFromHtml,
  loadAndParseHtmlPage,
} from "./html-parser.js";

// 远程加载
export {
  loadRemoteDocument,
} from "./remote-loader.js";
