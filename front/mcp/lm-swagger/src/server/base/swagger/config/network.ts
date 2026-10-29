export const SWAGGER_ENDPOINTS = {
  openApiV3: "v3/api-docs",
  swaggerV2: "v2/api-docs",
  resources: "swagger-resources",
} as const;

export const SWAGGER_CANDIDATE_PATHS = [
  SWAGGER_ENDPOINTS.openApiV3,
  SWAGGER_ENDPOINTS.swaggerV2,
  SWAGGER_ENDPOINTS.resources,
] as const;

export const SWAGGER_NETWORK_TIMEOUT_MS = {
  genericJson: 20_000,
  directJson: 8_000,
  htmlPage: 15_000,
  groupDocument: 15_000,
  resources: 10_000,
  resolvedResource: 18_000,
  probe: 3_000,
} as const;
