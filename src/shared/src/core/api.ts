// packages/shared/src/core/api.ts

/**
 * @file API Contract Types (Re-exports)
 * @description Re-exports contract types from contracts/types for backward compatibility.
 * @module Shared/Api
 * @deprecated Import directly from '../contracts/types' instead.
 */

import type { ErrorCode } from './constants';

// Re-export contract types with backward-compatible names
export type { Contract, EndpointDef as EndpointContract } from '../contracts/types';

/**
 * Supported API status codes.
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
 * Represents a successful API response.
 */
export interface ApiResponse<T = unknown> {
  ok: true;
  data: T;
}

/**
 * Represents an error response.
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
 * Union type for API responses.
 */
export type ApiResult<T = unknown> = ApiResponse<T> | ErrorResponse;

/**
 * Helper to extract the success data type from a response.
 * Handles both wrapped `{ ok: true, data: T }` and raw `T` responses.
 */
type InferOkData<S> = S extends { ok: true; data: infer D } ? D : S;

/**
 * Helper to extract the success data type from an EndpointContract.
 * Checks common success status codes (200, 201, 202, 204).
 */
export type InferResponseData<C extends { responses: Record<string, unknown> }> =
  C['responses'] extends { 200: { _type: infer S } }
    ? InferOkData<S>
    : C['responses'] extends { 201: { _type: infer S } }
      ? InferOkData<S>
      : C['responses'] extends { 202: { _type: infer S } }
        ? InferOkData<S>
        : C['responses'] extends { 204: unknown }
          ? undefined
          : unknown;
