// main/shared/src/system/pagination/index.ts
/**
 * Pagination Domain
 *
 * Cursor-based and offset-based pagination utilities for database queries
 * and in-memory arrays.
 */

// Cursor encoding/decoding
export {
  createCursorForItem,
  decodeCursor,
  encodeCursor,
  getSortableValue,
  isCursorValue,
} from './cursor';
export type { CursorData } from './cursor';

// Pagination helpers
export {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
} from './helpers';

// HTTP parsing utilities
export {
  DEFAULT_PAGINATION_PARAMS,
  getQueryParam,
  parseLimitParam,
  parsePageParam,
  parseSortByParam,
  parseSortOrderParam,
  type PaginationParamNames,
  type PaginationParseConfig,
} from './http';

// Core pagination schemas, types, and utilities
export {
  calculateOffsetPaginationMetadata,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  paginatedResultSchema,
  PAGINATION_ERROR_TYPES,
  PaginationError,
  paginationOptionsSchema,
  sortOrderSchema,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type PaginatedResult,
  type PaginationErrorType,
  type PaginationOptions,
} from './pagination';
