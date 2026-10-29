import { SWAGGER_QUERY_DEFAULTS } from "@/server/base/swagger/config/index.js";
import type {
  FoundOperation,
  SwaggerFragment,
  SwaggerGetModelArgs,
} from "@/server/base/swagger/types.js";
import {
  extractOperationIO,
  findOperationById,
  findOperationByKeyword,
  findOperationsByTag,
} from "@/server/base/swagger/utils/operation.js";
import { resolveSchemaNode } from "@/server/base/swagger/utils/schema.js";

export interface QuerySwaggerDocumentOptions {
  doc: any;
  args: SwaggerGetModelArgs;
  fragment: SwaggerFragment;
}

interface Pagination {
  offset: number;
  limit: number;
}

function getSchemasRoot(doc: any): Record<string, any> {
  const schemas = doc?.components?.schemas ?? doc?.definitions;
  return schemas && typeof schemas === "object" ? schemas : {};
}

function normalizePagination(args: SwaggerGetModelArgs): Pagination {
  const rawOffset = Number.isFinite(args.offset)
    ? Math.floor(args.offset as number)
    : SWAGGER_QUERY_DEFAULTS.offset;
  const rawLimit = Number.isFinite(args.limit)
    ? Math.floor(args.limit as number)
    : SWAGGER_QUERY_DEFAULTS.limit;

  return {
    offset: Math.max(0, rawOffset),
    limit: Math.min(
      SWAGGER_QUERY_DEFAULTS.maxLimit,
      Math.max(1, rawLimit),
    ),
  };
}

function normalizeQuery(value: unknown): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function includesKeyword(values: unknown[], keyword?: string): boolean {
  if (!keyword) return true;
  const needle = keyword.toLowerCase();
  return values
    .filter((value) => value !== undefined && value !== null)
    .some((value) => String(value).toLowerCase().includes(needle));
}

function resolveDepth(args: SwaggerGetModelArgs): number {
  return Number.isFinite(args.maxDepth)
    ? Math.max(0, Math.floor(args.maxDepth as number))
    : SWAGGER_QUERY_DEFAULTS.maxDepth;
}

function createBodyResolver(doc: any, args: SwaggerGetModelArgs) {
  const resolveRefs = args.resolveRefs ?? true;
  const depth = resolveDepth(args);

  return (body: any) =>
    resolveRefs && body
      ? resolveSchemaNode({ doc, node: body, depth, seenRefs: new Set() })
      : body;
}

function operationPayload(
  doc: any,
  args: SwaggerGetModelArgs,
  found: FoundOperation,
) {
  const io = extractOperationIO(doc, found);
  const resolveBody = createBodyResolver(doc, args);

  return {
    operation: io.operation,
    request: {
      ...io.request,
      body: resolveBody(io.request.body),
    },
    response: {
      ...io.response,
      body: resolveBody(io.response.body),
    },
  };
}

function operationResult(
  doc: any,
  args: SwaggerGetModelArgs,
  operationId: string,
  tag?: string,
) {
  const found = findOperationById(doc, operationId);
  if (!found) {
    return {
      error: {
        code: "OPERATION_NOT_FOUND",
        message: "未找到接口",
        query: operationId,
      },
    };
  }

  return {
    match: "operationId",
    keyword: operationId,
    ...(tag ? { tag } : {}),
    ...operationPayload(doc, args, found),
  };
}

function tagResult(
  doc: any,
  args: SwaggerGetModelArgs,
  tag: string,
) {
  const found = findOperationsByTag(doc, tag);
  if (found.length === 0) {
    return {
      error: {
        code: "TAG_NOT_FOUND",
        message: "未找到 Tag",
        query: tag,
      },
    };
  }

  const keyword = normalizeQuery(args.keyword);
  const filtered = found
    .filter(({ path, method, operation }) =>
      includesKeyword(
        [
          path,
          method,
          operation?.summary,
          operation?.description,
          operation?.operationId,
          ...(Array.isArray(operation?.tags) ? operation.tags : []),
        ],
        keyword,
      ),
    )
    .sort((left, right) => {
      const leftId = String(left.operation?.operationId ?? "");
      const rightId = String(right.operation?.operationId ?? "");
      return leftId.localeCompare(rightId)
        || left.path.localeCompare(right.path)
        || left.method.localeCompare(right.method);
    });
  const { offset, limit } = normalizePagination(args);
  const page = filtered.slice(offset, offset + limit);
  const operations = page.map((item) => {
    const payload = operationPayload(doc, args, item);
    return {
      ...payload.operation,
      request: payload.request,
      response: payload.response,
    };
  });

  return {
    match: "tag",
    tag,
    ...(keyword ? { keyword } : {}),
    total: filtered.length,
    offset,
    limit,
    returned: operations.length,
    operations,
  };
}

function legacyNameResult(
  doc: any,
  args: SwaggerGetModelArgs,
  name: string,
  schemas: Record<string, any>,
) {
  const rawModel = schemas[name];
  if (rawModel) {
    const schema = (args.resolveRefs ?? true)
      ? resolveSchemaNode({
          doc,
          node: rawModel,
          depth: resolveDepth(args),
          seenRefs: new Set(),
        })
      : rawModel;
    return { name, schema };
  }

  const found = findOperationByKeyword(doc, name);
  if (found) {
    return {
      match: "operation",
      keyword: name,
      ...operationPayload(doc, args, found),
    };
  }

  return {
    error: {
      code: "MODEL_NOT_FOUND",
      message: "未找到模型",
      query: name,
    },
  };
}

function modelCatalogResult(
  args: SwaggerGetModelArgs,
  schemas: Record<string, any>,
) {
  const keyword = normalizeQuery(args.keyword);
  const models = Object.keys(schemas)
    .filter((name) => includesKeyword([name], keyword))
    .sort((left, right) => left.localeCompare(right));
  const { offset, limit } = normalizePagination(args);
  const page = models.slice(offset, offset + limit);

  return {
    match: "models",
    ...(keyword ? { keyword } : {}),
    total: models.length,
    offset,
    limit,
    returned: page.length,
    models: page,
  };
}

export function querySwaggerDocument({
  doc,
  args,
  fragment,
}: QuerySwaggerDocumentOptions) {
  const operationId = normalizeQuery(args.operationId);
  if (operationId) {
    return operationResult(doc, args, operationId);
  }

  const fragmentOperation = normalizeQuery(fragment.fragmentOperation);
  const fragmentTag = normalizeQuery(fragment.fragmentTag);
  if (fragmentTag && fragmentOperation) {
    return operationResult(doc, args, fragmentOperation, fragmentTag);
  }

  const explicitTag = normalizeQuery(args.tag);
  if (explicitTag) {
    return tagResult(doc, args, explicitTag);
  }

  if (fragmentTag) {
    return tagResult(doc, args, fragmentTag);
  }

  if (fragmentOperation) {
    const found = findOperationById(doc, fragmentOperation);
    if (found) {
      return {
        match: "operationId",
        keyword: fragmentOperation,
        ...operationPayload(doc, args, found),
      };
    }
    return tagResult(doc, args, fragmentOperation);
  }

  const schemas = getSchemasRoot(doc);
  const name = normalizeQuery(args.name);
  if (name) {
    return legacyNameResult(doc, args, name, schemas);
  }

  return modelCatalogResult(args, schemas);
}
