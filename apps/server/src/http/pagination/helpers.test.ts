// infra/src/http/pagination/helpers.test.ts
import { encodeCursor, type CursorPaginatedResult, type PaginatedResult } from '@abe-stack/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPaginationHelpers } from './helpers';

describe('Pagination Helpers', () => {
  const helpers = createPaginationHelpers();

  describe('createOffsetResult', () => {
    it('should create offset paginated result correctly', () => {
      const data = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const result = helpers.createOffsetResult(data, 100, {
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'desc',
      });

      const expected: PaginatedResult<{ id: string; name: string }> = {
        data,
        total: 100,
        page: 1,
        limit: 50,
        hasNext: true,
        hasPrev: false,
        totalPages: 2,
      };

      expect(result).toEqual(expected);
    });

    it('should handle last page correctly', () => {
      const data = [{ id: '1', name: 'Item 1' }];

      const result = helpers.createOffsetResult(data, 1, {
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'desc',
      });

      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('createCursorResult', () => {
    it('should create cursor paginated result correctly', () => {
      const data = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const result = helpers.createCursorResult(data, 'next-cursor', true, 50);

      const expected: CursorPaginatedResult<{ id: string; name: string }> = {
        data,
        nextCursor: 'next-cursor',
        hasNext: true,
        limit: 50,
      };

      expect(result).toEqual(expected);
    });

    it('should handle null cursor correctly', () => {
      const data = [{ id: '1', name: 'Item 1' }];

      const result = helpers.createCursorResult(data, null, false, 25);

      expect(result.nextCursor).toBeNull();
      expect(result.hasNext).toBe(false);
    });
  });

  describe('applyOffsetPagination', () => {
    const mockQueryBuilder = {
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      count: vi.fn(),
      clone: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.count.mockResolvedValue(100);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.offset.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
    });

    it('should apply offset pagination correctly', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      // Mock the final query execution
      mockQueryBuilder.limit.mockResolvedValue(mockData);

      const result = await helpers.applyOffsetPagination(mockQueryBuilder, {
        page: 2,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(50); // (page - 1) * limit
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual({
        data: mockData,
        total: 100,
      });
    });

    it('should handle query builder without clone method', async () => {
      const simpleQueryBuilder = {
        orderBy: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValue(50),
      };

      const mockData = [{ id: '1', name: 'Item 1' }];
      simpleQueryBuilder.limit.mockResolvedValue(mockData);

      const result = await helpers.applyOffsetPagination(simpleQueryBuilder, {
        page: 1,
        limit: 25,
        sortOrder: 'desc',
      });

      expect(result).toEqual({
        data: mockData,
        total: 50,
      });
    });
  });

  describe('applyCursorPagination', () => {
    const mockQueryBuilder = {
      whereRaw: vi.fn().mockReturnThis(),
      orderByRaw: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      clone: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
    });

    it('should apply cursor pagination correctly', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', name: 'Item 2', createdAt: '2024-01-02T00:00:00Z' },
        { id: '3', name: 'Item 3', createdAt: '2024-01-03T00:00:00Z' }, // Extra item for hasNext calculation
      ];

      mockQueryBuilder.limit.mockResolvedValue(mockData);

      const cursor = encodeCursor({
        value: '2024-01-01T00:00:00Z',
        tieBreaker: '2',
        sortOrder: 'desc',
      });

      const result = await helpers.applyCursorPagination(
        mockQueryBuilder,
        {
          cursor,
          limit: 2,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
        'createdAt',
      );

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalled();
      expect(mockQueryBuilder.orderByRaw).toHaveBeenCalledWith('createdAt DESC, id DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(3); // limit + 1

      expect(result.data).toHaveLength(2); // Should exclude extra item
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should handle no cursor correctly', async () => {
      const mockData = [{ id: '1', name: 'Item 1' }];

      mockQueryBuilder.limit.mockResolvedValue(mockData);

      const result = await helpers.applyCursorPagination(
        mockQueryBuilder,
        {
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        },
        'createdAt',
      );

      expect(mockQueryBuilder.whereRaw).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderByRaw).toHaveBeenCalledWith('createdAt ASC, id ASC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(11);

      expect(result.data).toHaveLength(1);
      expect(result.hasNext).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });
});
