// shared/core/src/__tests__/integration/pagination.integration.test.ts
/**
 * Integration tests for pagination utilities with real data sets
 *
 * Tests cursor-based pagination with various data types and sizes.
 */

import { describe, expect, it } from 'vitest';

import { createCursorForItem, decodeCursor, encodeCursor } from '../shared/pagination/cursor';
import { PaginationError } from '../shared/pagination/error';
import {
    buildCursorPaginationQuery,
    calculateCursorPaginationMetadata,
    paginateArrayWithCursor,
    paginateLargeArrayWithCursor,
} from '../shared/pagination/helpers';

describe('Pagination Integration', () => {
  describe('Cursor pagination with realistic data', () => {
    interface Article {
      id: string;
      title: string;
      publishedAt: Date;
      views: number;
      author: string;
    }

    const generateArticles = (count: number): Article[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `article-${String(i + 1).padStart(4, '0')}`,
        title: `Article ${String(i + 1)}`,
        publishedAt: new Date(Date.now() - i * 3600000), // Each article 1 hour apart
        views: Math.floor(Math.random() * 10000),
        author: `Author ${(i % 10) + 1}`,
      }));
    };

    it('should paginate articles by date descending', () => {
      const articles = generateArticles(50);

      // First page
      const page1 = paginateArrayWithCursor(
        articles,
        { limit: 10, sortOrder: 'desc' },
        'publishedAt',
      );

      expect(page1.data).toHaveLength(10);
      expect(page1.hasNext).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      // Verify sorting (most recent first)
      for (let i = 0; i < page1.data.length - 1; i++) {
        const current = page1.data[i];
        const next = page1.data[i + 1];
        if (current !== undefined && next !== undefined) {
          expect(current.publishedAt.getTime()).toBeGreaterThanOrEqual(next.publishedAt.getTime());
        }
      }

      // Second page
      const page2 = paginateArrayWithCursor(
        articles,
        page1.nextCursor !== null ? { cursor: page1.nextCursor, limit: 10, sortOrder: 'desc' } : { limit: 10, sortOrder: 'desc' },
        'publishedAt',
      );

      expect(page2.data).toHaveLength(10);
      expect(page2.hasNext).toBe(true);

      // No overlap between pages
      const page1Ids = new Set(page1.data.map((a) => a.id));
      page2.data.forEach((article) => {
        expect(page1Ids.has(article.id)).toBe(false);
      });
    });

    it('should paginate articles by views ascending', () => {
      const articles = generateArticles(30);

      const result = paginateArrayWithCursor(
        articles,
        { limit: 10, sortOrder: 'asc', sortBy: 'views' },
        'views',
      );

      expect(result.data).toHaveLength(10);

      // Verify sorting (lowest views first)
      for (let i = 0; i < result.data.length - 1; i++) {
        const current = result.data[i];
        const next = result.data[i + 1];
        if (current !== undefined && next !== undefined) {
          expect(current.views).toBeLessThanOrEqual(next.views);
        }
      }
    });

    it('should handle pagination through all items', () => {
      const articles = generateArticles(25);
      const allFetchedIds = new Set<string>();
      let cursor: string | undefined = undefined;
      let pageCount = 0;

      while (true) {
        const result: any = paginateArrayWithCursor(
          articles,
          cursor !== undefined ? { cursor, limit: 10, sortOrder: 'desc' } : { limit: 10, sortOrder: 'desc' },
          'publishedAt',
        );

        result.data.forEach((article: any) => {
          allFetchedIds.add(article.id);
        });

        pageCount++;

        if (result.hasNext === false) break;
        cursor = result.nextCursor ?? undefined;
      }

      expect(allFetchedIds.size).toBe(25);
      expect(pageCount).toBe(3); // 10 + 10 + 5
    });
  });

  describe('Large dataset pagination', () => {
    interface User {
      id: string;
      username: string;
      createdAt: Date;
      karma: number;
    }

    const generateUsers = (count: number): User[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `user-${String(i + 1).padStart(6, '0')}`,
        username: `user_${String(i + 1)}`,
        createdAt: new Date(Date.now() - i * 1000),
        karma: Math.floor(Math.random() * 100000),
      }));
    };

    it('should efficiently paginate 10000 items', () => {
      const users = generateUsers(10000);

      // First page
      const startTime = Date.now();
      const page1 = paginateLargeArrayWithCursor(
        users,
        { limit: 100, sortOrder: 'desc' },
        'karma',
      );
      const firstPageTime = Date.now() - startTime;

      expect(page1.data).toHaveLength(100);
      expect(page1.hasNext).toBe(true);

      // Subsequent pages should be fast due to binary search
      const midPageStart = Date.now();
      let cursor = page1.nextCursor;
      for (let i = 0; i < 10; i++) {
        const page = paginateLargeArrayWithCursor(
          users,
          cursor !== null ? { cursor, limit: 100, sortOrder: 'desc' } : { limit: 100, sortOrder: 'desc' },
          'karma',
        );
        cursor = page.nextCursor;
      }
      const midPagesTime = Date.now() - midPageStart;

      // Just verify it completes in reasonable time (not a strict performance test)
      expect(firstPageTime).toBeLessThan(1000);
      expect(midPagesTime).toBeLessThan(1000);
    });

    it('should return consistent results between regular and optimized pagination', () => {
      const users = generateUsers(100);

      const regularResult = paginateArrayWithCursor(
        users,
        { limit: 20, sortOrder: 'asc' },
        'createdAt',
      );

      const optimizedResult = paginateLargeArrayWithCursor(
        users,
        { limit: 20, sortOrder: 'asc' },
        'createdAt',
      );

      expect(regularResult.data.map((u) => u.id)).toEqual(optimizedResult.data.map((u) => u.id));
      expect(regularResult.hasNext).toBe(optimizedResult.hasNext);
    });
  });

  describe('Cursor encoding/decoding with various data types', () => {
    it('should handle string sort values', () => {
      const item = { id: 'item-1', name: 'Product ABC' };
      const cursor = createCursorForItem(item, 'name', 'asc');
      const decoded = decodeCursor(cursor);

      expect(decoded?.value).toBe('Product ABC');
      expect(decoded?.sortOrder).toBe('asc');
    });

    it('should handle numeric sort values', () => {
      const item = { id: 'item-1', price: 99.99 };
      const cursor = createCursorForItem(item, 'price', 'desc');
      const decoded = decodeCursor(cursor);

      expect(decoded?.value).toBe(99.99);
      expect(decoded?.sortOrder).toBe('desc');
    });

    it('should handle Date sort values', () => {
      const testDate = new Date('2024-06-15T10:30:00Z');
      const item = { id: 'item-1', createdAt: testDate };
      const cursor = createCursorForItem(item, 'createdAt', 'desc');
      const decoded = decodeCursor(cursor);

      expect(decoded?.value).toEqual(testDate);
    });

    it('should preserve cursor data through encode/decode cycle', () => {
      const originalData = {
        value: 'test-value',
        tieBreaker: 'unique-id-123',
        sortOrder: 'desc' as const,
      };

      const encoded = encodeCursor(originalData);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(originalData);
    });

    it('should handle cursors with additional values', () => {
      const originalData = {
        value: 'primary-sort',
        tieBreaker: 'id-123',
        sortOrder: 'asc' as const,
        additionalValues: ['secondary', 42, new Date('2024-01-01')],
      };

      const encoded = encodeCursor(originalData);
      const decoded = decodeCursor(encoded);

      expect(decoded?.additionalValues).toHaveLength(3);
      expect(decoded?.additionalValues?.[0]).toBe('secondary');
      expect(decoded?.additionalValues?.[1]).toBe(42);
      expect(decoded?.additionalValues?.[2]).toEqual(new Date('2024-01-01'));
    });
  });

  describe('SQL query building for cursor pagination', () => {
    it('should build query for first page (no cursor)', () => {
      const result = buildCursorPaginationQuery(undefined, 'created_at', 'desc');

      expect(result.whereClause).toBe('');
      expect(result.orderByClause).toBe('created_at DESC, id DESC');
      expect(result.params).toHaveLength(0);
    });

    it('should build query with cursor for ascending order', () => {
      const cursorData = {
        value: '2024-01-01T00:00:00Z',
        tieBreaker: 'abc123',
        sortOrder: 'asc' as const,
      };
      const cursor = encodeCursor(cursorData);

      const result = buildCursorPaginationQuery(cursor, 'created_at', 'asc');

      expect(result.whereClause).toContain('created_at > $1');
      expect(result.whereClause).toContain('id > $2');
      expect(result.orderByClause).toBe('created_at ASC, id ASC');
      expect(result.params).toEqual(['2024-01-01T00:00:00Z', 'abc123']);
    });

    it('should build query with cursor for descending order', () => {
      const cursorData = {
        value: 1000,
        tieBreaker: 'xyz789',
        sortOrder: 'desc' as const,
      };
      const cursor = encodeCursor(cursorData);

      const result = buildCursorPaginationQuery(cursor, 'score', 'desc');

      expect(result.whereClause).toContain('score < $1');
      expect(result.whereClause).toContain('id < $2');
      expect(result.orderByClause).toBe('score DESC, id DESC');
      expect(result.params).toEqual([1000, 'xyz789']);
    });

    it('should use custom tie-breaker field', () => {
      const cursorData = {
        value: 'value',
        tieBreaker: 'uuid-here',
        sortOrder: 'asc' as const,
      };
      const cursor = encodeCursor(cursorData);

      const result = buildCursorPaginationQuery(cursor, 'name', 'asc', 'uuid');

      expect(result.whereClause).toContain('uuid > $2');
      expect(result.orderByClause).toBe('name ASC, uuid ASC');
    });

    it('should throw on invalid cursor', () => {
      expect(() => {
        buildCursorPaginationQuery('invalid-cursor', 'created_at', 'desc');
      }).toThrow(PaginationError);
    });

    it('should throw on sort order mismatch', () => {
      const cursorData = {
        value: 'value',
        tieBreaker: 'id',
        sortOrder: 'asc' as const,
      };
      const cursor = encodeCursor(cursorData);

      expect(() => {
        buildCursorPaginationQuery(cursor, 'created_at', 'desc');
      }).toThrow("Cursor sort order 'asc' does not match requested sort order 'desc'");
    });
  });

  describe('Pagination metadata calculation', () => {
    interface Item {
      id: string;
      value: number;
    }

    it('should detect hasNext when more items exist', () => {
      const items: Item[] = [
        { id: '1', value: 100 },
        { id: '2', value: 90 },
        { id: '3', value: 80 }, // Extra item indicates more exist
      ];

      const result = calculateCursorPaginationMetadata(items, 2, 'value', 'desc');

      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should return hasNext false when no more items', () => {
      const items: Item[] = [
        { id: '1', value: 100 },
        { id: '2', value: 90 },
      ];

      const result = calculateCursorPaginationMetadata(items, 2, 'value', 'desc');

      expect(result.hasNext).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle empty result set', () => {
      const items: Item[] = [];

      const result = calculateCursorPaginationMetadata(items, 10, 'value', 'desc');

      expect(result.hasNext).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should create valid cursor for last item', () => {
      const items: Item[] = [
        { id: '1', value: 100 },
        { id: '2', value: 90 },
        { id: '3', value: 80 },
      ];

      const result = calculateCursorPaginationMetadata(items, 2, 'value', 'desc');

      const decoded = decodeCursor(result.nextCursor!);
      expect(decoded?.value).toBe(90); // Value of last item in page (id: 2)
      expect(decoded?.tieBreaker).toBe('2');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle single item pagination', () => {
      const items = [{ id: '1', score: 100 }];

      const result = paginateArrayWithCursor(
        items,
        { limit: 10, sortOrder: 'desc' },
        'score',
      );

      expect(result.data).toHaveLength(1);
      expect(result.hasNext).toBe(false);
    });

    it('should handle limit larger than dataset', () => {
      const items = [
        { id: '1', score: 100 },
        { id: '2', score: 90 },
        { id: '3', score: 80 },
      ];

      const result = paginateArrayWithCursor(
        items,
        { limit: 100, sortOrder: 'desc' },
        'score',
      );

      expect(result.data).toHaveLength(3);
      expect(result.hasNext).toBe(false);
    });

    it('should handle items with same sort value', () => {
      const items = [
        { id: 'a', score: 100 },
        { id: 'b', score: 100 },
        { id: 'c', score: 100 },
        { id: 'd', score: 100 },
        { id: 'e', score: 100 },
      ];

      // First page
      const page1 = paginateArrayWithCursor(
        items,
        { limit: 2, sortOrder: 'desc' },
        'score',
      );

      expect(page1.data).toHaveLength(2);

      // Second page should not overlap
      const page2 = paginateArrayWithCursor(
        items,
        page1.nextCursor !== null ? { cursor: page1.nextCursor, limit: 2, sortOrder: 'desc' } : { limit: 2, sortOrder: 'desc' },
        'score',
      );

      const page1Ids = page1.data.map((i) => i.id);
      const page2Ids = page2.data.map((i) => i.id);

      page2Ids.forEach((id) => {
        expect(page1Ids).not.toContain(id);
      });
    });

    it('should handle cursor pointing to non-existent item', () => {
      const items = [
        { id: '1', score: 100 },
        { id: '2', score: 90 },
      ];

      const cursorData = {
        value: 50, // Value lower than all items
        tieBreaker: 'deleted-id',
        sortOrder: 'desc' as const,
      };
      const cursor = encodeCursor(cursorData);

      const result = paginateArrayWithCursor(
        items,
        { cursor, limit: 10, sortOrder: 'desc' },
        'score',
      );

      // Should return empty since cursor is beyond all items
      expect(result.data).toHaveLength(0);
      expect(result.hasNext).toBe(false);
    });
  });

  describe('PaginationError', () => {
    it('should create error with type and message', () => {
      const error = new PaginationError('INVALID_CURSOR', 'The cursor format is invalid');

      expect(error.type).toBe('INVALID_CURSOR');
      expect(error.message).toBe('The cursor format is invalid');
      expect(error.name).toBe('PaginationError');
    });

    it('should include pagination type in error', () => {
      const error = new PaginationError('CURSOR_SORT_MISMATCH', 'Sort mismatch');

      expect(error.type).toBe('CURSOR_SORT_MISMATCH');
    });

    it('should support static type checking methods', () => {
      const error = new PaginationError('INVALID_CURSOR', 'Invalid cursor');

      expect(PaginationError.isPaginationError(error)).toBe(true);
      expect(PaginationError.isType(error, 'INVALID_CURSOR')).toBe(true);
      expect(PaginationError.isType(error, 'INVALID_LIMIT')).toBe(false);
    });
  });
});
