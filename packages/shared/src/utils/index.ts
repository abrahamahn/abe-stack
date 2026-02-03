// packages/shared/src/utils/index.ts

export * as Async from './async';
export * as Cache from './cache';
export * as Search from './search';
export * as Logger from './logger';
export * as Monitor from './monitor';
export * as PubSub from './pubsub';
export * as TimeConstants from './constants';

export {
  parseCookies,
  serializeCookie,
  type CookieOptions,
  type CookieSerializeOptions,
} from './http';

export { type RequestInfo, type RouteResult, type ValidationSchema } from './http-types';

export { constantTimeCompare, generateSecureId, generateToken, generateUUID } from './crypto';

export { addAuthHeader, tokenStore, createTokenStore, type TokenStore } from './token';

export {
  checkTokenSecret,
  createJwtRotationHandler,
  decode,
  jwtDecode,
  jwtSign,
  jwtVerify,
  JwtError,
  sign,
  signWithRotation,
  verify,
  verifyWithRotation,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtRotationConfig,
  type SignOptions,
} from './jwt';

export { isPortFree, isPortListening, pickAvailablePort, uniquePorts, waitForPort } from './port';

export {
  calculateCursorPaginationMetadata,
  calculateOffsetPaginationMetadata,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
  PaginationError,
  PAGINATION_ERROR_TYPES,
  sortOrderSchema,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type PaginatedResult,
  type PaginationErrorType,
  type PaginationOptions,
} from './pagination';

export { createRateLimiter } from './rate-limit';

export { generateUniqueFilename, validateFileType } from './storage';

export {
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  normalizeWhitespace,
  padLeft,
  slugify,
  stripControlChars,
  titleCase,
  toKebabCase,
  toPascalCase,
  truncate,
} from './string';

export {
  camelToSnake,
  snakeToCamel,
  toSnakeCase,
  toCamelCase,
  toCamelCaseArray,
  snakeifyKeys,
  camelizeKeys,
  type KeyMapping,
} from './casing';
