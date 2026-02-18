// main/shared/src/system/pagination/pagination.test.ts
import { describe, expect, it } from 'vitest';

import { createSchema, parseString } from '../../primitives/schema';

import {
  calculateCursorPaginationMetadata,
  calculateOffsetPaginationMetadata,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  PaginationError,
  PAGINATION_ERROR_TYPES,
  paginatedResultSchema,
  paginationOptionsSchema,
} from './pagination';

/** Reusable test item schema: { id: string, name: string } */
const idNameSchema = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: parseString(obj['id'], 'id'),
    name: parseString(obj['name'], 'name'),
  };
});

/** Reusable test item schema: { id: string } */
const idOnlySchema = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { id: parseString(obj['id'], 'id') };
});

describe('pagination utilities', () => {
  // ==========================================================================
  // PaginationError
  // ==========================================================================
  describe('PaginationError', () => {
    it('sets correct properties', () => {
      const error = new PaginationError(PAGINATION_ERROR_TYPES.INVALID_CURSOR, 'Bad cursor');
      expect(error.message).toBe('Bad cursor');
      expect(error.type).toBe('INVALID_CURSOR');
      expect(error.name).toBe('PaginationError');
      expect(error.details).toBeUndefined();
    });

    it('accepts optional details', () => {
      const error = new PaginationError(PAGINATION_ERROR_TYPES.INVALID_LIMIT, 'Bad limit', {
        min: 1,
        max: 1000,
      });
      expect(error.details).toEqual({ min: 1, max: 1000 });
    });

    it('is an instance of Error', () => {
      const error = new PaginationError(PAGINATION_ERROR_TYPES.INVALID_CURSOR, 'test');
      expect(error).toBeInstanceOf(Error);
    });

    describe('isPaginationError', () => {
      it('returns true for PaginationError instances', () => {
        const error = new PaginationError(PAGINATION_ERROR_TYPES.INVALID_CURSOR, 'test');
        expect(PaginationError.isPaginationError(error)).toBe(true);
      });

      it('returns false for standard errors', () => {
        expect(PaginationError.isPaginationError(new Error('test'))).toBe(false);
      });

      it('returns false for non-error values', () => {
        expect(PaginationError.isPaginationError('string')).toBe(false);
        expect(PaginationError.isPaginationError(null)).toBe(false);
        expect(PaginationError.isPaginationError(undefined)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // paginatedResultSchema
  // ==========================================================================
  describe('paginatedResultSchema', () => {
    const schema = paginatedResultSchema(idNameSchema);

    it('validates a correct paginated result', () => {
      const data = {
        data: [{ id: '1', name: 'Test' }],
        total: 1,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        totalPages: 1,
      };
      expect(schema.parse(data)).toEqual(data);
    });

    it('rejects invalid items in data array', () => {
      expect(() =>
        schema.parse({
          data: [{ id: 123 }],
          total: 1,
          page: 1,
          limit: 10,
          hasNext: false,
          hasPrev: false,
          totalPages: 1,
        }),
      ).toThrow();
    });

    it('rejects negative total', () => {
      expect(() =>
        schema.parse({
          data: [],
          total: -1,
          page: 1,
          limit: 10,
          hasNext: false,
          hasPrev: false,
          totalPages: 0,
        }),
      ).toThrow();
    });

    it('rejects page < 1', () => {
      expect(() =>
        schema.parse({
          data: [],
          total: 0,
          page: 0,
          limit: 10,
          hasNext: false,
          hasPrev: false,
          totalPages: 0,
        }),
      ).toThrow();
    });
  });

  // ==========================================================================
  // cursorPaginatedResultSchema
  // ==========================================================================
  describe('cursorPaginatedResultSchema', () => {
    const schema = cursorPaginatedResultSchema(idOnlySchema);

    it('validates a correct cursor paginated result', () => {
      const data = {
        data: [{ id: '1' }],
        nextCursor: 'abc',
        hasNext: true,
        limit: 10,
      };
      expect(schema.parse(data)).toEqual(data);
    });

    it('accepts null nextCursor', () => {
      const data = {
        data: [],
        nextCursor: null,
        hasNext: false,
        limit: 10,
      };
      expect(schema.parse(data)).toEqual(data);
    });

    it('rejects limit < 1', () => {
      expect(() =>
        schema.parse({
          data: [],
          nextCursor: null,
          hasNext: false,
          limit: 0,
        }),
      ).toThrow();
    });
  });

  // ==========================================================================
  // paginationOptionsSchema
  // ==========================================================================
  describe('paginationOptionsSchema', () => {
    it('applies defaults', () => {
      const result = paginationOptionsSchema.parse({});
      expect(result).toEqual({
        page: 1,
        limit: 50,
        sortOrder: 'desc',
      });
    });

    it('coerces string values to numbers', () => {
      const result = paginationOptionsSchema.parse({ page: '3', limit: '25' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
    });

    it('rejects page < 1', () => {
      expect(() => paginationOptionsSchema.parse({ page: 0 })).toThrow();
    });

    it('rejects limit > 1000', () => {
      expect(() => paginationOptionsSchema.parse({ limit: 1001 })).toThrow();
    });

    it('accepts optional sortBy', () => {
      const result = paginationOptionsSchema.parse({ sortBy: 'createdAt' });
      expect(result.sortBy).toBe('createdAt');
    });
  });

  // ==========================================================================
  // cursorPaginationOptionsSchema
  // ==========================================================================
  describe('cursorPaginationOptionsSchema', () => {
    it('applies defaults', () => {
      const result = cursorPaginationOptionsSchema.parse({});
      expect(result).toEqual({
        limit: 50,
        sortOrder: 'desc',
      });
    });

    it('accepts cursor', () => {
      const result = cursorPaginationOptionsSchema.parse({ cursor: 'abc123' });
      expect(result.cursor).toBe('abc123');
    });
  });

  // ==========================================================================
  // calculateOffsetPaginationMetadata
  // ==========================================================================
  describe('calculateOffsetPaginationMetadata', () => {
    it('calculates first page metadata', () => {
      const result = calculateOffsetPaginationMetadata({ page: 1, limit: 10, total: 50 });
      expect(result).toEqual({
        hasNext: true,
        hasPrev: false,
        totalPages: 5,
      });
    });

    it('calculates middle page metadata', () => {
      const result = calculateOffsetPaginationMetadata({ page: 3, limit: 10, total: 50 });
      expect(result).toEqual({
        hasNext: true,
        hasPrev: true,
        totalPages: 5,
      });
    });

    it('calculates last page metadata', () => {
      const result = calculateOffsetPaginationMetadata({ page: 5, limit: 10, total: 50 });
      expect(result).toEqual({
        hasNext: false,
        hasPrev: true,
        totalPages: 5,
      });
    });

    it('handles single page', () => {
      const result = calculateOffsetPaginationMetadata({ page: 1, limit: 10, total: 5 });
      expect(result).toEqual({
        hasNext: false,
        hasPrev: false,
        totalPages: 1,
      });
    });

    it('handles empty results', () => {
      const result = calculateOffsetPaginationMetadata({ page: 1, limit: 10, total: 0 });
      expect(result).toEqual({
        hasNext: false,
        hasPrev: false,
        totalPages: 0,
      });
    });
  });

  // ==========================================================================
  // calculateCursorPaginationMetadata
  // ==========================================================================
  describe('calculateCursorPaginationMetadata', () => {
    it('detects next page when data has extra item', () => {
      const data = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' }, // extra lookahead item
      ];
      const result = calculateCursorPaginationMetadata(data, 3);
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toBe('3');
    });

    it('detects no next page when data fits exactly', () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const result = calculateCursorPaginationMetadata(data, 3);
      expect(result.hasNext).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('handles empty data', () => {
      const result = calculateCursorPaginationMetadata([], 10);
      expect(result.hasNext).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('handles numeric IDs', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      const result = calculateCursorPaginationMetadata(data, 3);
      expect(result.nextCursor).toBe('3');
    });
  });

  // ==========================================================================
  // createCursorPaginatedResult
  // ==========================================================================
  describe('createCursorPaginatedResult', () => {
    it('trims data to limit and sets metadata', () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
      const result = createCursorPaginatedResult(data, 3);
      expect(result.data).toHaveLength(3);
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toBe('3');
      expect(result.limit).toBe(3);
    });

    it('returns all data when no next page', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const result = createCursorPaginatedResult(data, 3);
      expect(result.data).toHaveLength(2);
      expect(result.hasNext).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  // ==========================================================================
  // createPaginatedResult
  // ==========================================================================
  describe('createPaginatedResult', () => {
    it('creates paginated result with metadata', () => {
      const data = ['a', 'b', 'c'];
      const result = createPaginatedResult(data, 30, { page: 1, limit: 10, sortOrder: 'desc' });
      expect(result).toEqual({
        data: ['a', 'b', 'c'],
        total: 30,
        page: 1,
        limit: 10,
        hasNext: true,
        hasPrev: false,
        totalPages: 3,
      });
    });

    it('handles last page', () => {
      const result = createPaginatedResult(['z'], 21, { page: 3, limit: 10, sortOrder: 'asc' });
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
      expect(result.totalPages).toBe(3);
    });
  });
});

// ============================================================================
// Adversarial: paginationOptionsSchema string coercion edge cases
// ============================================================================

describe('paginationOptionsSchema — adversarial', () => {
  it('rejects page=0 (below minimum)', () => {
    expect(() => paginationOptionsSchema.parse({ page: 0 })).toThrow();
  });

  it('rejects page=-1 (negative)', () => {
    expect(() => paginationOptionsSchema.parse({ page: -1 })).toThrow();
  });

  it('rejects string "0" coerced to page 0', () => {
    expect(() => paginationOptionsSchema.parse({ page: '0' })).toThrow();
  });

  it('rejects string "-5" coerced to negative page', () => {
    expect(() => paginationOptionsSchema.parse({ page: '-5' })).toThrow();
  });

  it('rejects float page (1.5)', () => {
    expect(() => paginationOptionsSchema.parse({ page: 1.5 })).toThrow();
  });

  it('rejects string float page ("2.7")', () => {
    expect(() => paginationOptionsSchema.parse({ page: '2.7' })).toThrow();
  });

  it('rejects limit=0', () => {
    expect(() => paginationOptionsSchema.parse({ limit: 0 })).toThrow();
  });

  it('rejects limit=-1', () => {
    expect(() => paginationOptionsSchema.parse({ limit: -1 })).toThrow();
  });

  it('rejects limit=1001 (one above max)', () => {
    expect(() => paginationOptionsSchema.parse({ limit: 1001 })).toThrow();
  });

  it('accepts limit=1000 (exactly at max)', () => {
    const result = paginationOptionsSchema.parse({ limit: 1000 });
    expect(result.limit).toBe(1000);
  });

  it('accepts limit=1 (exactly at min)', () => {
    const result = paginationOptionsSchema.parse({ limit: 1 });
    expect(result.limit).toBe(1);
  });

  it('rejects float limit (10.5)', () => {
    expect(() => paginationOptionsSchema.parse({ limit: 10.5 })).toThrow();
  });

  it('rejects non-numeric string for page ("abc")', () => {
    expect(() => paginationOptionsSchema.parse({ page: 'abc' })).toThrow();
  });

  it('rejects non-numeric string for limit ("xyz")', () => {
    expect(() => paginationOptionsSchema.parse({ limit: 'xyz' })).toThrow();
  });

  it('rejects invalid sortOrder value', () => {
    expect(() => paginationOptionsSchema.parse({ sortOrder: 'random' })).toThrow();
  });

  it('rejects sortOrder = "DESC" (uppercase, not in enum)', () => {
    expect(() => paginationOptionsSchema.parse({ sortOrder: 'DESC' })).toThrow();
  });

  it('rejects sortOrder = "ASC" (uppercase, not in enum)', () => {
    expect(() => paginationOptionsSchema.parse({ sortOrder: 'ASC' })).toThrow();
  });

  it('accepts page = Number.MAX_SAFE_INTEGER as string coercion (valid large page)', () => {
    // Should parse without throwing — large page is valid (just returns empty data in practice)
    const result = paginationOptionsSchema.parse({ page: String(Number.MAX_SAFE_INTEGER) });
    expect(result.page).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('treats non-object input as empty object (uses defaults)', () => {
    // null/undefined/primitive inputs → schema treats as {} → all defaults applied
    const result = paginationOptionsSchema.parse(null);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });
});

// ============================================================================
// Adversarial: cursorPaginationOptionsSchema edge cases
// ============================================================================

describe('cursorPaginationOptionsSchema — adversarial', () => {
  it('rejects limit=0', () => {
    expect(() => cursorPaginationOptionsSchema.parse({ limit: 0 })).toThrow();
  });

  it('rejects limit=-1', () => {
    expect(() => cursorPaginationOptionsSchema.parse({ limit: -1 })).toThrow();
  });

  it('rejects limit=1001', () => {
    expect(() => cursorPaginationOptionsSchema.parse({ limit: 1001 })).toThrow();
  });

  it('accepts an empty string cursor (valid string — decoding happens later)', () => {
    const result = cursorPaginationOptionsSchema.parse({ cursor: '' });
    expect(result.cursor).toBe('');
  });

  it('rejects invalid sortOrder for cursor pagination', () => {
    expect(() => cursorPaginationOptionsSchema.parse({ sortOrder: 'sideways' })).toThrow();
  });

  it('does not reject SQL injection in cursor (just a string; validation happens later)', () => {
    // The schema just validates it is a string; the cursor validation happens at query time
    const result = cursorPaginationOptionsSchema.parse({
      cursor: "'; DROP TABLE users; --",
      limit: 10,
      sortOrder: 'asc',
    });
    expect(result.cursor).toBe("'; DROP TABLE users; --");
  });

  it('accepts float limit string that coerces to float — then rejects as non-integer', () => {
    expect(() => cursorPaginationOptionsSchema.parse({ limit: '10.5' })).toThrow();
  });
});

// ============================================================================
// Adversarial: calculateOffsetPaginationMetadata edge cases
// ============================================================================

describe('calculateOffsetPaginationMetadata — adversarial', () => {
  it('zero total items yields totalPages=0, no next, no prev', () => {
    const result = calculateOffsetPaginationMetadata({ page: 1, limit: 10, total: 0 });
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it('page beyond totalPages still reports hasNext=false', () => {
    // page=10 with total=5, limit=10 → totalPages=1; page > totalPages
    const result = calculateOffsetPaginationMetadata({ page: 10, limit: 10, total: 5 });
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  it('limit=1 with total=1 yields totalPages=1', () => {
    const result = calculateOffsetPaginationMetadata({ page: 1, limit: 1, total: 1 });
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
  });

  it('non-even division rounds up for totalPages', () => {
    // 11 items, limit=10 → 2 pages
    const result = calculateOffsetPaginationMetadata({ page: 1, limit: 10, total: 11 });
    expect(result.totalPages).toBe(2);
    expect(result.hasNext).toBe(true);
  });

  it('total = limit yields exactly 1 page with no next', () => {
    const result = calculateOffsetPaginationMetadata({ page: 1, limit: 50, total: 50 });
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it('very large total does not cause integer overflow', () => {
    const result = calculateOffsetPaginationMetadata({
      page: 1,
      limit: 50,
      total: Number.MAX_SAFE_INTEGER,
    });
    expect(result.hasNext).toBe(true);
    expect(result.totalPages).toBeGreaterThan(0);
  });
});

// ============================================================================
// Adversarial: calculateCursorPaginationMetadata edge cases
// ============================================================================

describe('calculateCursorPaginationMetadata (offset version) — adversarial', () => {
  it('item with undefined id: the last-in-viewport item (index limit-1) determines cursor', () => {
    // data[0]={id:'1'}, data[1]={id:'2'}, data[2]={} — limit=2 means viewport is [0,1]
    // hasNext = data.length(3) > limit(2) = true
    // lastItemInRange = data[limit-1] = data[1] = {id:'2'}
    // nextCursor = String('2') = '2' (not null)
    const data: { id?: string }[] = [{ id: '1' }, { id: '2' }, {}];
    const result = calculateCursorPaginationMetadata(data as { id?: string | number }[], 2);
    expect(result.hasNext).toBe(true);
    // Cursor is taken from data[1].id = '2', which is defined
    expect(result.nextCursor).toBe('2');
  });

  it('item at viewport boundary with undefined id yields null cursor', () => {
    // data[0]={id:'1'}, data[1]={} — limit=1 means viewport is [data[0]]
    // lastItemInRange = data[0] = {id:'1'} → nextCursor='1'
    // To get null: need the limit-1 item to have no id
    const data: { id?: string }[] = [{}, { id: '2' }];
    const result = calculateCursorPaginationMetadata(data as { id?: string | number }[], 1);
    expect(result.hasNext).toBe(true);
    // data[0].id = undefined → String(undefined ?? '') = '' → null
    expect(result.nextCursor).toBeNull();
  });

  it('limit=1 with exactly 1 item: no next page', () => {
    const data = [{ id: 'abc' }];
    const result = calculateCursorPaginationMetadata(data, 1);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('limit=1 with 2 items: has next, cursor is id of first item', () => {
    const data = [{ id: 'first' }, { id: 'second' }];
    const result = calculateCursorPaginationMetadata(data, 1);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toBe('first');
  });
});

// ============================================================================
// Adversarial: createCursorPaginatedResult edge cases
// ============================================================================

describe('createCursorPaginatedResult — adversarial', () => {
  it('empty data with limit=10 returns no next, null cursor', () => {
    const result = createCursorPaginatedResult([], 10);
    expect(result.data).toHaveLength(0);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.limit).toBe(10);
  });

  it('data length exactly equals limit: no next page', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1) }));
    const result = createCursorPaginatedResult(data, 5);
    expect(result.hasNext).toBe(false);
    expect(result.data).toHaveLength(5);
  });

  it('data length = limit + 1: has next, data trimmed to limit', () => {
    const data = Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1) }));
    const result = createCursorPaginatedResult(data, 5);
    expect(result.hasNext).toBe(true);
    expect(result.data).toHaveLength(5);
    expect(result.nextCursor).toBe('5');
  });

  it('limit larger than data length returns all data with no next', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = createCursorPaginatedResult(data, 100);
    expect(result.data).toHaveLength(2);
    expect(result.hasNext).toBe(false);
  });
});

// ============================================================================
// Adversarial: createPaginatedResult edge cases
// ============================================================================

describe('createPaginatedResult — adversarial', () => {
  it('zero total with page=1 yields correct metadata', () => {
    const result = createPaginatedResult([], 0, { page: 1, limit: 10, sortOrder: 'asc' });
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
    expect(result.data).toHaveLength(0);
  });

  it('page beyond totalPages: hasPrev=true, hasNext=false', () => {
    const result = createPaginatedResult([], 5, { page: 99, limit: 10, sortOrder: 'desc' });
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });
});

// ============================================================================
// Adversarial: PaginationError.isType
// ============================================================================

describe('PaginationError.isType — adversarial', () => {
  it('returns false for wrong type', () => {
    const error = new PaginationError(PAGINATION_ERROR_TYPES.INVALID_CURSOR, 'test');
    expect(PaginationError.isType(error, PAGINATION_ERROR_TYPES.INVALID_LIMIT)).toBe(false);
  });

  it('returns true for matching type', () => {
    const error = new PaginationError(PAGINATION_ERROR_TYPES.INVALID_LIMIT, 'test');
    expect(PaginationError.isType(error, PAGINATION_ERROR_TYPES.INVALID_LIMIT)).toBe(true);
  });

  it('returns false for regular Error', () => {
    expect(PaginationError.isType(new Error('test'), PAGINATION_ERROR_TYPES.INVALID_CURSOR)).toBe(
      false,
    );
  });

  it('returns false for null', () => {
    expect(PaginationError.isType(null, PAGINATION_ERROR_TYPES.INVALID_CURSOR)).toBe(false);
  });
});

// ============================================================================
// Adversarial: paginatedResultSchema edge cases
// ============================================================================

describe('paginatedResultSchema — adversarial', () => {
  const schema = paginatedResultSchema(idNameSchema);

  it('rejects non-array data field (object)', () => {
    expect(() =>
      schema.parse({
        data: {},
        total: 0,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        totalPages: 0,
      }),
    ).toThrow();
  });

  it('rejects null input entirely', () => {
    expect(() => schema.parse(null)).toThrow();
  });

  it('rejects missing data field', () => {
    expect(() =>
      schema.parse({ total: 0, page: 1, limit: 10, hasNext: false, hasPrev: false, totalPages: 0 }),
    ).toThrow();
  });

  it('rejects totalPages = -1', () => {
    expect(() =>
      schema.parse({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        totalPages: -1,
      }),
    ).toThrow();
  });

  it('accepts zero total with empty data array', () => {
    const result = schema.parse({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
      totalPages: 0,
    });
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });
});

// ============================================================================
// Adversarial: cursorPaginatedResultSchema edge cases
// ============================================================================

describe('cursorPaginatedResultSchema — adversarial', () => {
  const schema = cursorPaginatedResultSchema(idOnlySchema);

  it('rejects numeric nextCursor (not a string)', () => {
    expect(() => schema.parse({ data: [], nextCursor: 12345, hasNext: true, limit: 10 })).toThrow();
  });

  it('rejects boolean nextCursor', () => {
    expect(() =>
      schema.parse({ data: [], nextCursor: false, hasNext: false, limit: 10 }),
    ).toThrow();
  });

  it('accepts undefined nextCursor as null', () => {
    // undefined nextCursor → obj['nextCursor'] is undefined → falls through to null
    const result = schema.parse({ data: [], nextCursor: undefined, hasNext: false, limit: 10 });
    expect(result.nextCursor).toBeNull();
  });

  it('rejects null input entirely', () => {
    expect(() => schema.parse(null)).toThrow();
  });

  it('rejects missing hasNext', () => {
    expect(() => schema.parse({ data: [], nextCursor: null, limit: 10 })).toThrow();
  });
});
