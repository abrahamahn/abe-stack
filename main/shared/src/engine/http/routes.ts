// main/shared/src/engine/http/routes.ts
/**
 * Route Utilities
 *
 * Framework-agnostic route helper functions.
 * These create typed route definitions that can be registered with any HTTP framework.
 */

import type {
    BaseRouteDefinition,
    HttpMethod,
    RouteHandler,
    RouteMap,
    ValidationSchema,
} from './http';

// ============================================================================
// Route Definition Helpers
// ============================================================================

/**
 * Create a public route (no authentication required).
 *
 * @param method - HTTP method
 * @param handler - Route handler function
 * @param schema - Optional validation schema for request body
 * @returns Route definition
 *
 * @example
 * ```typescript
 * const loginRoute = publicRoute('POST', handleLogin, loginRequestSchema);
 * ```
 */
export function publicRoute<TBody = unknown, TResult = unknown>(
  method: HttpMethod,
  handler: RouteHandler<TBody, TResult>,
  schema?: ValidationSchema<TBody>,
): BaseRouteDefinition {
  const result: BaseRouteDefinition = {
    method,
    handler: handler as BaseRouteDefinition['handler'],
  };
  if (schema !== undefined) {
    result.schema = schema;
  }
  return result;
}

/**
 * Create a protected route (authentication required).
 *
 * @param method - HTTP method
 * @param handler - Route handler function
 * @param schema - Optional validation schema for request body
 * @param role - Required role ('user' = any authenticated, 'admin' = admin only)
 * @returns Route definition
 *
 * @example
 * ```typescript
 * const updateProfileRoute = protectedRoute('PUT', handleUpdateProfile, updateProfileSchema);
 * const adminRoute = protectedRoute('POST', handleAdminAction, schema, 'admin');
 * ```
 */
export function protectedRoute<TBody = unknown, TResult = unknown>(
  method: HttpMethod,
  handler: RouteHandler<TBody, TResult>,
  schema?: ValidationSchema<TBody>,
  role: 'user' | 'admin' = 'user',
): BaseRouteDefinition {
  const result: BaseRouteDefinition = {
    method,
    handler: handler as BaseRouteDefinition['handler'],
    auth: role,
  };
  if (schema !== undefined) {
    result.schema = schema;
  }
  return result;
}

/**
 * Create a route map from an array of [path, definition] tuples.
 *
 * @param routes - Array of [path, route definition] tuples
 * @returns Route map object
 *
 * @example
 * ```typescript
 * const routes = createRouteMap([
 *   ['/login', publicRoute('POST', handleLogin, loginSchema)],
 *   ['/profile', protectedRoute('GET', handleGetProfile)],
 *   ['/admin/users', protectedRoute('GET', handleListUsers, undefined, 'admin')],
 * ]);
 * ```
 */
export function createRouteMap(routes: Array<[string, BaseRouteDefinition]>): RouteMap {
  return new Map(routes);
}
