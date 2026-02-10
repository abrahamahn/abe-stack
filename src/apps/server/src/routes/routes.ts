// src/apps/server/src/routes/routes.ts
/**
 * Route Registration
 *
 * Wires all route maps from @abe-stack/* packages into the Fastify server.
 * Only the system module remains local (deployment-specific health checks).
 *
 * No re-exports — consumers import directly from source packages.
 */

import { adminRoutes } from '@abe-stack/core/admin';
import { authRoutes, createAuthGuard } from '@abe-stack/core/auth';
import { billingRoutes, registerWebhookRoutes } from '@abe-stack/core/billing';
import { notificationRoutes } from '@abe-stack/core/notifications';
import { tenantRoutes } from '@abe-stack/core/tenants';
import { userRoutes } from '@abe-stack/core/users';
import { realtimeRoutes } from '@abe-stack/realtime';
import { registerRouteMap } from '@abe-stack/server-engine';

import { systemRoutes } from './system.routes';

import type { BillingBaseRouteDefinition } from '@abe-stack/core/billing';
import type {
  AuthGuardFactory,
  HandlerContext,
  RouteMap as DbRouteMap,
  RouteDefinition as DbRouteDefinition,
  RouteOpenApiMeta,
} from '@abe-stack/server-engine';
import type { AppContext } from '@shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Helper to convert route entries to db RouteMap (Map format).
 * Constructs a Map directly to avoid array variance issues in TypeScript linter.
 */
function buildRouteMap(entries: Array<[string, DbRouteDefinition]>): DbRouteMap {
  return new Map(entries);
}

/**
 * Annotate routes from shared modules with OpenAPI metadata.
 * Shared's BaseRouteDefinition doesn't include `openapi`, but the engine's
 * RouteDefinition does. This merges the metadata at the registration boundary.
 */
function annotateRoutes(
  routes: DbRouteMap | Record<string, DbRouteDefinition>,
  annotations: Record<string, RouteOpenApiMeta>,
): void {
  for (const [path, meta] of Object.entries(annotations)) {
    const route = routes instanceof Map ? routes.get(path) : routes[path];
    if (route !== undefined) {
      (route as DbRouteDefinition & { openapi?: RouteOpenApiMeta }).openapi = meta;
    }
  }
}

const AUTH_LOGIN_PATH = 'auth/login';
const USERS_ME_PATH = 'users/me';

/**
 * Register all application routes
 *
 * Uses the generic router pattern to eliminate repetitive validation code.
 * Each module defines its routes in a routes.ts file using publicRoute/protectedRoute helpers.
 */
export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  const routerOptions = {
    prefix: '/api',
    jwtSecret: ctx.config.auth.jwt.secret,
    authGuardFactory: createAuthGuard as AuthGuardFactory,
  };

  // Cast AppContext to HandlerContext for route registration
  // AppContext structurally satisfies HandlerContext (verified via AppContextSatisfiesBaseContext)
  const handlerCtx = ctx as unknown as HandlerContext;

  // OpenAPI annotations for example routes (shared modules don't include openapi on their types)
  const typedAuthRoutes = authRoutes as unknown as DbRouteMap;
  const typedUserRoutes = userRoutes as unknown as DbRouteMap;

  annotateRoutes(typedAuthRoutes, {
    [AUTH_LOGIN_PATH]: {
      summary: 'Login with email and password',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
        required: ['email', 'password'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: { type: 'object' },
          },
        },
      },
    },
  });

  annotateRoutes(typedUserRoutes, {
    [USERS_ME_PATH]: {
      summary: 'Get current user profile',
      tags: ['users'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  });

  // Core routes — already Map-based from createRouteMap(), pass directly
  registerRouteMap(app, handlerCtx, typedAuthRoutes, {
    ...routerOptions,
    module: 'auth',
  });
  registerRouteMap(app, handlerCtx, typedUserRoutes, {
    ...routerOptions,
    module: 'users',
  });
  registerRouteMap(app, handlerCtx, notificationRoutes as unknown as DbRouteMap, {
    ...routerOptions,
    module: 'notifications',
  });
  registerRouteMap(app, handlerCtx, adminRoutes as unknown as DbRouteMap, {
    ...routerOptions,
    module: 'admin',
  });
  registerRouteMap(app, handlerCtx, tenantRoutes as unknown as DbRouteMap, {
    ...routerOptions,
    module: 'tenants',
  });
  registerRouteMap(app, handlerCtx, realtimeRoutes as unknown as DbRouteMap, {
    ...routerOptions,
    module: 'realtime',
  });
  // System routes — no /api prefix (health checks, readiness, etc.)
  registerRouteMap(app, handlerCtx, systemRoutes, {
    ...routerOptions,
    prefix: '',
    module: 'system',
  });

  // Billing routes — conditional on provider configuration
  if (ctx.config.billing.enabled) {
    // Convert billing routes object to Map format expected by registerRouteMap
    // BillingRouteMap handler signature (ctx, body, req) differs from RouteHandler (ctx, body, req, reply)
    const billingRouteEntries: Array<[string, DbRouteDefinition]> = [];

    for (const [path, def] of Object.entries(billingRoutes)) {
      const billingDef: BillingBaseRouteDefinition = def;

      const adaptedHandler = async (
        handlerCtx: HandlerContext,
        body: unknown,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<unknown> => {
        // Adapt billing handler (3 params) to RouteHandler (4 params)
        // Cast handlerCtx and req to the billing-specific types since AppContext satisfies BillingAppContext
        const result = await billingDef.handler(
          handlerCtx as unknown as import('@abe-stack/core/billing').BillingAppContext,
          body,
          req as unknown as import('@abe-stack/core/billing').BillingRequest,
        );
        // BillingRouteResult contains { status, body }
        reply.status(result.status);
        return result.body;
      };

      const routeDef: DbRouteDefinition = {
        method: billingDef.method,
        handler: adaptedHandler,
        isPublic: billingDef.auth === undefined,
        ...(billingDef.auth !== undefined ? { roles: [billingDef.auth] } : {}),
      };

      billingRouteEntries.push([path, routeDef]);
    }

    registerRouteMap(app, handlerCtx, buildRouteMap(billingRouteEntries), {
      ...routerOptions,
      module: 'billing',
    });
    registerWebhookRoutes(app, ctx);
  }
}
