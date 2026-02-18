// main/shared/src/engine/pagination/helpers.ts
import { createCursorForItem, decodeCursor, getSortableValue } from './cursor';
import { PaginationError } from './pagination';

import type { CursorData } from './cursor';
import type { CursorPaginationOptions } from './pagination';
import type { SortOrder } from '../search/types';

// ============================================================================
// SQL Identifier Safety
// ============================================================================

/**
 * Pattern for safe SQL identifiers: letters (camelCase or snake_case), digits,
 * underscores only. Rejects anything that could be used for SQL injection
 * (spaces, semicolons, quotes, parentheses, operators, etc.).
 */
const SAFE_SQL_IDENTIFIER = /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/;

/**
 * Validates and quotes a SQL column identifier to prevent injection.
 * Only allows simple lowercase identifiers (letters, digits, underscores).
 *
 * @param name - The column name to validate
 * @param label - Label for error messages (e.g. 'sortBy', 'tieBreakerField')
 * @returns The double-quoted identifier safe for SQL interpolation
 * @throws PaginationError if the identifier contains invalid characters
 * @complexity O(n) where n = identifier length (regex test)
 */
function safeSqlIdentifier(name: string, label: string): string {
  if (!SAFE_SQL_IDENTIFIER.test(name)) {
    throw new PaginationError(
      'INVALID_SORT_FIELD',
      `Invalid ${label}: "${name}". Must be a lowercase identifier (a-z, 0-9, _).`,
    );
  }
  return `"${name}"`;
}

// ============================================================================
// Query Builder
// ============================================================================

/**
 * Builds SQL WHERE clause and ORDER BY for cursor-based pagination.
 * Returns the SQL fragments and parameters for safe query building.
 *
 * Field names are validated against a strict alphanumeric pattern and
 * double-quoted to prevent SQL injection.
 *
 * @param cursor - Encoded cursor string from a previous page (optional)
 * @param sortBy - Column name to sort by (must be a safe SQL identifier)
 * @param sortOrder - Sort direction ('asc' or 'desc')
 * @param tieBreakerField - Column for tie-breaking (default: 'id')
 * @returns SQL fragments and parameterized values
 * @throws PaginationError if cursor is invalid or field names are unsafe
 * @complexity O(1)
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
  const safeSortBy = safeSqlIdentifier(sortBy, 'sortBy');
  const safeTieBreaker = safeSqlIdentifier(tieBreakerField, 'tieBreakerField');

  const params: unknown[] = [];
  let whereClause = '';

  if (cursor !== undefined && cursor !== '') {
    const cursorData = decodeCursor(cursor);
    if (cursorData === null) {
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
      (${safeSortBy} ${operator} $1) OR
      (${safeSortBy} = $1 AND ${safeTieBreaker} ${operator} $2)
    )`;

    params.push(cursorData.value, cursorData.tieBreaker);
  }

  const direction = sortOrder.toUpperCase();
  const orderByClause = `${safeSortBy} ${direction}, ${safeTieBreaker} ${direction}`;

  return {
    whereClause,
    orderByClause,
    params,
  };
}

/**
 * Calculates pagination metadata for cursor-based results
 */
export function calculateCursorPaginationMetadata<T>(
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
export function paginateArrayWithCursor<T>(
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
  if (cursor !== undefined && cursor !== '') {
    const cursorData = decodeCursor(cursor);
    if (cursorData !== null) {
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
function sortItemsEfficiently<T>(
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
function findCursorIndexBinary<T>(
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

    if (item === undefined) break;

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
export function paginateLargeArrayWithCursor<T>(
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
  if (cursor !== undefined && cursor !== '') {
    const cursorData = decodeCursor(cursor);
    if (cursorData !== null) {
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
