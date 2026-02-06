// apps/server/src/http/router/router.ts
/**
 * Generic Route Registration
 *
 * DRY route registration pattern adopted from Chet-stack.
 * Eliminates repetitive boilerplate for validation and auth guards.
 *
 * The router accepts an auth guard factory as a parameter to stay
 * decoupled from the server's auth implementation.
 *
 * @example
 * ```typescript
 * const routes: RouteMap = {
 *   'auth/login': {
 *     method: 'POST',
 *     schema: loginRequestSchema,
 *     handler: handleLogin,
 *   },
 *   'users/me': {
 *     method: 'GET',
 *     auth: 'user',
 *     handler: handleMe,
 *   },
 *   'admin/unlock': {
 *     method: 'POST',
 *     schema: unlockSchema,
 *     auth: 'admin',
 *     handler: handleUnlock,
 *   },
 * };
 *
 * registerRouteMap(app, ctx, routes, {
 *   prefix: '/api',
 *   jwtSecret: config.auth.jwt.secret,
 *   authGuardFactory: createAuthGuard,
 * });
 * ```
 */

import type {
  BaseRouteDefinition,
  HandlerContext,
  RouteDefinition,
  RouteMap,
  RouterOptions,
  ValidationSchema,
} from './types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register all routes from a route map
 *
 * @param app - The Fastify instance to register routes on
 * @param ctx - The handler context (server's AppContext)
 * @param routes - The route map defining all routes
 * @param options - Router options including prefix, JWT secret, and auth guard factory
 */
export function registerRouteMap(
  app: FastifyInstance,
  ctx: HandlerContext,
  routes: RouteMap,
  options: RouterOptions,
): void {
  const { prefix = '', jwtSecret, authGuardFactory } = options;

  // Create auth guards using the injected factory
  const userGuard = authGuardFactory(jwtSecret);
  const adminGuard = authGuardFactory(jwtSecret, 'admin');

  // Group routes by auth requirement
  const publicRoutes: Array<[string, BaseRouteDefinition]> = [];
  const userRoutes: Array<[string, BaseRouteDefinition]> = [];
  const adminRoutes: Array<[string, BaseRouteDefinition]> = [];

  for (const [path, definition] of Object.entries(routes)) {
    if (definition.auth === 'admin') {
      adminRoutes.push([path, definition]);
    } else if (definition.auth === 'user') {
      userRoutes.push([path, definition]);
    } else {
      publicRoutes.push([path, definition]);
    }
  }

  // Register public routes
  for (const [path, def] of publicRoutes) {
    registerRoute(app, ctx, prefix, path, def);
  }

  // Register user-protected routes
  if (userRoutes.length > 0) {
    void app.register((instance) => {
      instance.addHook('preHandler', userGuard);
      for (const [path, def] of userRoutes) {
        registerRoute(instance, ctx, prefix, path, def);
      }
    });
  }

  // Register admin-protected routes
  if (adminRoutes.length > 0) {
    void app.register((instance) => {
      instance.addHook('preHandler', adminGuard);
      for (const [path, def] of adminRoutes) {
        registerRoute(instance, ctx, prefix, path, def);
      }
    });
  }
}

/**
 * Register a single route
 *
 * @param app - The Fastify instance (or scoped instance)
 * @param ctx - The handler context
 * @param prefix - The route prefix
 * @param path - The route path
 * @param definition - The route definition
 */
function registerRoute(
  app: FastifyInstance,
  ctx: HandlerContext,
  prefix: string,
  path: string,
  definition: BaseRouteDefinition,
): void {
  const fullPath = `${prefix}/${path}`;
  const { method, schema, handler } = definition;

  const routeHandler = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Validate body if schema provided
    if (schema !== undefined) {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        void reply.status(400).send({ message: parsed.error.message });
        return;
      }

      // Call handler with validated body
      const result = await handler(ctx, parsed.data, req as never, reply);
      void reply.status(result.status).send(result.body);
    } else {
      // Call handler without body (for GET/DELETE)
      const result = await handler(ctx, undefined as never, req as never, reply);
      void reply.status(result.status).send(result.body);
    }
  };

  // Register with appropriate method
  switch (method) {
    case 'GET':
      app.get(fullPath, routeHandler);
      break;
    case 'POST':
      app.post(fullPath, routeHandler);
      break;
    case 'PUT':
      app.put(fullPath, routeHandler);
      break;
    case 'PATCH':
      app.patch(fullPath, routeHandler);
      break;
    case 'DELETE':
      app.delete(fullPath, routeHandler);
      break;
  }
}

// ============================================================================
// Helper to create route definitions
// ============================================================================

/**
 * Helper to create a route map from an array of entries.
 * Uses array syntax to avoid naming-convention lint errors for paths with slashes.
 *
 * @param entries - Array of [path, definition] tuples
 * @returns RouteMap object
 *
 * @example
 * ```typescript
 * const routes = createRouteMap([
 *   ['auth/login', publicRoute('POST', handleLogin)],
 *   ['users/me', protectedRoute('GET', handleMe)],
 * ]);
 * ```
 */
export function createRouteMap(entries: Array<[string, BaseRouteDefinition]>): RouteMap {
  return Object.fromEntries(entries);
}

/**
 * Helper to create a public route definition with type inference
 * Returns BaseRouteDefinition for compatibility with RouteMap
 *
 * @param method - The HTTP method
 * @param handler - The route handler function
 * @param schema - Optional validation schema for request body
 * @returns BaseRouteDefinition for use in a RouteMap
 */
export function publicRoute<TBody, TResult>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: RouteDefinition<TBody, TResult>['handler'],
  schema?: RouteDefinition<TBody, TResult>['schema'],
): BaseRouteDefinition {
  const route: BaseRouteDefinition = {
    method,
    handler: handler as BaseRouteDefinition['handler'],
  };
  if (schema !== undefined) {
    route.schema = schema as ValidationSchema;
  }
  return route;
}

/**
 * Helper to create a protected route definition with type inference
 * Returns BaseRouteDefinition for compatibility with RouteMap
 *
 * @param method - The HTTP method
 * @param handler - The route handler function
 * @param auth - The required auth level ('user' or 'admin')
 * @param schema - Optional validation schema for request body
 * @returns BaseRouteDefinition with auth requirement for use in a RouteMap
 */
export function protectedRoute<TBody, TResult>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: RouteDefinition<TBody, TResult>['handler'],
  auth: 'user' | 'admin' = 'user',
  schema?: RouteDefinition<TBody, TResult>['schema'],
): BaseRouteDefinition {
  const route: BaseRouteDefinition = {
    method,
    handler: handler as BaseRouteDefinition['handler'],
    auth,
  };
  if (schema !== undefined) {
    route.schema = schema as ValidationSchema;
  }
  return route;
}
