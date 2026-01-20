// packages/core/src/pagination.ts
import type { CursorPaginationOptions, SortOrder } from './contracts';

/**
 * Pagination-specific error types
 */
export const PAGINATION_ERROR_TYPES = {
  INVALID_CURSOR: 'INVALID_CURSOR',
  CURSOR_SORT_MISMATCH: 'CURSOR_SORT_MISMATCH',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_SORT_ORDER: 'INVALID_SORT_ORDER',
} as const;

export type PaginationErrorType =
  (typeof PAGINATION_ERROR_TYPES)[keyof typeof PAGINATION_ERROR_TYPES];

/**
 * Error class for pagination-related errors
 */
export class PaginationError extends Error {
  public readonly type: PaginationErrorType;
  public readonly details?: unknown;

  constructor(type: PaginationErrorType, message: string, details?: unknown) {
    super(message);
    this.name = 'PaginationError';
    this.type = type;
    this.details = details;
  }

  /**
   * Check if an error is a PaginationError
   */
  static isPaginationError(error: unknown): error is PaginationError {
    return error instanceof PaginationError;
  }

  /**
   * Check if an error is a specific type of PaginationError
   */
  static isType(error: unknown, type: PaginationErrorType): error is PaginationError {
    return PaginationError.isPaginationError(error) && error.type === type;
  }
}

/**
 * Cursor data structure for encoding pagination state
 */
export interface CursorData {
  /** Primary sort field value */
  value: string | number | Date;
  /** Tie-breaker field value (usually ID) */
  tieBreaker: string;
  /** Sort direction */
  sortOrder: SortOrder;
  /** Optional additional sort fields */
  additionalValues?: Array<string | number | Date>;
}

type CursorValue = CursorData['value'];
type EncodedCursorValue = string | number | { __date: string };

function isCursorValue(value: unknown): value is CursorValue {
  return typeof value === 'string' || typeof value === 'number' || value instanceof Date;
}

function encodeCursorValue(value: CursorValue): EncodedCursorValue {
  return value instanceof Date ? { __date: value.toISOString() } : value;
}

function decodeCursorValue(value: unknown): CursorValue | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && '__date' in value) {
    const dateValue = (value as { __date?: unknown }).__date;
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function isSortOrder(value: unknown): value is SortOrder {
  return value === 'asc' || value === 'desc';
}

function parseCursorData(parsed: unknown): CursorData | null {
  if (Array.isArray(parsed)) {
    const parsedArray = parsed as unknown[];
    const value = decodeCursorValue(parsedArray[0]);
    const tieBreaker = parsedArray[1];
    const sortOrder = parsedArray[2];
    const additionalValues = parsedArray[3];
    if (!value) return null;
    if (typeof tieBreaker !== 'string' || !tieBreaker.trim()) return null;
    if (!isSortOrder(sortOrder)) return null;
    if (typeof additionalValues !== 'undefined') {
      if (!Array.isArray(additionalValues)) return null;
      const decodedAdditionalValues = additionalValues
        .map((entry) => decodeCursorValue(entry))
        .filter((entry): entry is CursorValue => entry !== null);
      if (decodedAdditionalValues.length !== additionalValues.length) return null;
    }
    const extraValues = Array.isArray(additionalValues)
      ? additionalValues
          .map((entry) => decodeCursorValue(entry))
          .filter((entry): entry is CursorValue => entry !== null)
      : undefined;
    return {
      value,
      tieBreaker,
      sortOrder,
      additionalValues: extraValues,
    };
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  const value = decodeCursorValue(record.value);
  if (!value) return null;
  if (typeof record.tieBreaker !== 'string' || !record.tieBreaker.trim()) return null;
  if (!isSortOrder(record.sortOrder)) return null;
  if (typeof record.additionalValues !== 'undefined') {
    if (!Array.isArray(record.additionalValues)) return null;
    const decodedAdditionalValues = record.additionalValues
      .map((entry) => decodeCursorValue(entry))
      .filter((entry): entry is CursorValue => entry !== null);
    if (decodedAdditionalValues.length !== record.additionalValues.length) return null;
  }

  const extraValues = Array.isArray(record.additionalValues)
    ? record.additionalValues
        .map((entry) => decodeCursorValue(entry))
        .filter((entry): entry is CursorValue => entry !== null)
    : undefined;

  return {
    value,
    tieBreaker: record.tieBreaker,
    sortOrder: record.sortOrder,
    additionalValues: extraValues,
  };
}

/**
 * Encodes cursor data into a base64-encoded JSON string
 * Uses URL-safe base64 encoding for web compatibility
 *
 * Performance optimization: Uses a compact JSON representation
 */
export function encodeCursor(data: CursorData): string {
  // Use a more compact representation for better performance
  const compactData = data.additionalValues
    ? [
        encodeCursorValue(data.value),
        data.tieBreaker,
        data.sortOrder,
        data.additionalValues.map((value) => encodeCursorValue(value)),
      ]
    : [encodeCursorValue(data.value), data.tieBreaker, data.sortOrder];

  const jsonString = JSON.stringify(compactData);
  return Buffer.from(jsonString, 'utf8').toString('base64url');
}

/**
 * Decodes a cursor string back into CursorData
 * Returns null if the cursor is invalid
 */
export function decodeCursor(cursor: string): CursorData | null {
  if (!cursor || typeof cursor !== 'string') {
    return null;
  }

  try {
    const jsonString = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(jsonString);
    return parseCursorData(parsed);
  } catch {
    return null;
  }
}

/**
 * Creates a cursor for the given item based on sort configuration
 */
export function createCursorForItem<T extends Record<string, unknown>>(
  item: T,
  sortBy: string,
  sortOrder: SortOrder,
  tieBreakerField: keyof T = 'id' as keyof T,
): string {
  const value = item[sortBy];
  if (!isCursorValue(value)) {
    throw new Error(`Item missing or has invalid sort field: ${sortBy}`);
  }
  const tieBreakerValue = item[tieBreakerField];
  if (tieBreakerValue === undefined || tieBreakerValue === null) {
    throw new Error(`Item missing tie-breaker field: ${String(tieBreakerField)}`);
  }
  const tieBreaker = String(tieBreakerValue);

  const cursorData: CursorData = {
    value,
    tieBreaker,
    sortOrder,
  };

  return encodeCursor(cursorData);
}

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

function getSortableValue(item: Record<string, unknown>, key: string): CursorValue {
  const value = item[key];
  if (!isCursorValue(value)) {
    throw new Error(`Invalid sort value for key "${key}"`);
  }
  return value;
}
