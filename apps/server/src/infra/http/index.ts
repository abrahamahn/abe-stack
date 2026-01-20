// apps/server/src/infra/http/index.ts
/**
 * HTTP Infrastructure
 *
 * Security middleware and HTTP utilities.
 */

export {
  parseCookies,
  signCookie,
  unsignCookie,
  serializeCookie,
  registerCookies,
  type CookieOptions,
  type CookiePluginOptions,
} from './cookie';
export {
  registerCorrelationIdHook,
  generateCorrelationId,
  type CorrelationIdOptions,
} from './correlationId';
export {
  registerCsrf,
  validateCsrfToken,
  type CsrfOptions,
  type CsrfValidationOptions,
} from './csrf';
export {
  applySecurityHeaders,
  applyCors,
  handlePreflight,
  getProductionSecurityDefaults,
  sanitizeObject,
  hasDangerousKeys,
  registerPrototypePollutionProtection,
  type CorsOptions,
  type SecurityHeaderOptions,
} from './security';
export { registerStaticServe, type StaticServeOptions } from './static';
export { registerRequestInfoHook, type RequestInfo } from './requestInfo';
