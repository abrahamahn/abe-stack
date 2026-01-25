// packages/contracts/src/types.ts
/**
 * Contract Type Definitions
 *
 * Type-safe API endpoint definitions replacing ts-rest.
 * Used by both contracts and SDK for type inference.
 */

// ============================================================================
// Core Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Schema interface for validation.
 * Replaces zod schemas with a simple interface that supports parse/safeParse.
 */
export interface Schema<T> {
  parse: (data: unknown) => T;
  safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: Error };
  _type: T; // Phantom type for inference
}

/**
 * Definition of a single API endpoint.
 * Replaces ts-rest contract structure with plain TypeScript.
 */
export interface EndpointDef<TBody = unknown, TResponse = unknown, TQuery = unknown> {
  method: HttpMethod;
  path: string;
  body?: Schema<TBody>;
  query?: Schema<TQuery>;
  responses: Record<number, Schema<TResponse>>;
  summary?: string;
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract the success response type (200 or 201) from an endpoint definition.
 */
export type SuccessResponse<E extends EndpointDef> = E['responses'] extends {
  200: Schema<infer R>;
}
  ? R
  : E['responses'] extends { 201: Schema<infer R> }
    ? R
    : E['responses'] extends { 302: Schema<infer R> }
      ? R
      : unknown;

/**
 * Extract the request body type from an endpoint definition.
 */
export type RequestBody<E extends EndpointDef> = E['body'] extends Schema<infer B> ? B : undefined;

/**
 * Extract the query parameters type from an endpoint definition.
 */
export type QueryParams<E extends EndpointDef> = E['query'] extends Schema<infer Q> ? Q : undefined;

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

// ============================================================================
// SafeParse Result Type
// ============================================================================

/**
 * Result type for safeParse operations.
 */
export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: Error };

// ============================================================================
// Schema Factory Helpers
// ============================================================================

/**
 * Create a schema from a validation function.
 * This is the building block for all manual validation schemas.
 */
export function createSchema<T>(validate: (data: unknown) => T): Schema<T> {
  return {
    parse: validate,
    safeParse: (data: unknown): SafeParseResult<T> => {
      try {
        const result = validate(data);
        return { success: true, data: result };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    _type: undefined as unknown as T,
  };
}

/**
 * Infer the type from a schema (similar to z.infer).
 */
export type InferSchema<S> = S extends Schema<infer T> ? T : never;
