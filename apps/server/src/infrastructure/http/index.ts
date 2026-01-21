// apps/server/src/infrastructure/http/index.ts
/**
 * HTTP Layer
 *
 * HTTP-related infrastructure:
 * - middleware: Security headers, CORS, CSRF, cookies, validation
 * - router: Route registration and handler utilities
 * - pagination: Cursor-based pagination
 */

// Middleware - Cookies
export {
  parseCookies,
  registerCookies,
  serializeCookie,
  signCookie,
  unsignCookie,
  type CookieOptions,
  type CookiePluginOptions,
} from './middleware';

// Middleware - Correlation ID
export {
  generateCorrelationId,
  registerCorrelationIdHook,
  type CorrelationIdOptions,
} from './middleware';

// Middleware - CSRF
export {
  registerCsrf,
  validateCsrfToken,
  type CsrfOptions,
  type CsrfValidationOptions,
} from './middleware';

// Middleware - Security
export {
  applyCors,
  applySecurityHeaders,
  getProductionSecurityDefaults,
  handlePreflight,
  hasDangerousKeys,
  registerPrototypePollutionProtection,
  sanitizeObject,
  type CorsOptions,
  type SecurityHeaderOptions,
} from './middleware';

// Middleware - Static & Request Info
export {
  registerRequestInfoHook,
  registerStaticServe,
  type RequestInfo,
  type StaticServeOptions,
} from './middleware';

// Router
export {
  protectedRoute,
  publicRoute,
  registerRouteMap,
  type BaseRouteDefinition,
  type HttpMethod,
  type ProtectedHandler,
  type PublicHandler,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type RouterOptions,
  type ValidationSchema,
} from './router';

// Pagination
export {
  createPaginationHelpers,
  createPaginationMiddleware,
  type PaginationContext,
  type PaginationHelpers,
  type PaginationMiddlewareOptions,
  type PaginationRequest,
} from './pagination';
