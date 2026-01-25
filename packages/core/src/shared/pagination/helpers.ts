// packages/core/src/shared/pagination/helpers.ts
import { createCursorForItem, decodeCursor, getSortableValue } from './cursor';
import { PaginationError } from './error';

import type { CursorPaginationOptions, SortOrder } from '@abe-stack/contracts/pagination';
import type { CursorData } from './cursor';

/**
 * Builds SQL WHERE clause and ORDER BY for cursor-based pagination
 * Returns the SQL fragments and parameters for safe query building
 */
export function buildCursorPaginationQuery(
  cursor: string | undefined,
  sortBy: string,
  sortOrder: SortOrder,
  tieBreakerField: string = 'id',
): {
  whereClause: string;
  orderByClause: string;
  params: unknown[];
} {
  const params: unknown[] = [];
  let whereClause = '';

  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      throw new PaginationError('INVALID_CURSOR', `Invalid cursor provided: ${cursor}`);
    }

    // Validate cursor data matches current sort configuration
    if (cursorData.sortOrder !== sortOrder) {
      throw new PaginationError(
        'CURSOR_SORT_MISMATCH',
        `Cursor sort order '${cursorData.sortOrder}' does not match requested sort order '${sortOrder}'`,
      );
    }

    const operator = sortOrder === 'asc' ? '>' : '<';

    // Handle cursor pagination logic
    // (sort_value, tie_breaker) > (<cursor_value>, <cursor_tie_breaker>)
    // OR (sort_value = <cursor_value> AND tie_breaker > <cursor_tie_breaker>)
    whereClause = `(
      (${sortBy} ${operator} $1) OR
      (${sortBy} = $1 AND ${tieBreakerField} ${operator} $2)
    )`;

    params.push(cursorData.value, cursorData.tieBreaker);
  }

  const orderByClause = `${sortBy} ${sortOrder.toUpperCase()}, ${tieBreakerField} ${sortOrder.toUpperCase()}`;

  return {
    whereClause,
    orderByClause,
    params,
  };
}

/**
 * Calculates pagination metadata for cursor-based results
 */
export function calculateCursorPaginationMetadata<T extends Record<string, unknown>>(
  items: T[],
  requestedLimit: number,
  sortBy: string,
  sortOrder: SortOrder,
  tieBreakerField: keyof T = 'id' as keyof T,
): {
  hasNext: boolean;
  nextCursor: string | null;
} {
  const hasNext = items.length > requestedLimit;

  // Remove the extra item used for hasNext calculation
  const actualItems = hasNext ? items.slice(0, -1) : items;

  const lastItem = actualItems[actualItems.length - 1];
  const nextCursor =
    hasNext && lastItem !== undefined
      ? createCursorForItem(lastItem, sortBy, sortOrder, tieBreakerField)
      : null;

  return {
    hasNext,
    nextCursor,
  };
}

/**
 * Applies cursor-based pagination to an array of items
 * Useful for in-memory pagination or testing
 */
export function paginateArrayWithCursor<T extends Record<string, unknown>>(
  items: T[],
  options: CursorPaginationOptions,
  sortBy: string = 'id',
  tieBreakerField: keyof T = 'id' as keyof T,
): {
  data: T[];
  nextCursor: string | null;
  hasNext: boolean;
} {
  const { cursor, limit, sortOrder } = options;
  const effectiveSortBy = options.sortBy ?? sortBy;

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    const aValue = getSortableValue(a, effectiveSortBy);
    const bValue = getSortableValue(b, effectiveSortBy);

    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;

    if (comparison === 0) {
      // Use tie-breaker
      const aTieBreaker = String(getSortableValue(a, String(tieBreakerField)));
      const bTieBreaker = String(getSortableValue(b, String(tieBreakerField)));
      comparison = aTieBreaker.localeCompare(bTieBreaker);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Find start index from cursor
  let startIndex = 0;
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      const cursorIndex = sortedItems.findIndex((item) => {
        const itemValue = getSortableValue(item, effectiveSortBy);
        const itemTieBreaker = String(getSortableValue(item, String(tieBreakerField)));

        if (sortOrder === 'asc') {
          return (
            itemValue > cursorData.value ||
            (itemValue === cursorData.value && itemTieBreaker > cursorData.tieBreaker)
          );
        } else {
          return (
            itemValue < cursorData.value ||
            (itemValue === cursorData.value && itemTieBreaker < cursorData.tieBreaker)
          );
        }
      });
      startIndex = cursorIndex === -1 ? sortedItems.length : cursorIndex;
    }
  }

  // Get items with one extra to determine hasNext
  const endIndex = startIndex + limit + 1;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  const metadata = calculateCursorPaginationMetadata(
    paginatedItems,
    limit,
    effectiveSortBy,
    sortOrder,
    tieBreakerField,
  );

  return {
    data: paginatedItems.slice(0, limit),
    nextCursor: metadata.nextCursor,
    hasNext: metadata.hasNext,
  };
}

/**
 * Efficiently sorts items for large datasets
 */
function sortItemsEfficiently<T extends Record<string, unknown>>(
  items: T[],
  sortBy: string,
  sortOrder: SortOrder,
  tieBreakerField: keyof T,
): T[] {
  return [...items].sort((a, b) => {
    const aValue = getSortableValue(a, sortBy);
    const bValue = getSortableValue(b, sortBy);

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;

    // Use tie-breaker for stable sort
    const aTieBreaker = String(getSortableValue(a, String(tieBreakerField)));
    const bTieBreaker = String(getSortableValue(b, String(tieBreakerField)));
    const tieBreakerComparison = aTieBreaker.localeCompare(bTieBreaker);

    return sortOrder === 'asc' ? tieBreakerComparison : -tieBreakerComparison;
  });
}

/**
 * Binary search for cursor position in large sorted arrays
 */
function findCursorIndexBinary<T extends Record<string, unknown>>(
  sortedItems: T[],
  cursorData: CursorData,
  sortBy: string,
  sortOrder: SortOrder,
  tieBreakerField: keyof T,
): number {
  let left = 0;
  let right = sortedItems.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const item = sortedItems[mid];

    if (!item) break;

    const itemValue = getSortableValue(item, sortBy);
    const itemTieBreaker = String(getSortableValue(item, String(tieBreakerField)));

    let shouldContinue = false;

    if (sortOrder === 'asc') {
      shouldContinue =
        itemValue < cursorData.value ||
        (itemValue === cursorData.value && itemTieBreaker <= cursorData.tieBreaker);
    } else {
      shouldContinue =
        itemValue > cursorData.value ||
        (itemValue === cursorData.value && itemTieBreaker >= cursorData.tieBreaker);
    }

    if (shouldContinue) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

/**
 * Performance-optimized version for large arrays
 * Uses binary search for cursor positioning
 */
export function paginateLargeArrayWithCursor<T extends Record<string, unknown>>(
  items: T[],
  options: CursorPaginationOptions,
  sortBy: string = 'id',
  tieBreakerField: keyof T = 'id' as keyof T,
): {
  data: T[];
  nextCursor: string | null;
  hasNext: boolean;
} {
  const { cursor, limit, sortOrder } = options;
  const effectiveSortBy = options.sortBy ?? sortBy;

  // Sort items efficiently
  const sortedItems = sortItemsEfficiently(items, effectiveSortBy, sortOrder, tieBreakerField);

  // Find start index using binary search
  let startIndex = 0;
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      startIndex = findCursorIndexBinary(
        sortedItems,
        cursorData,
        effectiveSortBy,
        sortOrder,
        tieBreakerField,
      );
    }
  }

  // Get items with one extra to determine hasNext
  const endIndex = Math.min(startIndex + limit + 1, sortedItems.length);
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  const metadata = calculateCursorPaginationMetadata(
    paginatedItems,
    limit,
    effectiveSortBy,
    sortOrder,
    tieBreakerField,
  );

  return {
    data: paginatedItems.slice(0, limit),
    nextCursor: metadata.nextCursor,
    hasNext: metadata.hasNext,
  };
}
