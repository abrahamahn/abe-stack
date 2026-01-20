// packages/core/src/domains/pagination/__tests__/cursor.test.ts
import { describe, expect, it } from 'vitest';

import { createCursorForItem, decodeCursor, encodeCursor, type CursorData } from '../cursor';

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
