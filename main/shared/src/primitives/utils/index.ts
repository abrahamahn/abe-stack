// main/shared/src/utils/index.ts

export * as PubSub from '../../engine/pubsub';
export * as Security from '../../engine/security/prototype';
export * as Logger from '../../logger';
export * as Async from './async';
export * as Cache from './cache';
export * as TimeConstants from './constants';
export * as Monitor from './monitor';
export * as Search from './search';

export {
  formatDate,
  formatDateTime,
  formatTimeAgo,
  toISODateOnly,
  toISOStringOrNull,
} from './date';

export { deepEqual } from './comparison';

export {
  parseCookies,
  serializeCookie,
  type CookieOptions,
  type CookieSerializeOptions,
} from './http/http';

export { type RequestInfo, type RouteResult, type ValidationSchema } from './http/http-types';

export { CSRF_EXEMPT_PATHS, extractCsrfToken, SAFE_METHODS } from './http/csrf';
export { EXTRA_EXT_TO_MIME, getMimeType } from './http/mime';
export { parseMultipartFile, type ParsedMultipartFile } from './http/multipart';
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
} from './http/proxy';
export { extractIpAddress, extractUserAgent, getRequesterId } from './http/request';

export {
  detectNoSQLInjection,
  detectSQLInjection,
  isValidInputKeyName,
  sanitizeString,
  type SQLInjectionDetectionOptions,
} from '../../engine/security/input';
export { hasDangerousKeys, sanitizePrototype } from '../../engine/security/prototype';

export {
  getInjectionErrors,
  sanitizeObject,
  type SanitizationResult,
  type ValidationOptions,
} from '../../engine/security/sanitization';

export {
  constantTimeCompare,
  generateSecureId,
  generateToken,
  generateUUID,
} from '../../engine/crypto/crypto';

export {
  addAuthHeader,
  createTokenStore,
  tokenStore,
  type TokenStore,
} from '../../engine/crypto/token';

export {
  calculateCursorPaginationMetadata,
  calculateOffsetPaginationMetadata,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  getQueryParam,
  paginatedResultSchema,
  PAGINATION_ERROR_TYPES,
  PaginationError,
  paginationOptionsSchema,
  parseLimitParam,
  parsePageParam,
  parseSortByParam,
  parseSortOrderParam,
  sortOrderSchema,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type PaginatedResult,
  type PaginationErrorType,
  type PaginationOptions,
  type PaginationParamNames,
  type PaginationParseConfig,
} from '../../engine/pagination';

export {
  formatKeyBinding,
  isEditableElement,
  isMac,
  matchesAnyBinding,
  matchesKeyBinding,
  matchesModifiers,
  parseKeyBinding,
  type KeyModifiers,
  type ParsedKeyBinding,
} from './keyboard';

export { createRateLimiter, type RateLimitInfo } from '../../engine/security/rate-limit';

export {
  ALLOWED_IMAGE_TYPES,
  generateUniqueFilename,
  joinStoragePath,
  MAX_IMAGE_SIZE,
  normalizeStoragePath,
  validateFileType,
} from './storage';

export { parseUserAgent, type ParsedUserAgent } from './user-agent';

export {
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  formatBytes,
  normalizeWhitespace,
  padLeft,
  slugify,
  stripControlChars,
  titleCase,
  toKebabCase,
  toPascalCase,
  truncate,
} from './string/string';

export {
  camelizeKeys,
  camelToSnake,
  snakeifyKeys,
  snakeToCamel,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
  type KeyMapping,
} from './string/casing';
