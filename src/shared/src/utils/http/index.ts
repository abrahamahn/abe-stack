// src/shared/src/utils/http/index.ts
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
