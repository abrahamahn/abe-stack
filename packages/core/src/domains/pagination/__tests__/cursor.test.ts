// packages/core/src/domains/pagination/__tests__/cursor.test.ts
import { describe, expect, it } from 'vitest';

import {
  createCursorForItem,
  decodeCursor,
  encodeCursor,
  getSortableValue,
  isCursorValue,
  type CursorData,
} from '../cursor';

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

  it('should throw error for missing tie-breaker field', () => {
    const item = { value: 'test' };

    expect(() => {
      createCursorForItem(item, 'value', 'desc', 'id');
    }).toThrow('Item missing tie-breaker field: id');
  });

  it('should throw error for invalid sort field type', () => {
    const item = { id: '123', value: { nested: 'object' } };

    expect(() => {
      createCursorForItem(item, 'value', 'desc');
    }).toThrow('Item missing or has invalid sort field: value');
  });
});

describe('Cursor with additional values', () => {
  it('should encode and decode cursor with additional values', () => {
    const cursorData: CursorData = {
      value: 'primary',
      tieBreaker: '123',
      sortOrder: 'asc',
      additionalValues: ['secondary', 456, new Date('2024-06-15')],
    };

    const encoded = encodeCursor(cursorData);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBeDefined();
    expect(decoded?.value).toBe('primary');
    expect(decoded?.additionalValues).toBeDefined();
    expect(decoded?.additionalValues).toHaveLength(3);
    expect(decoded?.additionalValues?.[0]).toBe('secondary');
    expect(decoded?.additionalValues?.[1]).toBe(456);
    expect(decoded?.additionalValues?.[2]).toEqual(new Date('2024-06-15'));
  });

  it('should reject cursor with invalid additional values', () => {
    // Create a cursor with invalid additional values manually
    const invalidData = ['primary', '123', 'asc', [{ invalid: 'object' }]];
    const jsonString = JSON.stringify(invalidData);
    const encoded = Buffer.from(jsonString, 'utf8').toString('base64url');

    const decoded = decodeCursor(encoded);
    expect(decoded).toBeNull();
  });
});

describe('getSortableValue', () => {
  it('should return string value', () => {
    const item = { name: 'test' };
    expect(getSortableValue(item, 'name')).toBe('test');
  });

  it('should return number value', () => {
    const item = { count: 42 };
    expect(getSortableValue(item, 'count')).toBe(42);
  });

  it('should return Date value', () => {
    const date = new Date('2024-01-01');
    const item = { createdAt: date };
    expect(getSortableValue(item, 'createdAt')).toEqual(date);
  });

  it('should throw for invalid value type', () => {
    const item = { data: { nested: 'value' } };
    expect(() => getSortableValue(item, 'data')).toThrow('Invalid sort value for key "data"');
  });

  it('should throw for undefined value', () => {
    const item = { id: '123' };
    expect(() => getSortableValue(item, 'missing')).toThrow('Invalid sort value for key "missing"');
  });
});

describe('isCursorValue', () => {
  it('should return true for string', () => {
    expect(isCursorValue('test')).toBe(true);
  });

  it('should return true for number', () => {
    expect(isCursorValue(123)).toBe(true);
  });

  it('should return true for Date', () => {
    expect(isCursorValue(new Date())).toBe(true);
  });

  it('should return false for object', () => {
    expect(isCursorValue({ key: 'value' })).toBe(false);
  });

  it('should return false for array', () => {
    expect(isCursorValue([1, 2, 3])).toBe(false);
  });

  it('should return false for null', () => {
    expect(isCursorValue(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isCursorValue(undefined)).toBe(false);
  });
});

describe('Cursor object format decoding', () => {
  it('should decode object format cursor', () => {
    // Create cursor in object format instead of array format
    const objectData = {
      value: 'test-value',
      tieBreaker: '123',
      sortOrder: 'desc',
    };
    const jsonString = JSON.stringify(objectData);
    const encoded = Buffer.from(jsonString, 'utf8').toString('base64url');

    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual({
      value: 'test-value',
      tieBreaker: '123',
      sortOrder: 'desc',
      additionalValues: undefined,
    });
  });

  it('should decode object format cursor with additional values', () => {
    const objectData = {
      value: 'test-value',
      tieBreaker: '123',
      sortOrder: 'asc',
      additionalValues: ['extra1', 456],
    };
    const jsonString = JSON.stringify(objectData);
    const encoded = Buffer.from(jsonString, 'utf8').toString('base64url');

    const decoded = decodeCursor(encoded);
    expect(decoded?.additionalValues).toEqual(['extra1', 456]);
  });

  it('should reject object format with invalid additional values', () => {
    const objectData = {
      value: 'test-value',
      tieBreaker: '123',
      sortOrder: 'asc',
      additionalValues: [{ invalid: 'object' }],
    };
    const jsonString = JSON.stringify(objectData);
    const encoded = Buffer.from(jsonString, 'utf8').toString('base64url');

    const decoded = decodeCursor(encoded);
    expect(decoded).toBeNull();
  });

  it('should reject object format with non-array additional values', () => {
    const objectData = {
      value: 'test-value',
      tieBreaker: '123',
      sortOrder: 'asc',
      additionalValues: 'not-an-array',
    };
    const jsonString = JSON.stringify(objectData);
    const encoded = Buffer.from(jsonString, 'utf8').toString('base64url');

    const decoded = decodeCursor(encoded);
    expect(decoded).toBeNull();
  });
});
