// main/server/system/src/routing/routing.ts
/**
 * Route Definitions
 *
 * Framework-agnostic route map helpers. Defines the handler contract
 * using abstract HttpRequest/HttpReply interfaces.
 *
 * Fastify-specific registration lives in apps/server/src/http/router.ts.
 *
 * @module routing
 */

import type { HttpMethod } from './types';
import type { HttpReply, HttpRequest } from './http.types';
import type { BaseContext } from '@bslt/shared/system';

/**
 * Handler context type backed by the shared BaseContext contract.
 *
 * All handler contexts provide `db`, `repos`, and `log` at minimum.
 * Concrete contexts (e.g. AppContext) structurally satisfy this via
 * TypeScript structural subtyping -- no casting needed.
 */
export type HandlerContext = BaseContext;

export type RouteResult<T = unknown> = T;

export type RouteHandler<Body = unknown, Response = unknown> = (
  ctx: HandlerContext,
  body: Body,
  req: HttpRequest,
  reply: HttpReply,
) => Promise<RouteResult<Response>> | RouteResult<Response>;

export type { HttpMethod } from './types';

/**
 * Validation schema interface compatible with `@bslt/shared` Schema<T>.
 * Accepts objects with `parse` and `safeParse` methods (e.g.,
 * custom Schema<T> from shared contracts).
 *
 * @complexity O(1)
 */
export interface ValidationSchema {
  parse: (data: unknown) => unknown;
  safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: unknown };
}

/**
 * Union type for all accepted schema formats.
 * ValidationSchema: validated via safeParse in the handler wrapper.
 * Record<string, unknown>: a raw JSON Schema object for framework-native validation.
 */
export type RouteSchema = ValidationSchema | Record<string, unknown>;

/** JSON Schema object for OpenAPI route metadata */
export interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

/** OpenAPI metadata that can be attached to a route */
export interface RouteOpenApiMeta {
  summary?: string;
  description?: string;
  tags?: string[];
  body?: JsonSchemaObject;
  params?: JsonSchemaObject;
  querystring?: JsonSchemaObject;
  response?: Record<number, JsonSchemaObject>;
  hide?: boolean;
  /** OpenAPI security requirements. Set to `[]` for explicitly unsecured routes. */
  security?: Array<Record<string, string[]>>;
}

/** Deprecation metadata for sunset routes */
export interface RouteDeprecation {
  /** ISO 8601 date when the route will be removed */
  sunset?: string;
  /** Human-readable deprecation message */
  message?: string;
}

export interface RouteDefinition {
  method: HttpMethod;
  handler: RouteHandler;
  isPublic: boolean;
  roles?: string[];
  schema?: RouteSchema;
  /** Optional OpenAPI metadata for swagger docs */
  openapi?: RouteOpenApiMeta;
  /** Mark route as deprecated — adds Sunset and Deprecation response headers */
  deprecated?: RouteDeprecation;
}

export type RouteMap = Map<string, RouteDefinition>;

/**
 * Create a RouteMap from an array of [path, definition] tuples.
 * @param routes - Array of [path, RouteDefinition] entries
 * @returns Map of path to RouteDefinition
 * @complexity O(n) where n is number of routes
 */
export function createRouteMap(routes: [string, RouteDefinition][]): RouteMap {
  return new Map(routes);
}

/**
 * Create a public (unauthenticated) route definition.
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param handler - Route handler function
 * @param schema - Optional validation schema
 * @returns RouteDefinition marked as public
 * @complexity O(1)
 */
export function publicRoute<Body = unknown, Response = unknown>(
  method: HttpMethod,
  handler: RouteHandler<Body, Response>,
  schema?: RouteSchema,
  openapi?: RouteOpenApiMeta,
): RouteDefinition {
  return {
    method,
    handler: handler as RouteHandler,
    isPublic: true,
    ...(schema !== undefined ? { schema } : {}),
    ...(openapi !== undefined ? { openapi } : {}),
  };
}

/**
 * Create a protected (authenticated) route definition.
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param handler - Route handler function
 * @param roles - Required roles (string or array)
 * @param schema - Optional validation schema
 * @returns RouteDefinition marked as protected with roles
 * @complexity O(1)
 */
export function protectedRoute<Body = unknown, Response = unknown>(
  method: HttpMethod,
  handler: RouteHandler<Body, Response>,
  roles: string | string[] = [],
  schema?: RouteSchema,
  openapi?: RouteOpenApiMeta,
): RouteDefinition {
  return {
    method,
    handler: handler as RouteHandler,
    isPublic: false,
    roles: Array.isArray(roles) ? roles : roles !== '' ? [roles] : [],
    ...(schema !== undefined ? { schema } : {}),
    ...(openapi !== undefined ? { openapi } : {}),
  };
}
