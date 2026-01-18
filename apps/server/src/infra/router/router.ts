// apps/server/src/infra/router/router.ts
/**
 * Generic Route Registration
 *
 * DRY route registration pattern adopted from Chet-stack.
 * Eliminates repetitive boilerplate for validation and auth guards.
 *
 * @example
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
 * registerRoutes(app, ctx, routes, { prefix: '/api', jwtSecret: config.auth.jwt.secret });
 */

import { createAuthGuard } from '@auth/middleware';
import { type AppContext } from '@shared';

import type { RouteDefinition, RouteMap, RouterOptions } from './types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register all routes from a route map
 */
export function registerRouteMap(
  app: FastifyInstance,
  ctx: AppContext,
  routes: RouteMap,
  options: RouterOptions,
): void {
  const { prefix = '', jwtSecret } = options;

  // Create auth guards
  const userGuard = createAuthGuard(jwtSecret);
  const adminGuard = createAuthGuard(jwtSecret, 'admin');

  // Group routes by auth requirement
  const publicRoutes: Array<[string, RouteDefinition]> = [];
  const userRoutes: Array<[string, RouteDefinition]> = [];
  const adminRoutes: Array<[string, RouteDefinition]> = [];

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
 */
function registerRoute(
  app: FastifyInstance,
  ctx: AppContext,
  prefix: string,
  path: string,
  definition: RouteDefinition,
): void {
  const fullPath = `${prefix}/${path}`;
  const { method, schema, handler } = definition;

  const routeHandler = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Validate body if schema provided
    if (schema) {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        const errorMessage = parsed.error.issues[0]?.message ?? 'Invalid input';
        void reply.status(400).send({ message: errorMessage });
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
 * Helper to create a public route definition with type inference
 */
export function publicRoute<TBody, TResult>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: RouteDefinition<TBody, TResult>['handler'],
  schema?: RouteDefinition<TBody, TResult>['schema'],
): RouteDefinition<TBody, TResult> {
  return { method, handler, schema };
}

/**
 * Helper to create a protected route definition with type inference
 */
export function protectedRoute<TBody, TResult>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: RouteDefinition<TBody, TResult>['handler'],
  auth: 'user' | 'admin' = 'user',
  schema?: RouteDefinition<TBody, TResult>['schema'],
): RouteDefinition<TBody, TResult> {
  return { method, handler, schema, auth };
}
