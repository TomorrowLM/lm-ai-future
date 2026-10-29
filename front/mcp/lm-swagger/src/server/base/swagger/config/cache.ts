export const SWAGGER_CACHE_CONFIG = {
  memoryTtlMs: 10 * 60 * 1_000,
  diskTtlMs: 60 * 60 * 1_000,
  diskDirectoryName: "lm-mcp-swagger-cache",
} as const;
