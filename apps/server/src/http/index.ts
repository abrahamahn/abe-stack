// infra/src/http/index.ts
/**
 * HTTP Layer Package
 *
 * Framework-agnostic HTTP infrastructure:
 * - middleware: Security headers, CORS, CSRF, cookies, validation
 * - router: Generic route registration with auth guard injection
 * - pagination: Offset-based and cursor-based pagination
 * - plugins: Composable plugin registration with dependency injection
 */

// Configuration
export { loadServerConfig } from './config';

// Middleware - Cookies
export {
    parseCookies,
    registerCookies,
    serializeCookie,
    signCookie,
    unsignCookie,
    type CookieOptions,
    type CookiePluginOptions
} from './middleware';

// Middleware - Correlation ID
export {
    generateCorrelationId,
    registerCorrelationIdHook,
    type CorrelationIdOptions
} from './middleware';

// Middleware - CSRF
export {
    registerCsrf,
    validateCsrfToken,
    type CsrfOptions,
    type CsrfValidationOptions
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
    type SecurityHeaderOptions
} from './middleware';

// Middleware - Static & Request Info
export {
    registerRequestInfoHook,
    registerStaticServe,
    type RequestInfo,
    type StaticServeOptions
} from './middleware';

// Middleware - Proxy Validation
export {
    getValidatedClientIp,
    ipMatchesCidr,
    isFromTrustedProxy,
    isValidIp,
    isValidIpv4,
    isValidIpv6,
    parseCidr,
    parseXForwardedFor,
    validateCidrList,
    type ForwardedInfo,
    type ProxyValidationConfig
} from './middleware';

// Middleware - Input Validation
export {
    detectNoSQLInjection,
    detectSQLInjection,
    registerInputValidation, sanitizeInput, sanitizeString, type SQLInjectionDetectionOptions, type SanitizationResult, type ValidationOptions
} from './middleware';

// Router
export {
    createRouteMap,
    protectedRoute,
    publicRoute,
    registerRouteMap,
    type AuthGuardFactory,
    type AuthGuardHook,
    type BaseRouteDefinition,
    type HandlerContext,
    type HttpMethod,
    type ProtectedHandler,
    type PublicHandler,
    type RouteDefinition,
    type RouteHandler,
    type RouteMap,
    type RouteResult,
    type RouterOptions,
    type ValidationSchema
} from './router';

// Pagination
export {
    createPaginationHelpers,
    createPaginationMiddleware,
    type PaginationContext,
    type PaginationHelpers,
    type PaginationMiddlewareOptions,
    type PaginationRequest
} from './pagination';

// Plugins
export {
    registerPlugins,
    type AppErrorInfo,
    type PluginOptions, type RateLimiterLike, type StaticServeConfig
} from './plugins';
