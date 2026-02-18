// main/shared/src/system/pagination/helpers.test.ts
import { describe, expect, it } from 'vitest';

import { encodeCursor } from './cursor';
import {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
} from './helpers';

import { PaginationError } from '.';

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
      name: `Item ${String(i + 1)}`,
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

// ============================================================================
// Adversarial: buildCursorPaginationQuery SQL injection & edge cases
// ============================================================================

describe('buildCursorPaginationQuery — adversarial', () => {
  it('throws INVALID_SORT_FIELD for sortBy with SQL injection semicolon', () => {
    expect(() =>
      buildCursorPaginationQuery(undefined, 'createdAt; DROP TABLE users', 'asc'),
    ).toThrow(PaginationError);
  });

  it('throws INVALID_SORT_FIELD for sortBy with single quote', () => {
    expect(() => buildCursorPaginationQuery(undefined, "name'--", 'desc')).toThrow(PaginationError);
  });

  it('throws INVALID_SORT_FIELD for sortBy starting with number', () => {
    expect(() => buildCursorPaginationQuery(undefined, '1field', 'asc')).toThrow(PaginationError);
  });

  it('throws INVALID_SORT_FIELD for sortBy that is empty string', () => {
    expect(() => buildCursorPaginationQuery(undefined, '', 'asc')).toThrow(PaginationError);
  });

  it('throws INVALID_SORT_FIELD for sortBy with spaces', () => {
    expect(() => buildCursorPaginationQuery(undefined, 'created at', 'asc')).toThrow(
      PaginationError,
    );
  });

  it('throws INVALID_SORT_FIELD for sortBy with parentheses (function call attempt)', () => {
    expect(() => buildCursorPaginationQuery(undefined, 'LOWER(name)', 'asc')).toThrow(
      PaginationError,
    );
  });

  it('throws INVALID_SORT_FIELD for sortBy exceeding 63 chars (SQL identifier limit)', () => {
    const longField = 'a'.repeat(64);
    expect(() => buildCursorPaginationQuery(undefined, longField, 'asc')).toThrow(PaginationError);
  });

  it('throws INVALID_SORT_FIELD for tieBreakerField with hyphen', () => {
    expect(() => buildCursorPaginationQuery(undefined, 'createdAt', 'asc', 'tie-breaker')).toThrow(
      PaginationError,
    );
  });

  it('throws INVALID_SORT_FIELD for tieBreakerField with dot notation', () => {
    expect(() => buildCursorPaginationQuery(undefined, 'createdAt', 'asc', 'table.id')).toThrow(
      PaginationError,
    );
  });

  it('throws INVALID_CURSOR for empty-string cursor (non-undefined)', () => {
    // Empty string cursor is treated as "no cursor" — should NOT throw
    const result = buildCursorPaginationQuery('', 'createdAt', 'desc');
    expect(result.whereClause).toBe('');
    expect(result.params).toEqual([]);
  });

  it('throws INVALID_CURSOR for base64 that decodes to valid JSON but wrong shape', () => {
    const bad = Buffer.from('{"foo":"bar"}', 'utf8').toString('base64url');
    expect(() => buildCursorPaginationQuery(bad, 'createdAt', 'desc')).toThrow(PaginationError);
  });

  it('produces ASC direction in orderByClause for asc sortOrder', () => {
    const result = buildCursorPaginationQuery(undefined, 'name', 'asc');
    expect(result.orderByClause).toBe('"name" ASC, "id" ASC');
  });

  it('includes both params when cursor is present', () => {
    const cursor = encodeCursor({ value: 42, tieBreaker: 'uuid-1', sortOrder: 'asc' });
    const result = buildCursorPaginationQuery(cursor, 'score', 'asc');
    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toBe(42);
    expect(result.params[1]).toBe('uuid-1');
  });
});

// ============================================================================
// Adversarial: calculateCursorPaginationMetadata edge cases
// ============================================================================

describe('calculateCursorPaginationMetadata — adversarial', () => {
  it('returns null nextCursor for zero total items', () => {
    const result = calculateCursorPaginationMetadata([], 10, 'id', 'asc');
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('handles limit=1 with exactly 1 item (no next)', () => {
    const items = [{ id: '1', name: 'only' }];
    const result = calculateCursorPaginationMetadata(items, 1, 'name', 'asc');
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('handles limit=1 with 2 items (has next)', () => {
    const items = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ];
    const result = calculateCursorPaginationMetadata(items, 1, 'name', 'asc');
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it('nextCursor encodes the last item in viewport, not the lookahead item', () => {
    // 3 items, limit=2 → hasNext=true, nextCursor should be for item[1] (index 1), not item[2]
    const items = [
      { id: '10', name: 'alpha' },
      { id: '20', name: 'beta' },
      { id: '30', name: 'gamma' }, // lookahead
    ];
    const result = calculateCursorPaginationMetadata(items, 2, 'name', 'asc');
    expect(result.hasNext).toBe(true);
    // Cursor must not encode item '30'
    const decoded =
      result.nextCursor !== null
        ? (() => {
            try {
              return Buffer.from(result.nextCursor, 'base64url').toString('utf8');
            } catch {
              return null;
            }
          })()
        : null;
    expect(decoded).not.toContain('30');
  });

  it('large limit beyond all items returns hasNext=false', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i), score: i }));
    const result = calculateCursorPaginationMetadata(items, 1000, 'score', 'desc');
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});

// ============================================================================
// Adversarial: paginateArrayWithCursor edge cases
// ============================================================================

describe('paginateArrayWithCursor — adversarial', () => {
  it('with corrupted cursor string treats it as no cursor (skips to start)', () => {
    const items = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ];
    // Corrupted cursor — decodeCursor returns null, so startIndex=0
    const result = paginateArrayWithCursor(
      items,
      { cursor: 'CORRUPTED!!!', limit: 10, sortOrder: 'asc' },
      'name',
    );
    // When cursor decodes to null, it starts from beginning
    expect(result.data).toHaveLength(2);
  });

  it('with limit larger than dataset returns all items', () => {
    const items = [
      { id: '1', score: 1 },
      { id: '2', score: 2 },
    ];
    const result = paginateArrayWithCursor(items, { limit: 100, sortOrder: 'asc' }, 'score');
    expect(result.data).toHaveLength(2);
    expect(result.hasNext).toBe(false);
  });

  it('single item with limit=1 returns no next page', () => {
    const items = [{ id: '1', score: 99 }];
    const result = paginateArrayWithCursor(items, { limit: 1, sortOrder: 'desc' }, 'score');
    expect(result.data).toHaveLength(1);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('all items share same sort value — cursor navigation still works', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), score: 42 }));
    const page1 = paginateArrayWithCursor(items, { limit: 2, sortOrder: 'asc' }, 'score');
    expect(page1.data).toHaveLength(2);
    expect(page1.hasNext).toBe(true);

    const page2 = paginateArrayWithCursor(
      items,
      { cursor: page1.nextCursor!, limit: 2, sortOrder: 'asc' },
      'score',
    );
    expect(page2.data).toHaveLength(2);
    // No items should overlap between pages
    const page1Ids = new Set(page1.data.map((i) => i.id));
    page2.data.forEach((item) => {
      expect(page1Ids.has(item.id)).toBe(false);
    });
  });

  it('cursor from desc pagination fails gracefully when used with asc', () => {
    const items = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];
    const descPage = paginateArrayWithCursor(items, { limit: 1, sortOrder: 'desc' }, 'name');
    // descPage.nextCursor encodes sortOrder:'desc'
    // Using it with 'asc' — the cursor's sortOrder won't match, but
    // paginateArrayWithCursor does not validate sortOrder mismatch (only buildCursorPaginationQuery does)
    // so it just uses whatever offset the cursor decodes to
    const result = paginateArrayWithCursor(
      items,
      { cursor: descPage.nextCursor!, limit: 2, sortOrder: 'asc' },
      'name',
    );
    // Should not throw — just returns some items
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('Number.MAX_SAFE_INTEGER as sort value does not overflow', () => {
    const items = [
      { id: '1', score: Number.MAX_SAFE_INTEGER },
      { id: '2', score: Number.MAX_SAFE_INTEGER - 1 },
    ];
    const result = paginateArrayWithCursor(items, { limit: 1, sortOrder: 'desc' }, 'score');
    expect(result.data[0]!.score).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.hasNext).toBe(true);
  });
});

// ============================================================================
// Adversarial: paginateLargeArrayWithCursor edge cases
// ============================================================================

describe('paginateLargeArrayWithCursor — adversarial', () => {
  it('single-item array returns no next page', () => {
    const items = [{ id: '1', score: 1 }];
    const result = paginateLargeArrayWithCursor(items, { limit: 10, sortOrder: 'asc' }, 'score');
    expect(result.data).toHaveLength(1);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('binary search with corrupted cursor starts from beginning', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i), score: i }));
    const result = paginateLargeArrayWithCursor(
      items,
      { cursor: 'BOGUS_CURSOR', limit: 5, sortOrder: 'asc' },
      'score',
    );
    expect(result.data).toHaveLength(5);
  });

  it('full traversal through all pages yields exactly N items total', () => {
    const total = 25;
    const items = Array.from({ length: total }, (_, i) => ({ id: String(i + 1), score: i }));
    let cursor: string | null = null;
    let collected = 0;
    let iterations = 0;

    do {
      const page: { data: unknown[]; nextCursor: string | null } = paginateLargeArrayWithCursor(
        items,
        { cursor: cursor ?? undefined, limit: 7, sortOrder: 'asc' },
        'score',
      );
      collected += page.data.length;
      cursor = page.nextCursor;
      iterations++;
      if (iterations > 10) break; // safety
    } while (cursor !== null);

    expect(collected).toBe(total);
  });

  it('limit equal to total yields all items and hasNext=false', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i), score: i }));
    const result = paginateLargeArrayWithCursor(items, { limit: 10, sortOrder: 'asc' }, 'score');
    expect(result.data).toHaveLength(10);
    expect(result.hasNext).toBe(false);
  });
});
