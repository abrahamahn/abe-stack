// main/shared/src/primitives/api.ts
/**
 * API Contract Vocabulary Types
 *
 * Fundamental types for defining API endpoint contracts.
 * These are primitives used across all layers: engine, core, contracts, api.
 */

import type { Schema } from './schema';

export type { Schema };

/** Error codes for API error responses. Mirrors ERROR_CODES in engine/constants/platform. */
export type ErrorCode =
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFIGURATION_ERROR'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REUSED'
  | 'INVALID_TOKEN'
  | 'EMAIL_ALREADY_EXISTS'
  | 'EMAIL_NOT_VERIFIED'
  | 'USER_NOT_FOUND'
  | 'WEAK_PASSWORD'
  | 'OAUTH_ERROR'
  | 'OAUTH_STATE_MISMATCH'
  | 'TOTP_REQUIRED'
  | 'TOTP_INVALID'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'INSUFFICIENT_ENTITLEMENTS'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_SEND_FAILED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'TOS_ACCEPTANCE_REQUIRED';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Definition of a single API endpoint.
 */
export interface EndpointDef<
  TBody = unknown,
  TResponse = unknown,
  TQuery = unknown,
  TPath = unknown,
> {
  method: HttpMethod;
  path: string;
  pathParams?: Record<string, Schema<unknown>> | Schema<TPath>;
  body?: Schema<TBody>;
  query?: Schema<TQuery>;
  responses: Record<string, Schema<TResponse>>;
  summary?: string;
}

/**
 * Alias for EndpointDef for backward compatibility.
 */
export type EndpointContract<
  TBody = unknown,
  TResponse = unknown,
  TQuery = unknown,
  TPath = unknown,
> = EndpointDef<TBody, TResponse, TQuery, TPath>;

/**
 * A contract is a record of endpoint names to endpoint definitions.
 */
export type Contract = Record<string, EndpointDef>;

/**
 * A router combines multiple contracts into a namespace.
 */
export type ContractRouter = Record<string, Contract>;

// ============================================================================
// Wrapper Types (Response Envelope)
// ============================================================================

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

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract the success response type (200 or 201) from an endpoint definition.
 */
export type SuccessResponse<E extends EndpointDef> = '200' extends keyof E['responses']
  ? E['responses']['200'] extends Schema<infer R>
    ? R
    : never
  : '201' extends keyof E['responses']
    ? E['responses']['201'] extends Schema<infer R>
      ? R
      : never
    : '302' extends keyof E['responses']
      ? E['responses']['302'] extends Schema<infer R>
        ? R
        : never
      : unknown;

/**
 * Extract the request body type from an endpoint definition.
 */
export type RequestBody<E extends EndpointDef> = E['body'] extends Schema<infer B> ? B : undefined;

/**
 * Extract the query parameters type from an endpoint definition.
 */
export type QueryParams<E extends EndpointDef> = E['query'] extends Schema<infer Q> ? Q : undefined;

/**
 * Helper to extract the success data type from a response.
 * Handles both wrapped `{ ok: true, data: T }` and raw `T` responses.
 */
export type InferOkData<S> = S extends { ok: true; data: infer D } ? D : S;

/**
 * Helper to extract the success data type from an EndpointDef.
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
