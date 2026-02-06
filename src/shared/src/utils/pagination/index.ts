// packages/shared/src/utils/pagination/index.ts
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

// Pagination error — re-exported from parent pagination.ts
// (error.ts was removed as duplicate; PaginationError lives in ../pagination.ts)

// Pagination helpers
export {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
} from './helpers';
