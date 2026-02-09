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

  // Core routes — already Map-based from createRouteMap(), pass directly
  // Cast to DbRouteMap since the route maps are created with db's createRouteMap but may be typed as shared's RouteMap
  registerRouteMap(app, handlerCtx, authRoutes as unknown as DbRouteMap, routerOptions);
  registerRouteMap(app, handlerCtx, userRoutes as unknown as DbRouteMap, routerOptions);
  registerRouteMap(app, handlerCtx, notificationRoutes as unknown as DbRouteMap, routerOptions);
  registerRouteMap(app, handlerCtx, adminRoutes as unknown as DbRouteMap, routerOptions);
  registerRouteMap(app, handlerCtx, realtimeRoutes as unknown as DbRouteMap, routerOptions);
  // System routes — no /api prefix (health checks, readiness, etc.)
  registerRouteMap(app, handlerCtx, systemRoutes, { ...routerOptions, prefix: '' });

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

    registerRouteMap(app, handlerCtx, buildRouteMap(billingRouteEntries), routerOptions);
    registerWebhookRoutes(app, ctx);
  }
}
