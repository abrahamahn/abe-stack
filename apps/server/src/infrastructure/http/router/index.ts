// apps/server/src/infrastructure/http/router/index.ts
/**
 * Generic Route Registration Module
 *
 * DRY route registration pattern adopted from Chet-stack.
 * Reduces boilerplate for validation, auth guards, and error handling.
 *
 * @example
 * const authRoutes: RouteMap = {
 *   'auth/login': {
 *     method: 'POST',
 *     schema: loginRequestSchema,
 *     handler: handleLogin,
 *   },
 *   'auth/logout': {
 *     method: 'POST',
 *     auth: 'user',
 *     handler: handleLogout,
 *   },
 * };
 *
 * registerRouteMap(app, ctx, authRoutes, {
 *   prefix: '/api',
 *   jwtSecret: config.auth.jwt.secret,
 * });
 */

// Types
export type {
  BaseRouteDefinition,
  HttpMethod,
  ProtectedHandler,
  PublicHandler,
  RouteDefinition,
  RouteHandler,
  RouteMap,
  RouteResult,
  RouterOptions,
  ValidationSchema,
} from './types';

// Router
export { protectedRoute, publicRoute, registerRouteMap } from './router';
