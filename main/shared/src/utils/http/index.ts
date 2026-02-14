// main/shared/src/utils/http/index.ts
/**
 * HTTP Utilities
 *
 * Cookie handling, framework-agnostic HTTP types, and route definition helpers.
 */

export {
  parseCookies,
  serializeCookie,
  type CookieOptions,
  type CookieSerializeOptions,
} from './http';

export {
  type BaseRouteDefinition,
  type HandlerContext,
  type HttpMethod,
  type RequestInfo,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type ValidationSchema,
} from './http-types';

export { createRouteMap, protectedRoute, publicRoute } from './routes';

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
} from './proxy';

export { parseMultipartFile, type ParsedMultipartFile } from './multipart';

export { EXTRA_EXT_TO_MIME, getMimeType } from './mime';

export { extractIpAddress, extractUserAgent, getRequesterId } from './request';

export { SAFE_METHODS, CSRF_EXEMPT_PATHS, extractCsrfToken } from './csrf';
