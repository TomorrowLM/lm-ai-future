# Swagger MCP Query Optimization Implementation Plan

> **For Codex:** Execute this plan task by task. Follow test-driven development: add each failing test, verify the failure, implement the minimum production change, then verify the test passes.

**Goal:** Make `get_swagger_mcp` support precise operation URL/operationId queries and Tag URL/tag queries while preserving compatibility, centralizing Swagger strategy constants, bounding output size, and adding regression tests.

**Architecture:** Extract a pure Swagger query engine from the MCP transport handler so query precedence and response shaping are deterministic and unit-testable. Keep document loading in the handler, add a `config/` module consumed by loader/cache/parser/query code, and preserve fragment-based compatibility in one normalized query context.

**Tech Stack:** TypeScript 5.9, Node.js 20, MCP SDK, Node built-in test runner through `tsx --test`, pnpm.

---

## Task 1: Add the automated test entrypoint and failing query-contract tests

**Files:**
- Modify: `package.json`
- Create: `test/swagger-query.test.ts`

**Step 1: Add a test script**

Add `"test": "tsx --test test/*.test.ts"` to `scripts`.

**Step 2: Create a small in-memory Swagger 2.0 fixture**

The fixture must contain:
- Two operations under `一起安-算粒-套餐`.
- One operation under another Tag.
- At least three definitions with `$ref` usage.

**Step 3: Write failing query tests**

Import the not-yet-created pure query function and assert:
- explicit `operationId` returns one operation with resolved request/response bodies;
- three-segment URL fragment resolves the operation;
- explicit `tag` returns only matching operations;
- two-segment URL fragment falls back from operationId to Tag;
- keyword/offset/limit paginate Tag results;
- missing operation and missing Tag return structured error codes;
- no selector returns only paginated model names and never returns `schemas`.

**Step 4: Run the focused test and verify RED**

Run: `pnpm test`

Expected: FAIL because `query.ts` and the new query contract do not exist yet.

## Task 2: Centralize Swagger runtime configuration

**Files:**
- Create: `src/server/base/swagger/config/defaults.ts`
- Create: `src/server/base/swagger/config/network.ts`
- Create: `src/server/base/swagger/config/cache.ts`
- Create: `src/server/base/swagger/config/index.ts`
- Modify: `src/server/base/swagger/analys/cache.ts`
- Modify: `src/server/base/swagger/analys/url-parser.ts`
- Modify: `src/server/base/swagger/analys/loader.ts`
- Modify: `src/server/base/swagger/types.ts`

**Step 1: Add configuration constants**

Move these strategy values into `config/`:
- default Swagger source;
- default/max pagination limits and default max `$ref` depth;
- memory/disk cache TTL;
- candidate API-doc paths;
- direct, generic, group, resource, resolved-resource, and probe timeouts.

**Step 2: Expand argument types**

Add `tag`, `operationId`, `keyword`, `offset`, `limit`, and `refresh` to `SwaggerGetModelArgs`.

**Step 3: Replace module-local constants**

Update cache, URL parser, and loader to import configuration values. Preserve current values and default source behavior.

**Step 4: Implement refresh cache bypass**

When `refresh` is true, skip memory and disk cache reads; after a successful load, continue updating both caches.

**Step 5: Run type checking**

Run: `pnpm run build`

Expected: PASS before query engine wiring; no runtime behavior change other than refresh support and centralized constants.

## Task 3: Implement the pure query engine and make tests pass

**Files:**
- Create: `src/server/base/swagger/query.ts`
- Modify: `src/server/base/swagger/types.ts`
- Modify: `test/swagger-query.test.ts`

**Step 1: Normalize pagination and filtering**

Create small pure helpers that clamp offset/limit using config values and filter model/operation catalog entries case-insensitively by keyword.

**Step 2: Implement query precedence**

Implement:
1. explicit operationId;
2. operationId from a three-segment fragment;
3. explicit Tag;
4. fragment Tag, including the two-segment compatibility fallback;
5. legacy name model/operation lookup;
6. paginated model catalog.

**Step 3: Shape bounded and structured results**

- Keep current successful operation and Tag payload fields.
- Add `offset`, `limit`, `total`, and `returned` metadata for lists.
- Return `OPERATION_NOT_FOUND`, `TAG_NOT_FOUND`, or `MODEL_NOT_FOUND` without attaching all models.
- Resolve `$ref` with the existing resolver and configured max depth.

**Step 4: Run tests and verify GREEN**

Run: `pnpm test`

Expected: all query-contract tests pass.

## Task 4: Wire the MCP tool schema and handler to the query engine

**Files:**
- Modify: `src/server/base/swagger/schema.ts`
- Modify: `src/server/base/swagger/index.ts`
- Modify: `test/swagger-query.test.ts`

**Step 1: Update the public tool description and input schema**

Document URL fragment support and add schema definitions for `tag`, `operationId`, `keyword`, `offset`, `limit`, and `refresh`. Align displayed defaults with config values.

**Step 2: Simplify the handler**

The handler should:
- parse the original source fragment without mutating `args.name`;
- load the document;
- log a bounded summary;
- delegate all matching and response payload creation to the pure query engine;
- convert the payload to the MCP text response.

**Step 3: Add schema contract assertions**

Assert the public schema advertises both explicit selectors and pagination/refresh controls.

**Step 4: Run tests and build**

Run: `pnpm test && pnpm run build`

Expected: PASS.

## Task 5: Update module documentation and integration checks

**Files:**
- Modify: `src/server/base/swagger/README.md`
- Modify: `test/call-get-swagger.mjs`

**Step 1: Document supported calls**

Add examples for:
- default source;
- single-operation URL;
- Tag URL;
- explicit operationId;
- explicit Tag;
- pagination/filtering;
- refresh.

Document the centralized configuration directory and bounded no-selector response.

**Step 2: Keep the manual client compatible**

Allow the call script to forward the new selector and paging flags without changing existing invocations.

**Step 3: Run complete verification**

Run:
- `pnpm test`
- `pnpm run build`
- `pnpm run lint`
- a real Tag URL call for `一起安-算粒-套餐`;
- a real single-operation URL call for `deleteByIdUsingGET`.

Expected:
- unit tests and build pass;
- lint has no new errors;
- Tag call returns three operations;
- single-operation call returns the requested operation only;
- output contains no full-document Schema dump.

## Task 6: Review the final diff

**Files:** all files changed above.

**Step 1: Inspect scope**

Run: `git status --short && git diff --stat && git diff --check`

Expected: only Swagger MCP implementation, tests, package script, and related docs are changed; no business frontend files are modified.

**Step 2: Confirm compatibility**

Re-run one legacy `name` model lookup and confirm the result structure remains `{ name, schema }`.

**Step 3: Record evidence**

Capture exact verification command outcomes for the final handoff. Do not claim completion unless fresh outputs confirm success.
