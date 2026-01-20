// packages/core/src/__tests__/pagination.test.ts
import { describe, expect, it } from 'vitest';

import {
  PAGINATION_ERROR_TYPES,
  PaginationError,
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  createCursorForItem,
  decodeCursor,
  encodeCursor,
  paginateArrayWithCursor,
  type CursorData,
} from '../pagination';

describe('Cursor Encoding/Decoding', () => {
  it('should encode and decode cursor data correctly', () => {
    const cursorData = {
      value: '2024-01-01T00:00:00Z',
      tieBreaker: '123',
      sortOrder: 'desc' as const,
    };

    const encoded = encodeCursor(cursorData);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(cursorData);
  });

  it('should handle different data types in cursor', () => {
    const testCases = [
      { value: 'string-value', tieBreaker: 'abc', sortOrder: 'asc' as const },
      { value: 123, tieBreaker: 'def', sortOrder: 'desc' as const },
      { value: new Date('2024-01-01'), tieBreaker: 'ghi', sortOrder: 'asc' as const },
    ];

    testCases.forEach((cursorData) => {
      const encoded = encodeCursor(cursorData);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(cursorData);
    });
  });

  it('should return null for invalid cursors', () => {
    const invalidCursors = [
      '',
      'invalid-base64',
      'eyJpbnZhbGlkX2pzb249dHJ1ZX0=', // {"invalid_json":true}
      null,
      undefined,
    ];

    invalidCursors.forEach((cursor) => {
      expect(decodeCursor(cursor as unknown as string)).toBeNull();
    });
  });

  it('should reject cursors with invalid structure', () => {
    const invalidCursorData = [
      { value: undefined, tieBreaker: '123', sortOrder: 'desc' },
      { value: 'test', tieBreaker: '', sortOrder: 'desc' },
      { value: 'test', tieBreaker: '123', sortOrder: 'invalid' },
      { value: null, tieBreaker: '123', sortOrder: 'desc' },
    ];

    invalidCursorData.forEach((data) => {
      const encoded = encodeCursor(data as unknown as CursorData);
      expect(decodeCursor(encoded)).toBeNull();
    });
  });
});

describe('Cursor Creation', () => {
  it('should create cursor for item correctly', () => {
    const item = {
      id: '123',
      createdAt: '2024-01-01T00:00:00Z',
      name: 'Test Item',
    };

    const cursor = createCursorForItem(item, 'createdAt', 'desc');
    expect(typeof cursor).toBe('string');

    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({
      value: '2024-01-01T00:00:00Z',
      tieBreaker: '123',
      sortOrder: 'desc',
    });
  });

  it('should use custom tie breaker field', () => {
    const item = {
      uuid: 'abc-123',
      timestamp: 1234567890,
    };

    const cursor = createCursorForItem(item, 'timestamp', 'asc', 'uuid');
    const decoded = decodeCursor(cursor);
    expect(decoded?.tieBreaker).toBe('abc-123');
  });

  it('should throw error for missing sort field', () => {
    const item = { id: '123' };

    expect(() => {
      createCursorForItem(item, 'missingField', 'desc');
    }).toThrow('Item missing or has invalid sort field: missingField');
  });
});

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
      sortOrder: 'desc',
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
      sortOrder: 'asc', // Different from requested
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

describe('PaginationError', () => {
  it('should create error with correct type and message', () => {
    const error = new PaginationError('INVALID_CURSOR', 'Test message');

    expect(error.type).toBe('INVALID_CURSOR');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('PaginationError');
  });

  it('should identify pagination errors correctly', () => {
    const paginationError = new PaginationError('INVALID_CURSOR', 'Test');
    const regularError = new Error('Regular error');

    expect(PaginationError.isPaginationError(paginationError)).toBe(true);
    expect(PaginationError.isPaginationError(regularError)).toBe(false);
    expect(PaginationError.isType(paginationError, 'INVALID_CURSOR')).toBe(true);
    expect(PaginationError.isType(paginationError, 'INVALID_PAGE')).toBe(false);
  });
});
