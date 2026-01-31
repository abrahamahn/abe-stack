// apps/server/src/routes/routes.ts
/**
 * Route Registration
 *
 * Wires all route maps from @abe-stack/* packages into the Fastify server.
 * Only the system module remains local (deployment-specific health checks).
 *
 * No re-exports — consumers import directly from source packages.
 */

import { adminRoutes } from '@abe-stack/admin';
import { authRoutes, createAuthGuard } from '@abe-stack/auth';
import { billingRoutes, registerWebhookRoutes } from '@abe-stack/billing';
import { registerRouteMap } from '@abe-stack/http';
import { notificationRoutes } from '@abe-stack/notifications';
import { realtimeRoutes } from '@abe-stack/realtime';
import { userRoutes } from '@abe-stack/users';

import { systemRoutes } from './system.routes';

import type { AuthGuardFactory, RouteMap } from '@abe-stack/http';
import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';

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

  // Core routes — always active
  registerRouteMap(app, ctx, authRoutes, routerOptions);
  registerRouteMap(app, ctx, userRoutes, routerOptions);
  registerRouteMap(app, ctx, notificationRoutes, routerOptions);
  registerRouteMap(app, ctx, systemRoutes, { ...routerOptions, prefix: '' });

  // Feature-gated routes (see apps/docs/profiles.md)
  if (ctx.config.features.admin) {
    registerRouteMap(app, ctx, adminRoutes, routerOptions);
  }

  if (ctx.config.features.realtime) {
    registerRouteMap(app, ctx, realtimeRoutes, routerOptions);
  }

  if (ctx.config.billing.enabled) {
    registerRouteMap(app, ctx, billingRoutes as unknown as RouteMap, routerOptions);
    registerWebhookRoutes(app, ctx);
  }
}
