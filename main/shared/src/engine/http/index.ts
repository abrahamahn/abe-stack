// main/shared/src/engine/http/index.ts
/**
 * HTTP Utilities
 *
 * Cookie handling, framework-agnostic HTTP types, and route definition helpers.
 */

export {
    parseCookies,
    serializeCookie, type CookieOptions, type CookieSerializeOptions
} from './cookies';
export {
    type BaseRouteDefinition, type HandlerContext,
    type HttpMethod,
    type RequestInfo,
    type RouteHandler,
    type RouteMap,
    type RouteResult,
    type ValidationSchema
} from './http';

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
    type ProxyValidationConfig
} from './proxy';

export { parseMultipartFile, type ParsedMultipartFile } from './multipart';

export { extractIpAddress, extractUserAgent, getRequesterId } from './request';

export { extractCsrfToken } from './csrf';

export { extractBearerToken } from './auth';

export {
    apiResultSchema,
    createErrorCodeSchema,
    emptyBodySchema,
    envelopeErrorResponseSchema,
    errorCodeSchema,
    errorResponseSchema,
    simpleErrorResponseSchema,
    successResponseSchema,
    type ApiResultEnvelope,
    type EmptyBody,
    type ErrorResponse,
    type ErrorResponseEnvelope,
    type SuccessResponseEnvelope,
} from './response';

