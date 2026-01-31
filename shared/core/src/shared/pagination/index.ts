// shared/core/src/shared/pagination/index.ts
/**
 * Pagination Domain
 *
 * Cursor-based pagination utilities for database queries and in-memory arrays.
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

// Pagination error
export { PAGINATION_ERROR_TYPES, PaginationError } from './error';
export type { PaginationErrorType } from './error';

// Pagination helpers
export {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
} from './helpers';
