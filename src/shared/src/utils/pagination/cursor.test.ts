// packages/shared/src/utils/pagination/cursor.test.ts
import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor, type CursorData } from './cursor';

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
