// packages/http/src/router/index.ts
/**
 * Generic Route Registration Module
 *
 * DRY route registration pattern adopted from Chet-stack.
 * Reduces boilerplate for validation, auth guards, and error handling.
 *
 * The router is decoupled from the server's auth implementation
 * by accepting an auth guard factory as a parameter.
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
 *   authGuardFactory: createAuthGuard,
 * });
 */

// Types
export type {
  AuthGuardFactory,
  AuthGuardHook,
  BaseRouteDefinition,
  HandlerContext,
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
export { createRouteMap, protectedRoute, publicRoute, registerRouteMap } from './router';
