import assert from "node:assert/strict";
import test from "node:test";

import { querySwaggerDocument } from "../src/server/base/swagger/query.js";
import { parseFragment } from "../src/server/base/swagger/analys/url-parser.js";
import { swaggerGetModelInputSchema } from "../src/server/base/swagger/schema.js";

const PACKAGE_TAG = "一起安-算粒-套餐";

const document = {
  swagger: "2.0",
  info: { title: "Swagger query fixture", version: "1.0.0" },
  paths: {
    "/packages/{id}": {
      get: {
        tags: [PACKAGE_TAG],
        summary: "查询套餐详情",
        operationId: "getPackageUsingGET",
        parameters: [
          { name: "id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { schema: { $ref: "#/definitions/PackageResponse" } },
        },
      },
      delete: {
        tags: [PACKAGE_TAG],
        summary: "删除套餐",
        operationId: "deleteByIdUsingGET",
        parameters: [
          { name: "id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { schema: { $ref: "#/definitions/PackageResponse" } },
        },
      },
    },
    "/packages": {
      post: {
        tags: [PACKAGE_TAG],
        summary: "新增修改套餐",
        operationId: "savePackageUsingPOST",
        parameters: [
          { name: "body", in: "body", required: true, schema: { $ref: "#/definitions/PackageRequest" } },
        ],
        responses: {
          "200": { schema: { $ref: "#/definitions/PackageResponse" } },
        },
      },
    },
    "/orders": {
      get: {
        tags: ["一起安-算粒-订单"],
        summary: "订单列表",
        operationId: "listOrdersUsingGET",
        responses: {
          "200": { schema: { type: "array", items: { $ref: "#/definitions/OrderResponse" } } },
        },
      },
    },
  },
  definitions: {
    ErrorResponse: {
      type: "object",
      properties: { message: { type: "string" } },
    },
    OrderResponse: {
      type: "object",
      properties: { orderId: { type: "string" } },
    },
    PackageRequest: {
      type: "object",
      properties: { name: { type: "string" } },
    },
    PackageResponse: {
      type: "object",
      properties: { id: { type: "string" }, name: { type: "string" } },
    },
  },
};

function query(
  args: Record<string, unknown>,
  source = "https://example.com/doc.html#/1.所有接口",
) {
  return querySwaggerDocument({
    doc: document,
    args: { source, ...args },
    fragment: parseFragment(source),
  }) as any;
}

test("explicit operationId returns one resolved operation", () => {
  const result = query({ operationId: "savePackageUsingPOST" });

  assert.equal(result.match, "operationId");
  assert.equal(result.operation.operationId, "savePackageUsingPOST");
  assert.equal(result.request.body.type, "object");
  assert.equal(result.response.body.properties.id.type, "string");
});

test("three-segment fragment resolves a single operation", () => {
  const source = `https://example.com/doc.html#/1.所有接口/${encodeURIComponent(PACKAGE_TAG)}/deleteByIdUsingGET`;
  const result = query({}, source);

  assert.equal(result.match, "operationId");
  assert.equal(result.tag, PACKAGE_TAG);
  assert.equal(result.operation.operationId, "deleteByIdUsingGET");
});

test("explicit tag returns only operations under that tag", () => {
  const result = query({ tag: PACKAGE_TAG });

  assert.equal(result.match, "tag");
  assert.equal(result.tag, PACKAGE_TAG);
  assert.equal(result.total, 3);
  assert.equal(result.returned, 3);
  assert.deepEqual(
    result.operations.map((item: any) => item.operationId),
    ["deleteByIdUsingGET", "getPackageUsingGET", "savePackageUsingPOST"],
  );
});

test("two-segment fragment falls back from operationId to tag", () => {
  const source = `https://example.com/doc.html#/1.所有接口/${encodeURIComponent(PACKAGE_TAG)}`;
  const result = query({}, source);

  assert.equal(result.match, "tag");
  assert.equal(result.tag, PACKAGE_TAG);
  assert.equal(result.total, 3);
});

test("two-segment fragment still resolves an exact operationId first", () => {
  const source = "https://example.com/doc.html#/1.所有接口/deleteByIdUsingGET";
  const result = query({}, source);

  assert.equal(result.match, "operationId");
  assert.equal(result.operation.operationId, "deleteByIdUsingGET");
});

test("explicit selectors follow operationId then fragment then tag precedence", () => {
  const source = `https://example.com/doc.html#/1.所有接口/${encodeURIComponent(PACKAGE_TAG)}/deleteByIdUsingGET`;
  const explicitOperation = query(
    { operationId: "savePackageUsingPOST", tag: "一起安-算粒-订单" },
    source,
  );
  const fragmentOperation = query({ tag: "一起安-算粒-订单" }, source);

  assert.equal(explicitOperation.operation.operationId, "savePackageUsingPOST");
  assert.equal(fragmentOperation.operation.operationId, "deleteByIdUsingGET");
});

test("tag results support keyword filtering and pagination", () => {
  const result = query({ tag: PACKAGE_TAG, keyword: "套餐", offset: 1, limit: 1 });

  assert.equal(result.total, 3);
  assert.equal(result.offset, 1);
  assert.equal(result.limit, 1);
  assert.equal(result.returned, 1);
  assert.equal(result.operations[0].operationId, "getPackageUsingGET");
});

test("missing selectors return stable structured errors", () => {
  const operation = query({ operationId: "missingOperation" });
  const tag = query({ tag: "missing-tag" });

  assert.deepEqual(operation.error, {
    code: "OPERATION_NOT_FOUND",
    message: "未找到接口",
    query: "missingOperation",
  });
  assert.deepEqual(tag.error, {
    code: "TAG_NOT_FOUND",
    message: "未找到 Tag",
    query: "missing-tag",
  });
});

test("model catalog is bounded and never returns the full schemas object", () => {
  const result = query({ keyword: "Response", offset: 1, limit: 1 });

  assert.equal(result.match, "models");
  assert.equal(result.total, 3);
  assert.equal(result.offset, 1);
  assert.equal(result.limit, 1);
  assert.equal(result.returned, 1);
  assert.deepEqual(result.models, ["OrderResponse"]);
  assert.equal("schemas" in result, false);
  assert.equal("_debug" in result, false);
});

test("model catalog filtering is case-insensitive and pagination is clamped", () => {
  const result = query({ keyword: "response", offset: -5, limit: 9999 });

  assert.equal(result.total, 3);
  assert.equal(result.offset, 0);
  assert.equal(result.limit, 200);
  assert.equal(result.returned, 3);
});

test("legacy name model and operation queries remain compatible", () => {
  const model = query({ name: "PackageResponse" });
  const operation = query({ name: "savePackageUsingPOST" });
  const missing = query({ name: "DefinitelyMissing" });

  assert.deepEqual(Object.keys(model).sort(), ["name", "schema"]);
  assert.equal(model.schema.properties.id.type, "string");
  assert.equal(operation.match, "operation");
  assert.equal(operation.operation.operationId, "savePackageUsingPOST");
  assert.deepEqual(missing.error, {
    code: "MODEL_NOT_FOUND",
    message: "未找到模型",
    query: "DefinitelyMissing",
  });
});

test("a one-segment fragment is a group and does not become a selector", () => {
  const fragment = parseFragment("https://example.com/doc.html#/1.所有接口");
  const result = query({}, "https://example.com/doc.html#/1.所有接口");

  assert.deepEqual(fragment, { fragmentGroup: "1.所有接口" });
  assert.equal(result.match, "models");
});

test("public input schema advertises explicit selectors and output controls", () => {
  const properties = swaggerGetModelInputSchema.properties as Record<string, unknown>;

  for (const key of ["tag", "operationId", "keyword", "offset", "limit", "refresh"]) {
    assert.ok(key in properties, `missing schema property: ${key}`);
  }
});
