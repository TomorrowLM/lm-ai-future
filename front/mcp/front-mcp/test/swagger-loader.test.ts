import assert from "node:assert/strict";
import test from "node:test";

import {
  clearCache,
  getCachedDocument,
  setCachedDocument,
} from "../src/server/base/swagger/analys/cache.js";
import { loadDocument } from "../src/server/base/swagger/analys/loader.js";
import {
  DEFAULT_SWAGGER_SOURCE,
  DSB_API_SWAGGER_SOURCE,
  resolveSwaggerSource,
  SWAGGER_CANDIDATE_PATHS,
  SWAGGER_NETWORK_TIMEOUT_MS,
  SWAGGER_QUERY_DEFAULTS,
} from "../src/server/base/swagger/config/index.js";
import { swaggerGetModelInputSchema } from "../src/server/base/swagger/schema.js";

test("Swagger runtime strategy values come from the public config module", () => {
  assert.equal(
    DEFAULT_SWAGGER_SOURCE,
    "https://apit-dsb.dingtax.cn/dsb/yqarw/api/doc.html#/",
  );
  assert.deepEqual(SWAGGER_CANDIDATE_PATHS, [
    "v3/api-docs",
    "v2/api-docs",
    "swagger-resources",
  ]);
  assert.ok(SWAGGER_NETWORK_TIMEOUT_MS.probe > 0);
  assert.ok(SWAGGER_QUERY_DEFAULTS.limit <= SWAGGER_QUERY_DEFAULTS.maxLimit);
  assert.equal(
    swaggerGetModelInputSchema.properties.source.default,
    DEFAULT_SWAGGER_SOURCE,
  );
});

test("relative API paths select the matching Swagger document source", () => {
  assert.equal(
    resolveSwaggerSource("/dsb/yqarw/api/urban/roles/list"),
    DEFAULT_SWAGGER_SOURCE,
  );
  assert.equal(
    resolveSwaggerSource("/dsb/api/szt/urban/roles/list"),
    DSB_API_SWAGGER_SOURCE,
  );
});

test("refresh bypasses cache reads and writes the fresh document back", async () => {
  const source = "https://example.test/swagger-refresh.json";
  const cacheKey = `${source}#group=`;
  const cachedDocument = {
    swagger: "2.0",
    info: { title: "cached", version: "1" },
    paths: {},
  };
  const freshDocument = {
    swagger: "2.0",
    info: { title: "fresh", version: "2" },
    paths: {},
  };
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify(freshDocument), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    clearCache();
    setCachedDocument(cacheKey, cachedDocument);

    assert.equal(await loadDocument({ source }), cachedDocument);
    assert.equal(fetchCalls, 0);

    assert.deepEqual(await loadDocument({ source, refresh: true }), freshDocument);
    assert.equal(fetchCalls, 1);
    assert.deepEqual(getCachedDocument(cacheKey), freshDocument);
  } finally {
    globalThis.fetch = originalFetch;
    clearCache();
  }
});
