// apps/server/src/modules/routes.ts
/**
 * Route Registration
 *
 * Uses the generic router pattern for DRY registration.
 * Route maps are imported directly from @abe-stack/* packages.
 * Only server-specific modules (admin, billing, system, users)
 * use local imports.
 */

import { authRoutes } from '@abe-stack/auth';
import { notificationRoutes } from '@abe-stack/notifications';
import { realtimeRoutes } from '@abe-stack/realtime';


import { adminRoutes } from './admin/routes';
import { billingRoutes, registerWebhookRoutes } from './billing';
import { systemRoutes } from './system/routes';
import { userRoutes } from './users/routes';

import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';

import { registerRouteMap } from '@/infrastructure/http/router';

// Re-export server-specific modules only
export { handleAdminUnlock } from './admin';
export { handleMe } from './users/handlers';

// Generic route registration (Chet-stack pattern)
export {
  protectedRoute,
  publicRoute,
  registerRouteMap,
  type HttpMethod,
  type ProtectedHandler,
  type PublicHandler,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type RouterOptions,
  type ValidationSchema,
} from '@/infrastructure/http/router';

// Route definitions for external use
export { adminRoutes } from './admin/routes';
export { authRoutes } from '@abe-stack/auth';
export { notificationRoutes as notificationRoutesConfig } from '@abe-stack/notifications';
export { realtimeRoutes } from '@abe-stack/realtime';
export { systemRoutes } from './system/routes';
export { userRoutes } from './users/routes';

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
