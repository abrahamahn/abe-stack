// infra/src/http/middleware/index.ts
/**
 * HTTP Middleware
 *
 * Security middleware and HTTP utilities for Fastify applications.
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
export {
  registerInputValidation,
  sanitizeString,
  sanitizeObject as sanitizeInput,
  detectSQLInjection,
  detectNoSQLInjection,
  type ValidationOptions,
  type SanitizationResult,
  type SQLInjectionDetectionOptions,
} from './validation';
