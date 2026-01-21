// apps/server/src/modules/index.ts
/**
 * Route Registration
 *
 * Uses the generic router pattern for DRY registration.
 * All routes are defined in their respective module route files.
 */

import { registerRouteMap } from '@router';

import { adminRoutes } from './admin/routes';
import { authRoutes } from './auth/routes';
import { notificationRoutes } from './notifications/routes';
import { realtimeRoutes } from './realtime/routes';
import { userRoutes } from './users/routes';

import type { AppContext } from '@shared/index';
import type { FastifyInstance } from 'fastify';

// Re-export modules
export { handleAdminUnlock } from './admin';
export {
  createAuthGuard,
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleVerifyEmail,
  type ReplyWithCookies,
  type RequestWithCookies,
} from './auth';
export { handleMe } from './users';
export {
  handleGetRecords,
  handleWrite,
  RecordNotFoundError,
  registerRealtimeTable,
  VersionConflictError,
} from './realtime';
export {
  handleGetPreferences,
  handleGetVapidKey,
  handleSendNotification,
  handleSubscribe,
  handleTestNotification,
  handleUnsubscribe,
  handleUpdatePreferences,
  notificationRoutes,
} from './notifications';

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
} from '@router';

// Route definitions for external use
export { adminRoutes } from './admin/routes';
export { authRoutes } from './auth/routes';
export { notificationRoutes as notificationRoutesConfig } from './notifications/routes';
export { realtimeRoutes } from './realtime/routes';
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
}
