// src/shared/src/utils/index.ts

export * as Async from './async';
export * as Cache from './cache';
export * as TimeConstants from './constants';
export * as Logger from './logger';
export * as Monitor from './monitor';
export * as PubSub from './pubsub';
export * as Search from './search';

export { formatDate, formatDateTime, formatTimeAgo, toISODateOnly, toISOStringOrNull } from './date';

export { deepEqual } from './comparison';

export {
  parseCookies,
  serializeCookie,
  type CookieOptions,
  type CookieSerializeOptions,
} from './http/http';

export { type RequestInfo, type RouteResult, type ValidationSchema } from './http/http-types';

export {
  constantTimeCompare,
  generateSecureId,
  generateToken,
  generateUUID,
} from './crypto/crypto';

export { addAuthHeader, createTokenStore, tokenStore, type TokenStore } from './crypto/token';

export {
  PAGINATION_ERROR_TYPES,
  PaginationError,
  calculateCursorPaginationMetadata,
  calculateOffsetPaginationMetadata,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
  sortOrderSchema,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type PaginatedResult,
  type PaginationErrorType,
  type PaginationOptions,
} from './pagination';

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

export { createRateLimiter } from './rate-limit';

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
  camelToSnake,
  camelizeKeys,
  snakeToCamel,
  snakeifyKeys,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
  type KeyMapping,
} from './string/casing';
