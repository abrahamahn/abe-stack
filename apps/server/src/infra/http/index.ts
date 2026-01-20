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
export { registerCsrf, type CsrfOptions } from './csrf';
export {
  applySecurityHeaders,
  applyCors,
  handlePreflight,
  getProductionSecurityDefaults,
  type CorsOptions,
  type SecurityHeaderOptions,
} from './security';
export { registerStaticServe, type StaticServeOptions } from './static';
