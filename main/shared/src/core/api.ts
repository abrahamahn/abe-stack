// main/shared/src/core/api.ts
/**
 * API Contract Types
 *
 * Core definitions for the type-safe API system.
 * Replaces ts-rest contract structure with plain TypeScript.
 */

import type { ErrorCode } from './constants';
import type { Schema } from '../types/schema';

// Re-export schema types from L0
export type { InferSchema, SafeParseResult, Schema } from '../types/schema';

// ============================================================================
// Endpoint Definitions
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Definition of a single API endpoint.
 */
export interface EndpointDef<TBody = unknown, TResponse = unknown, TQuery = unknown> {
  method: HttpMethod;
  path: string;
  body?: Schema<TBody>;
  query?: Schema<TQuery>;
  responses: Record<string, Schema<TResponse>>;
  summary?: string;
}

/**
 * Alias for EndpointDef for backward compatibility.
 */
export type EndpointContract<TBody = unknown, TResponse = unknown, TQuery = unknown> = EndpointDef<
  TBody,
  TResponse,
  TQuery
>;

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
type InferOkData<S> = S extends { ok: true; data: infer D } ? D : S;

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

// ============================================================================
// Service Interfaces (Ports - Hexagonal Architecture)
// ============================================================================

/**
 * Generic Logger interface.
 */
export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  info(data: Record<string, unknown>, msg: string): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  warn(data: Record<string, unknown>, msg: string): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
  error(data: unknown, msg?: string): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  debug(data: Record<string, unknown>, msg: string): void;
  trace?(msg: string, data?: Record<string, unknown>): void;
  trace?(data: Record<string, unknown>, msg: string): void;
  fatal?(msg: string | Error, data?: Record<string, unknown>): void;
  fatal?(data: Record<string, unknown>, msg: string): void;
  child?(bindings: Record<string, unknown>): Logger;
}

/** Backward-compatible alias used by server packages. */
export type ServerLogger = Logger;
