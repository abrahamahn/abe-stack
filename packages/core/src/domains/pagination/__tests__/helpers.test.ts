// packages/core/src/domains/pagination/__tests__/helpers.test.ts
import { describe, expect, it } from 'vitest';

import { encodeCursor } from '../cursor';
import { PAGINATION_ERROR_TYPES, PaginationError } from '../error';
import {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  paginateArrayWithCursor,
} from '../helpers';

describe('Cursor Pagination Query Building', () => {
  it('should build query without cursor', () => {
    const result = buildCursorPaginationQuery(undefined, 'createdAt', 'desc');

    expect(result.whereClause).toBe('');
    expect(result.orderByClause).toBe('createdAt DESC, id DESC');
    expect(result.params).toEqual([]);
  });

  it('should build query with valid cursor', () => {
    const cursorData = {
      value: '2024-01-01T00:00:00Z',
      tieBreaker: '123',
      sortOrder: 'desc' as const,
    };
    const cursor = encodeCursor(cursorData);

    const result = buildCursorPaginationQuery(cursor, 'createdAt', 'desc');

    expect(result.whereClause).toContain('createdAt < $1');
    expect(result.whereClause).toContain('id < $2');
    expect(result.orderByClause).toBe('createdAt DESC, id DESC');
    expect(result.params).toEqual(['2024-01-01T00:00:00Z', '123']);
  });

  it('should throw error for invalid cursor', () => {
    expect(() => {
      buildCursorPaginationQuery('invalid-cursor', 'createdAt', 'desc');
    }).toThrow(PaginationError);

    try {
      buildCursorPaginationQuery('invalid-cursor', 'createdAt', 'desc');
    } catch (error) {
      if (error instanceof PaginationError) {
        expect(error.type).toBe(PAGINATION_ERROR_TYPES.INVALID_CURSOR);
      } else {
        throw error;
      }
    }
  });

  it('should throw error for sort order mismatch', () => {
    const cursorData = {
      value: '2024-01-01T00:00:00Z',
      tieBreaker: '123',
      sortOrder: 'asc' as const, // Different from requested
    };
    const cursor = encodeCursor(cursorData);

    expect(() => {
      buildCursorPaginationQuery(cursor, 'createdAt', 'desc');
    }).toThrow(PaginationError);

    try {
      buildCursorPaginationQuery(cursor, 'createdAt', 'desc');
    } catch (error) {
      if (error instanceof PaginationError) {
        expect(error.type).toBe(PAGINATION_ERROR_TYPES.CURSOR_SORT_MISMATCH);
      } else {
        throw error;
      }
    }
  });
});

describe('Cursor Pagination Metadata', () => {
  it('should calculate metadata correctly when there are more items', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' }, // This is the extra item
    ];

    const result = calculateCursorPaginationMetadata(items, 2, 'name', 'desc');

    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toBeDefined();
  });

  it('should calculate metadata correctly when there are no more items', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    const result = calculateCursorPaginationMetadata(items, 2, 'name', 'desc');

    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});

describe('Array Pagination', () => {
  const testItems = [
    { id: '1', createdAt: '2024-01-03', name: 'Item 1' },
    { id: '2', createdAt: '2024-01-02', name: 'Item 2' },
    { id: '3', createdAt: '2024-01-01', name: 'Item 3' },
  ];

  it('should paginate array without cursor', () => {
    const result = paginateArrayWithCursor(testItems, {
      limit: 2,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.data).toHaveLength(2);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toBeDefined();
  });

  it('should paginate array with cursor', () => {
    // First page
    const firstPage = paginateArrayWithCursor(testItems, {
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(firstPage.data).toHaveLength(1);
    expect(firstPage.data[0].id).toBe('1'); // Most recent

    // Second page using cursor
    const secondPage = paginateArrayWithCursor(testItems, {
      cursor: firstPage.nextCursor!,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(secondPage.data).toHaveLength(1);
    expect(secondPage.data[0].id).toBe('2');
  });

  it('should handle empty results', () => {
    const result = paginateArrayWithCursor([], {
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.data).toHaveLength(0);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
