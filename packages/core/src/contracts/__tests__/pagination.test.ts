// packages/core/src/contracts/__tests__/pagination.test.ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  SORT_ORDER,
  cursorPaginationOptionsSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
} from '../pagination';

describe('Pagination Schemas', () => {
  describe('paginationOptionsSchema', () => {
    it('should validate valid pagination options', () => {
      const validOptions = {
        page: 2,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = paginationOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOptions);
      }
    });

    it('should provide defaults', () => {
      const minimalOptions = {};

      const result = paginationOptionsSchema.safeParse(minimalOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe('desc');
        expect(result.data.sortBy).toBeUndefined();
      }
    });

    it('should reject invalid values', () => {
      const invalidOptions = [
        { page: 0 }, // Page must be >= 1
        { page: -1 },
        { limit: 0 }, // Limit must be >= 1
        { limit: -5 },
        { limit: 1001 }, // Limit must be <= 1000
        { sortOrder: 'invalid' },
      ];

      invalidOptions.forEach((options) => {
        const result = paginationOptionsSchema.safeParse(options);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('cursorPaginationOptionsSchema', () => {
    it('should validate valid cursor options', () => {
      const validOptions = {
        cursor:
          'eyJ2YWx1ZSI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwidGllQnJlYWtlciI6IjEyMyIsInNvcnRPcmRlciI6ImRlc2MifQ',
        limit: 25,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = cursorPaginationOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOptions);
      }
    });

    it('should allow undefined cursor', () => {
      const options = {
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = cursorPaginationOptionsSchema.safeParse(options);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursor).toBeUndefined();
      }
    });

    it('should reject invalid limit', () => {
      const invalidOptions = [{ limit: 0 }, { limit: 1001 }, { sortOrder: 'invalid' }];

      invalidOptions.forEach((options) => {
        const result = cursorPaginationOptionsSchema.safeParse(options);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('paginatedResultSchema', () => {
    const itemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const schema = paginatedResultSchema(itemSchema);

    it('should validate valid paginated result', () => {
      const validResult = {
        data: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
        total: 100,
        page: 1,
        limit: 50,
        hasNext: true,
        hasPrev: false,
        totalPages: 2,
      };

      const result = schema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject invalid structure', () => {
      const invalidResults = [
        { data: [], total: -1 }, // Negative total
        { data: [], total: 0, page: 0 }, // Invalid page
        { data: [], total: 0, page: 1, limit: 0 }, // Invalid limit
      ];

      invalidResults.forEach((resultData) => {
        const result = schema.safeParse(resultData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('SORT_ORDER constants', () => {
    it('should have correct values', () => {
      expect(SORT_ORDER.ASC).toBe('asc');
      expect(SORT_ORDER.DESC).toBe('desc');
    });
  });
});
