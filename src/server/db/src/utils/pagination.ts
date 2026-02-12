// src/server/db/src/utils/pagination.ts
/**
 * Cursor pagination helpers for repository list methods.
 *
 * Eliminates duplicated cursor decoding, condition combining,
 * and result-trimming boilerplate across billing repositories.
 */

import { createCursorForItem, decodeCursor } from '@abe-stack/shared';

import { and, eq, gt, lt, or } from '../builder/index';

import type { SortDirection, SqlFragment } from '../builder/index';
import type { CursorPaginatedResult } from '@abe-stack/shared';

/**
 * Build a SQL condition for cursor-based pagination on created_at + id.
 * Returns null if no valid cursor is provided.
 */
export function buildCursorCondition(
  cursor: string | undefined,
  sortOrder: SortDirection,
): SqlFragment | null {
  if (cursor === undefined || cursor === '') return null;

  const cursorData = decodeCursor(cursor);
  if (cursorData === null) return null;

  const cursorDate =
    cursorData.value instanceof Date ? cursorData.value : new Date(String(cursorData.value));
  const cursorId = cursorData.tieBreaker;

  const cmp = sortOrder === 'desc' ? lt : gt;
  return or(cmp('created_at', cursorDate), and(eq('created_at', cursorDate), cmp('id', cursorId)));
}

/**
 * Combine an array of SQL conditions with AND.
 * Returns null if the array is empty.
 */
export function combineConditions(conditions: SqlFragment[]): SqlFragment | null {
  if (conditions.length === 0) return null;
  const [first, ...rest] = conditions;
  if (first === undefined) return null;
  return rest.length === 0 ? first : and(first, ...rest);
}

/**
 * Build a CursorPaginatedResult from a data array fetched with limit+1.
 * Trims the extra lookahead item and encodes the next cursor.
 */
export function buildCursorResult<T extends { id: string; createdAt: Date }>(
  data: T[],
  limit: number,
  sortOrder: SortDirection,
): CursorPaginatedResult<T> {
  const hasMore = data.length > limit;
  if (hasMore) {
    data.pop();
  }

  const lastItem = data[data.length - 1];
  const nextCursor =
    hasMore && lastItem !== undefined
      ? createCursorForItem(lastItem, 'createdAt', sortOrder, 'id')
      : null;

  return { data, nextCursor, hasNext: hasMore, limit };
}
