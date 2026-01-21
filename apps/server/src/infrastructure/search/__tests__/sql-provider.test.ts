// apps/server/src/infrastructure/search/__tests__/sql-provider.test.ts
import { FILTER_OPERATORS } from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';


import { SqlSearchProvider, createSqlSearchProvider } from '../sql-provider';

import type { SqlTableConfig } from '../types';

// Mock Drizzle
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockGroupBy = vi.fn();

// Chain mock methods
mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
});
mockWhere.mockReturnValue({
  orderBy: mockOrderBy,
  limit: mockLimit,
  groupBy: mockGroupBy,
});
mockOrderBy.mockReturnValue({
  limit: mockLimit,
  offset: mockOffset,
});
mockLimit.mockReturnValue({
  offset: mockOffset,
});
mockOffset.mockResolvedValue([]);
mockGroupBy.mockReturnValue({
  orderBy: mockOrderBy,
});

const mockDb = {
  select: mockSelect,
} as unknown;

// Mock table with columns
const mockTable = {
  id: { name: 'id' },
  name: { name: 'name' },
  email: { name: 'email' },
  age: { name: 'age' },
  status: { name: 'status' },
  createdAt: { name: 'createdAt' },
} as unknown;

const tableConfig: Partial<SqlTableConfig> & { table: string } = {
  table: 'users',
  primaryKey: 'id',
  columns: [
    { field: 'id', column: 'id', type: 'string' },
    { field: 'name', column: 'name', type: 'string' },
    { field: 'email', column: 'email', type: 'string' },
    { field: 'age', column: 'age', type: 'number' },
    { field: 'status', column: 'status', type: 'string' },
    { field: 'createdAt', column: 'createdAt', type: 'date' },
  ],
};

describe('SqlSearchProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOffset.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
  });

  describe('constructor', () => {
    test('should create provider with default config', () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      expect(provider.name).toBe('sql');
    });

    test('should create provider with custom config', () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
        { name: 'custom-sql', maxPageSize: 500 },
      );

      expect(provider.name).toBe('custom-sql');
    });
  });

  describe('getCapabilities', () => {
    test('should return correct capabilities', () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      const capabilities = provider.getCapabilities();

      expect(capabilities.fullTextSearch).toBe(false);
      expect(capabilities.fuzzyMatching).toBe(false);
      expect(capabilities.highlighting).toBe(false);
      expect(capabilities.cursorPagination).toBe(true);
      expect(capabilities.maxPageSize).toBe(1000);
      expect(capabilities.supportedOperators).toContain(FILTER_OPERATORS.EQ);
      expect(capabilities.supportedOperators).toContain(FILTER_OPERATORS.BETWEEN);
    });
  });

  describe('search', () => {
    test('should execute search with pagination', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      mockOffset.mockResolvedValue([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]);

      const result = await provider.search({
        page: 1,
        limit: 10,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    test('should detect hasNext when more results exist', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      // Return 11 results when limit is 10 (indicating more exist)
      mockOffset.mockResolvedValue(
        Array.from({ length: 11 }, (_, i) => ({ id: String(i) })),
      );

      const result = await provider.search({
        page: 1,
        limit: 10,
      });

      expect(result.hasNext).toBe(true);
      expect(result.data).toHaveLength(10);
    });

    test('should include count when requested', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      mockOffset.mockResolvedValue([{ id: '1' }]);
      mockWhere.mockReturnValueOnce({
        orderBy: mockOrderBy,
        limit: mockLimit,
      });
      // Mock count query
      mockFrom.mockReturnValueOnce({
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      const result = await provider.search({
        page: 1,
        limit: 10,
        includeCount: true,
      });

      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(5);
    });

    test('should apply filters', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      mockOffset.mockResolvedValue([]);

      await provider.search({
        filters: {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
      });

      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    test('should return count', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      mockFrom.mockReturnValueOnce({
        where: vi.fn().mockResolvedValue([{ count: 25 }]),
      });

      const count = await provider.count({});

      expect(count).toBe(25);
    });
  });

  describe('healthCheck', () => {
    test('should return true when database is accessible', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      mockLimit.mockResolvedValueOnce([{ one: 1 }]);

      const healthy = await provider.healthCheck();

      expect(healthy).toBe(true);
    });

    test('should return false when database is inaccessible', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      mockLimit.mockRejectedValueOnce(new Error('Connection failed'));

      const healthy = await provider.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  describe('close', () => {
    test('should close without error', async () => {
      const provider = new SqlSearchProvider(
        mockDb as never,
        mockTable as never,
        tableConfig,
      );

      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});

describe('createSqlSearchProvider', () => {
  test('should create provider using factory function', () => {
    const provider = createSqlSearchProvider(
      mockDb as never,
      mockTable as never,
      tableConfig,
    );

    expect(provider).toBeInstanceOf(SqlSearchProvider);
  });
});
