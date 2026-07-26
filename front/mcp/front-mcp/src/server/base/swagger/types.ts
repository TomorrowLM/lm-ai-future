/**
 * Swagger 工具类型定义
 */

export type SwaggerGetModelArgs = {
  source?: string;
  document?: unknown;
  name?: string;
  tag?: string;
  operationId?: string;
  keyword?: string;
  offset?: number;
  limit?: number;
  refresh?: boolean;
  resolveRefs?: boolean;
  maxDepth?: number;
};

export interface SwaggerFragment {
  fragmentGroup?: string;
  fragmentTag?: string;
  fragmentOperation?: string;
}

export interface ResolveSchemaNodeOptions {
  doc: any;
  node: any;
  depth: number;
  seenRefs: Set<string>;
}

export interface FoundOperation {
  path: string;
  method: string;
  operation: any;
  score: number;
}

export interface OperationIO {
  operation: {
    path: string;
    method: string;
    summary?: string;
    operationId?: string;
    tags?: string[];
  };
  request: {
    body?: any;
    parameters: any[];
  };
  response: {
    code: string;
    body?: any;
  };
}
