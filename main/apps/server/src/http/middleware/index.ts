// main/apps/server/src/http/middleware/index.ts
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
export {
  DEFAULT_LOCALE,
  parseAcceptLanguage,
  registerLocaleHook,
  resolveLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from './locale';
export { registerRequestInfoHook, type RequestInfo } from './requestInfo';
export {
  applyApiCacheHeaders,
  applyCors,
  applySecurityHeaders,
  getProductionSecurityDefaults,
  handlePreflight,
  hasDangerousKeys,
  registerPrototypePollutionProtection,
  sanitizePrototype,
  type CorsOptions,
  type SecurityHeaderOptions,
} from './security';
export { registerStaticServe, type StaticServeOptions } from './static';
export {
  parseMultipartFile,
  registerMultipartFormParser,
  type ParsedMultipartFile,
} from './multipart';
export {
  detectNoSQLInjection,
  detectSQLInjection,
  getInjectionErrors,
  registerInputValidation,
  sanitizeObject,
  sanitizeString,
  type SQLInjectionDetectionOptions,
  type SanitizationResult,
  type ValidationOptions,
} from './validation';
