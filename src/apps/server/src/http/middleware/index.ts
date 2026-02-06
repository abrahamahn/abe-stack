// apps/server/src/http/middleware/index.ts
/**
 * HTTP Middleware
 *
 * Security middleware and HTTP utilities for Fastify applications.
 */

export {
  parseCookies,
  registerCookies,
  serializeCookie,
  signCookie,
  unsignCookie,
  type CookieOptions,
  type CookiePluginOptions,
} from './cookie';
export {
  generateCorrelationId,
  registerCorrelationIdHook,
  type CorrelationIdOptions,
} from './correlationId';
export { registerCsrf, type CsrfOptions } from './csrf';
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
  type ProxyValidationConfig,
} from './proxyValidation';
export { registerRequestInfoHook, type RequestInfo } from './requestInfo';
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
} from './security';
export { registerStaticServe, type StaticServeOptions } from './static';
export {
  detectNoSQLInjection,
  detectSQLInjection,
  registerInputValidation,
  sanitizeObject as sanitizeInput,
  sanitizeString,
  type SQLInjectionDetectionOptions,
  type SanitizationResult,
  type ValidationOptions,
} from './validation';
