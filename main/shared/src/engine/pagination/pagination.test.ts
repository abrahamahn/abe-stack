// main/shared/src/engine/pagination/pagination.test.ts
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
