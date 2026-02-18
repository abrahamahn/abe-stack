// main/shared/src/system/http/http.ts
import type { HttpMethod } from '../../primitives/api';
import type { RequestInfo } from '../context/context';

export type { RequestInfo };

// ============================================================================
// Route Result
// ============================================================================

/**
 * Standard route handler result.
 * Framework-agnostic representation of an HTTP response.
 *
 * @typeParam T - The response body type
 * @param status - HTTP status code
 * @param body - Response body payload
 */
export interface RouteResult<T = unknown> {
  /** HTTP status code */
  readonly status: number;
  /** Response body payload */
  readonly body: T;
}

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Minimal schema interface for request validation.
 * Compatible with Zod and other validators that implement safeParse.
 *
 * @typeParam T - The parsed output type
 */
export interface ValidationSchema<T = unknown> {
  /** Validate data and return parsed result or error */
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: Error };
}

// ============================================================================
// Route Handler Types
// ============================================================================

export type { HttpMethod };

/**
 * Handler context type - placeholder for the actual context interface.
 * In practice, this will be satisfied by BaseContext from contracts/context.
 */
export type HandlerContext = Record<string, unknown>;

/**
 * Route handler function type.
 * Generic handler that works with any HTTP framework.
 *
 * @typeParam TBody - Request body type
 * @typeParam TResult - Response body type
 */
export type RouteHandler<TBody = unknown, TResult = unknown> = (
  ctx: HandlerContext,
  body: TBody,
  request: unknown,
  reply: unknown,
) => Promise<RouteResult<TResult>>;

/**
 * Base route definition without generics for use in RouteMap.
 * This allows mixing different typed route definitions in a single map.
 */
export interface BaseRouteDefinition {
  /** HTTP method */
  method: HttpMethod;
  /** Schema for body validation (optional for GET/DELETE) */
  schema?: ValidationSchema;
  /** Route handler */
  handler: (
    ctx: HandlerContext,
    body: unknown,
    request: unknown,
    reply: unknown,
  ) => Promise<RouteResult>;
  /** Required role (undefined = public, 'user' = any authenticated, 'admin' = admin only) */
  auth?: 'user' | 'admin';
}

/**
 * Route map (path -> definition).
 * Used to organize multiple routes into a single object.
 */
export type RouteMap = Map<string, BaseRouteDefinition>;
