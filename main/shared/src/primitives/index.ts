// main/shared/src/primitives/index.ts
/**
 * Primitives Module Barrel
 *
 * Re-exports from all primitives sub-modules.
 * This is the lowest layer — no imports from engine, core, contracts, or api.
 */

export type {
  ApiResponse,
  ApiResult,
  Contract,
  ContractRouter,
  EndpointContract,
  EndpointDef,
  ErrorCode,
  ErrorResponse,
  HttpMethod,
  InferOkData,
  InferResponseData,
  QueryParams,
  RequestBody,
  StatusCode,
  SuccessResponse,
} from './api';

export type { Logger, ServerLogger } from './logger';

export type { InferSchema, SafeParseResult, Schema } from './schema';

export type { ServerEnvironment } from './environment';

export type { BreadcrumbData, ErrorTracker, HasErrorTracker } from './observability';
