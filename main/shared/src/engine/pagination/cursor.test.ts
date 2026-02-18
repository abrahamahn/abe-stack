// main/shared/src/engine/pagination/cursor.test.ts
import { describe, expect, it } from 'vitest';

import {
  createCursorForItem,
  decodeCursor,
  encodeCursor,
  getSortableValue,
  isCursorValue,
  type CursorData,
} from './cursor';

describe('Cursor Encoding/Decoding', () => {
  it('should encode and decode cursor data correctly', () => {
    const data: CursorData = {
      value: '2024-01-01T00:00:00Z',
      tieBreaker: '123',
      sortOrder: 'desc',
    };

    const encoded = encodeCursor(data);
    const decoded = decodeCursor(encoded);

    expect(decoded).toEqual(data);
  });

  it('should handle different sort orders', () => {
    const data: CursorData = {
      value: '2024-01-01T00:00:00Z',
      tieBreaker: '123',
      sortOrder: 'asc',
    };

    const encoded = encodeCursor(data);
    const decoded = decodeCursor(encoded);

    expect(decoded!.sortOrder).toBe('asc');
  });

  it('should return null for invalid cursor format', () => {
    expect(decodeCursor('invalid-cursor')).toBeNull();
  });

  it('should handle numeric values as strings', () => {
    const data: CursorData = {
      value: 100,
      tieBreaker: '123',
      sortOrder: 'desc',
    };

    const encoded = encodeCursor(data);
    const decoded = decodeCursor(encoded);

    expect(decoded!.value).toBe(100);
  });
});

// ============================================================================
// Adversarial: decodeCursor failure modes
// ============================================================================

describe('decodeCursor — adversarial', () => {
  it('returns null for empty string', () => {
    expect(decodeCursor('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    // base64url decode of "   " is valid base64 but the JSON won't be a valid cursor
    expect(decodeCursor('   ')).toBeNull();
  });

  it('returns null for a plain non-base64 string', () => {
    expect(decodeCursor('not!!base64@@')).toBeNull();
  });

  it('returns null for valid base64 that is not JSON', () => {
    // "hello world" base64url encoded
    const notJson = Buffer.from('hello world', 'utf8').toString('base64url');
    expect(decodeCursor(notJson)).toBeNull();
  });

  it('returns null for valid JSON that is a primitive (number)', () => {
    const encoded = Buffer.from('42', 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for valid JSON that is a primitive (string)', () => {
    const encoded = Buffer.from('"hello"', 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for valid JSON null', () => {
    const encoded = Buffer.from('null', 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for array cursor with missing tieBreaker', () => {
    const payload = JSON.stringify(['value', '', 'asc']);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for array cursor with null tieBreaker', () => {
    const payload = JSON.stringify(['value', null, 'desc']);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for array cursor with whitespace-only tieBreaker', () => {
    const payload = JSON.stringify(['value', '   ', 'asc']);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for invalid sortOrder in array format', () => {
    const payload = JSON.stringify(['value', 'tie-123', 'random']);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for invalid sortOrder in object format', () => {
    const payload = JSON.stringify({ value: 'v', tieBreaker: 'tb', sortOrder: 'DESC' });
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for object cursor missing tieBreaker', () => {
    const payload = JSON.stringify({ value: 'v', sortOrder: 'asc' });
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for object cursor with null value', () => {
    const payload = JSON.stringify({ value: null, tieBreaker: 'tb', sortOrder: 'asc' });
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for additionalValues containing null entry', () => {
    const payload = JSON.stringify(['value', 'tie', 'asc', [null]]);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for additionalValues that is not an array', () => {
    const payload = JSON.stringify(['value', 'tie', 'asc', 'not-an-array']);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for cursor string with special URL characters', () => {
    expect(decodeCursor('eyJ0eXBlIjoi%3D%3D')).toBeNull();
  });

  it('returns null for cursor that is all zeros (truncated base64)', () => {
    expect(decodeCursor('AAAAAAAAAA==')).toBeNull();
  });

  it('returns null for cursor containing SQL injection attempt', () => {
    const sqlInjection = "'; DROP TABLE users; --";
    const encoded = Buffer.from(sqlInjection, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for cursor with tampered sort order (uppercase DESC)', () => {
    // Build valid cursor then tamper the raw JSON
    const valid: CursorData = { value: 'x', tieBreaker: 'y', sortOrder: 'asc' };
    const goodJson = Buffer.from(
      Buffer.from(encodeCursor(valid), 'base64url').toString('utf8').replace('"asc"', '"ASC"'),
      'utf8',
    ).toString('base64url');
    expect(decodeCursor(goodJson)).toBeNull();
  });

  it('handles a very long cursor string without throwing', () => {
    const longString = 'A'.repeat(100_000);
    expect(decodeCursor(longString)).toBeNull();
  });

  it('decodes cursor with Date value round-trip', () => {
    const date = new Date('2024-06-15T12:00:00.000Z');
    const data: CursorData = { value: date, tieBreaker: 'abc', sortOrder: 'asc' };
    const encoded = encodeCursor(data);
    const decoded = decodeCursor(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.value).toBeInstanceOf(Date);
    expect((decoded!.value as Date).toISOString()).toBe(date.toISOString());
  });

  it('returns null for dateIso with invalid date string', () => {
    const payload = JSON.stringify([{ dateIso: 'not-a-date' }, 'tie', 'asc']);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });

  it('returns null for dateIso with non-string inner value', () => {
    const payload = JSON.stringify([{ dateIso: 42 }, 'tie', 'asc']);
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');
    expect(decodeCursor(encoded)).toBeNull();
  });
});

// ============================================================================
// Adversarial: createCursorForItem failure modes
// ============================================================================

describe('createCursorForItem — adversarial', () => {
  it('throws when sort field is missing from item', () => {
    expect(() =>
      createCursorForItem({ id: '1', name: 'Test' }, 'createdAt', 'asc'),
    ).toThrow('Item missing or has invalid sort field: createdAt');
  });

  it('throws when sort field value is null', () => {
    expect(() =>
      createCursorForItem({ id: '1', createdAt: null }, 'createdAt', 'desc'),
    ).toThrow('Item missing or has invalid sort field: createdAt');
  });

  it('throws when sort field value is an object', () => {
    expect(() =>
      createCursorForItem({ id: '1', createdAt: {} }, 'createdAt', 'asc'),
    ).toThrow('Item missing or has invalid sort field: createdAt');
  });

  it('throws when sort field value is a boolean', () => {
    expect(() =>
      createCursorForItem({ id: '1', active: true }, 'active', 'asc'),
    ).toThrow('Item missing or has invalid sort field: active');
  });

  it('throws when tieBreaker field is null', () => {
    expect(() =>
      createCursorForItem({ id: null, createdAt: '2024-01-01' }, 'createdAt', 'asc'),
    ).toThrow('Invalid tie-breaker field: id. Must be string or number.');
  });

  it('throws when tieBreaker field is undefined', () => {
    expect(() =>
      createCursorForItem({ createdAt: '2024-01-01' }, 'createdAt', 'asc'),
    ).toThrow('Invalid tie-breaker field: id. Must be string or number.');
  });

  it('throws when tieBreaker field is an object', () => {
    expect(() =>
      createCursorForItem({ id: {}, createdAt: '2024-01-01' }, 'createdAt', 'asc'),
    ).toThrow('Invalid tie-breaker field: id. Must be string or number.');
  });

  it('succeeds when tieBreaker is a numeric ID', () => {
    const cursor = createCursorForItem({ id: 42, createdAt: '2024-01-01' }, 'createdAt', 'asc');
    expect(typeof cursor).toBe('string');
    expect(cursor.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Adversarial: getSortableValue failure modes
// ============================================================================

describe('getSortableValue — adversarial', () => {
  it('throws for missing key', () => {
    expect(() => getSortableValue({ id: '1' }, 'missingKey')).toThrow(
      'Invalid sort value for key "missingKey"',
    );
  });

  it('throws for null value', () => {
    expect(() => getSortableValue({ score: null }, 'score')).toThrow(
      'Invalid sort value for key "score"',
    );
  });

  it('throws for boolean value', () => {
    expect(() => getSortableValue({ active: false }, 'active')).toThrow(
      'Invalid sort value for key "active"',
    );
  });

  it('throws for array value', () => {
    expect(() => getSortableValue({ tags: ['a', 'b'] }, 'tags')).toThrow(
      'Invalid sort value for key "tags"',
    );
  });

  it('returns 0 (valid number)', () => {
    expect(getSortableValue({ count: 0 }, 'count')).toBe(0);
  });

  it('returns empty string (valid)', () => {
    expect(getSortableValue({ name: '' }, 'name')).toBe('');
  });
});

// ============================================================================
// Adversarial: isCursorValue
// ============================================================================

describe('isCursorValue — adversarial', () => {
  it('returns false for null', () => {
    expect(isCursorValue(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCursorValue(undefined)).toBe(false);
  });

  it('returns false for object', () => {
    expect(isCursorValue({})).toBe(false);
  });

  it('returns false for boolean', () => {
    expect(isCursorValue(true)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isCursorValue([])).toBe(false);
  });

  it('returns true for 0', () => {
    expect(isCursorValue(0)).toBe(true);
  });

  it('returns true for NaN (typeof NaN === "number")', () => {
    // NaN passes typeof === 'number'; the function does not guard against NaN
    expect(isCursorValue(NaN)).toBe(true);
  });

  it('returns true for Date instance', () => {
    expect(isCursorValue(new Date())).toBe(true);
  });
});

// ============================================================================
// Adversarial: encode/decode round-trip edge cases
// ============================================================================

describe('encodeCursor / decodeCursor round-trip edge cases', () => {
  it('survives a value with unicode characters', () => {
    const data: CursorData = { value: '日本語テスト🚀', tieBreaker: 'x', sortOrder: 'asc' };
    expect(decodeCursor(encodeCursor(data))).toEqual(data);
  });

  it('survives a value with newlines and control characters', () => {
    const data: CursorData = { value: 'line1\nline2\t\r', tieBreaker: 'y', sortOrder: 'desc' };
    expect(decodeCursor(encodeCursor(data))).toEqual(data);
  });

  it('survives Number.MAX_SAFE_INTEGER as value', () => {
    const data: CursorData = {
      value: Number.MAX_SAFE_INTEGER,
      tieBreaker: '1',
      sortOrder: 'asc',
    };
    const decoded = decodeCursor(encodeCursor(data));
    expect(decoded!.value).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('survives negative number as value', () => {
    const data: CursorData = { value: -9999, tieBreaker: '1', sortOrder: 'asc' };
    expect(decodeCursor(encodeCursor(data))!.value).toBe(-9999);
  });

  it('survives additionalValues round-trip', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const data: CursorData = {
      value: 'primary',
      tieBreaker: 'tb',
      sortOrder: 'asc',
      additionalValues: [42, 'extra', date],
    };
    const decoded = decodeCursor(encodeCursor(data));
    expect(decoded!.additionalValues).toHaveLength(3);
    expect(decoded!.additionalValues![2]).toBeInstanceOf(Date);
  });

  it('produces URL-safe characters only (no +, /, =)', () => {
    const data: CursorData = { value: 'test value', tieBreaker: 'id-1', sortOrder: 'desc' };
    const encoded = encodeCursor(data);
    expect(encoded).not.toMatch(/[+/=]/);
  });
});
