export const DEFAULT_SWAGGER_SOURCE =
  "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/";

export const DSB_API_SWAGGER_SOURCE =
  "https://apit-dsb.dingtax.cn/dsb/api/doc.html#/";

export function resolveSwaggerSource(apiPath: string): string {
  if (apiPath.startsWith("/dsb/api/")) {
    return DSB_API_SWAGGER_SOURCE;
  }

  return DEFAULT_SWAGGER_SOURCE;
}

export const SWAGGER_QUERY_DEFAULTS = {
  offset: 0,
  limit: 50,
  maxLimit: 200,
  maxDepth: 15,
} as const;
