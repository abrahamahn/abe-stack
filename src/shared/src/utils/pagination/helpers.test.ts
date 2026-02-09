// src/shared/src/utils/pagination/helpers.test.ts
import { describe, expect, it } from 'vitest';

import { PaginationError } from '../pagination';

import { encodeCursor } from './cursor';
import {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
} from './helpers';

describe('Cursor Pagination Query Building', () => {
  it('should build query without cursor', () => {
    const result = buildCursorPaginationQuery(undefined, 'createdAt', 'desc');

    expect(result.whereClause).toBe('');
    expect(result.orderByClause).toBe('"createdAt" DESC, "id" DESC');
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

    expect(result.whereClause).toContain('"createdAt" < $1');
    expect(result.whereClause).toContain('"id" < $2');
    expect(result.orderByClause).toBe('"createdAt" DESC, "id" DESC');
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
        expect(error.type).toBe('INVALID_CURSOR');
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
        expect(error.type).toBe('CURSOR_SORT_MISMATCH');
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
    expect(firstPage.data[0]!.id).toBe('1'); // Most recent

    // Second page using cursor
    const secondPage = paginateArrayWithCursor(testItems, {
      cursor: firstPage.nextCursor!,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(secondPage.data).toHaveLength(1);
    expect(secondPage.data[0]!.id).toBe('2');
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

  it('should use tie-breaker for items with same sort value', () => {
    const itemsWithSameValue = [
      { id: '1', createdAt: '2024-01-01', name: 'A' },
      { id: '2', createdAt: '2024-01-01', name: 'B' },
      { id: '3', createdAt: '2024-01-01', name: 'C' },
    ];

    const result = paginateArrayWithCursor(itemsWithSameValue, {
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(result.data).toHaveLength(3);
    // Should be sorted by tie-breaker (id) when primary sort is equal
  });

  it('should handle asc sort order with cursor', () => {
    const firstPage = paginateArrayWithCursor(testItems, {
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(firstPage.data).toHaveLength(1);
    expect(firstPage.data[0]!.id).toBe('3'); // Oldest first

    const secondPage = paginateArrayWithCursor(testItems, {
      cursor: firstPage.nextCursor!,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(secondPage.data).toHaveLength(1);
    expect(secondPage.data[0]!.id).toBe('2');
  });

  it('should handle cursor past end of data', () => {
    // Get last item cursor
    const allItems = paginateArrayWithCursor(testItems, {
      limit: 3,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(allItems.hasNext).toBe(false);
    expect(allItems.nextCursor).toBeNull();
  });
});

describe('Large Array Pagination', () => {
  const largeTestItems = Array.from({ length: 100 }, (_, i) => ({
    id: String(i + 1),
    createdAt: `2024-01-${String(100 - i).padStart(2, '0')}`,
    score: i * 10,
  }));

  it('should paginate large array without cursor', () => {
    const result = paginateLargeArrayWithCursor(largeTestItems, {
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.data).toHaveLength(10);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toBeDefined();
  });

  it('should paginate large array with cursor using binary search', () => {
    const firstPage = paginateLargeArrayWithCursor(largeTestItems, {
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(firstPage.data).toHaveLength(10);
    expect(firstPage.hasNext).toBe(true);

    const secondPage = paginateLargeArrayWithCursor(largeTestItems, {
      cursor: firstPage.nextCursor!,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(secondPage.data).toHaveLength(10);
    // Verify items are different from first page
    expect(secondPage.data[0]!.id).not.toBe(firstPage.data[0]!.id);
  });

  it('should handle asc sort order with binary search', () => {
    const firstPage = paginateLargeArrayWithCursor(largeTestItems, {
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(firstPage.data).toHaveLength(10);

    const secondPage = paginateLargeArrayWithCursor(largeTestItems, {
      cursor: firstPage.nextCursor!,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(secondPage.data).toHaveLength(10);
  });

  it('should handle empty array', () => {
    const result = paginateLargeArrayWithCursor([], {
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.data).toHaveLength(0);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should handle tie-breaker in binary search', () => {
    const itemsWithSameValue = Array.from({ length: 50 }, (_, i) => ({
      id: String(i + 1),
      createdAt: '2024-01-01', // All same date
      name: `Item ${i + 1}`,
    }));

    const firstPage = paginateLargeArrayWithCursor(itemsWithSameValue, {
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(firstPage.data).toHaveLength(10);
    expect(firstPage.hasNext).toBe(true);

    const secondPage = paginateLargeArrayWithCursor(itemsWithSameValue, {
      cursor: firstPage.nextCursor!,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(secondPage.data).toHaveLength(10);
    // Items should be different from first page
    const firstIds = new Set(firstPage.data.map((item) => item.id));
    const secondIds = secondPage.data.map((item) => item.id);
    secondIds.forEach((id) => {
      expect(firstIds.has(id)).toBe(false);
    });
  });

  it('should use default sortBy when not provided in options', () => {
    const items = [
      { id: '3', name: 'C' },
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ];

    const result = paginateLargeArrayWithCursor(
      items,
      {
        limit: 10,
        sortOrder: 'asc',
      },
      'id', // default sortBy
    );

    expect(result.data).toHaveLength(3);
  });

  it('should respect limit at end of dataset', () => {
    const result = paginateLargeArrayWithCursor(largeTestItems, {
      limit: 200, // More than total items
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.data).toHaveLength(100);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
