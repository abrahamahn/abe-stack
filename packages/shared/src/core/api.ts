// shared/src/core/api.ts
/**
 * API Contract Types
 *
 * Centralized contract definitions for API endpoints to ensure consistency
 * across all domain contracts. This prevents duplication and ensures
 * that any changes to the contract structure are applied globally.
 */

import type { ErrorCode } from './constants';
import type { z } from 'zod';


// Re-export from canonical location
export { errorCodeSchema } from './schemas';

/**
 * Supported API status codes
 */
export type StatusCode =
  | 200
  | 201
  | 202
  | 204
  | 400
  | 401
  | 402
  | 403
  | 404
  | 409
  | 422
  | 429
  | 500
  | 503;

/**
 * Represents a single API endpoint contract
 */
export interface EndpointContract {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  responses: Partial<Record<StatusCode, z.ZodTypeAny>>;
  summary: string;
}

/**
 * Generic contract type for defining API contracts
 */
export type Contract = Record<string, EndpointContract>;

/**
 * Represents a successful API response
 */
export interface ApiResponse<T = unknown> {
  ok: true;
  data: T;
}

/**
 * Represents an error response
 */
export interface ErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown> | undefined;
  };
}

/**
 * Union type for API responses
 */
export type ApiResult<T = unknown> = ApiResponse<T> | ErrorResponse;

/**
 * Helper to extract the success data type from a Zod schema.
 * Handles both wrapped { ok: true, data: T } and raw T responses.
 */
type InferOkData<S extends z.ZodTypeAny> =
  z.infer<S> extends { ok: true; data: infer D } ? D : z.infer<S>;

/**
 * Helper to extract the success data type from an EndpointContract.
 * Checks common success status codes (200, 201, 202, 204).
 */
export type InferResponseData<C extends EndpointContract> = C['responses'][200] extends z.ZodTypeAny
  ? InferOkData<C['responses'][200]>
  : C['responses'][201] extends z.ZodTypeAny
    ? InferOkData<C['responses'][201]>
    : C['responses'][202] extends z.ZodTypeAny
      ? InferOkData<C['responses'][202]>
      : C['responses'][204] extends z.ZodTypeAny
        ? undefined
        : unknown;
