// packages/core/src/contracts/types.ts
/**
 * Contract Type Definitions
 *
 * Type-safe API endpoint definitions replacing ts-rest.
 * Used by both contracts and SDK for type inference.
 */

import type { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Definition of a single API endpoint.
 * Replaces ts-rest contract structure with plain TypeScript.
 */
export interface EndpointDef<TBody = unknown, TResponse = unknown, TQuery = unknown> {
  method: HttpMethod;
  path: string;
  body?: z.ZodType<TBody>;
  query?: z.ZodType<TQuery>;
  responses: Record<number, z.ZodType<TResponse>>;
  summary?: string;
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract the success response type (200 or 201) from an endpoint definition.
 */
export type SuccessResponse<E extends EndpointDef> = E['responses'] extends {
  200: z.ZodType<infer R>;
}
  ? R
  : E['responses'] extends { 201: z.ZodType<infer R> }
    ? R
    : E['responses'] extends { 302: z.ZodType<infer R> }
      ? R
      : unknown;

/**
 * Extract the request body type from an endpoint definition.
 */
export type RequestBody<E extends EndpointDef> =
  E['body'] extends z.ZodType<infer B> ? B : undefined;

/**
 * Extract the query parameters type from an endpoint definition.
 */
export type QueryParams<E extends EndpointDef> =
  E['query'] extends z.ZodType<infer Q> ? Q : undefined;

// ============================================================================
// Contract Types
// ============================================================================

/**
 * A contract is a record of endpoint names to endpoint definitions.
 */
export type Contract = Record<string, EndpointDef>;

/**
 * A router combines multiple contracts into a namespace.
 */
export type ContractRouter = Record<string, Contract>;
