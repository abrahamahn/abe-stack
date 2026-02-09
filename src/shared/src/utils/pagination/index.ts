// src/shared/src/utils/pagination/index.ts
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

// Core pagination schemas, types, and utilities
export {
  calculateOffsetPaginationMetadata,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
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
