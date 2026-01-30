// apps/server/src/modules/routes.ts
/**
 * Route Registration
 *
 * Wires all route maps from @abe-stack/* packages into the Fastify server.
 * Only the system module remains local (deployment-specific health checks).
 *
 * No re-exports — consumers import directly from source packages.
 */

import { authRoutes } from '@abe-stack/auth';
import { billingRoutes, registerWebhookRoutes } from '@abe-stack/billing';
import { notificationRoutes } from '@abe-stack/notifications';
import { realtimeRoutes } from '@abe-stack/realtime';
import { userRoutes } from '@abe-stack/users';

import { adminRoutes } from '@abe-stack/admin';
import { systemRoutes } from './system/routes';

import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';

import { registerRouteMap } from '@/infrastructure/http/router';

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
  };

  // Register all route maps - validation and auth guards are handled automatically
  registerRouteMap(app, ctx, authRoutes, routerOptions);
  registerRouteMap(app, ctx, userRoutes, routerOptions);
  registerRouteMap(app, ctx, adminRoutes, routerOptions);
  registerRouteMap(app, ctx, realtimeRoutes, routerOptions);
  registerRouteMap(app, ctx, notificationRoutes, routerOptions);
  registerRouteMap(app, ctx, systemRoutes, { ...routerOptions, prefix: '' }); // System routes handle their own prefixes (some are /, some /api)

  // Billing routes (only if billing is enabled)
  if (ctx.config.billing.enabled) {
    registerRouteMap(app, ctx, billingRoutes, routerOptions);
  }

  // Webhook routes (registered separately for raw body access)
  registerWebhookRoutes(app, ctx);
}
