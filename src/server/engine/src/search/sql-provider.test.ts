// src/server/engine/src/search/sql-provider.test.ts
import { FILTER_OPERATORS } from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SqlSearchProvider, createSqlSearchProvider } from './sql-provider';

import type { SqlTableConfig } from './types';
import type { RawDb, Repositories } from '@abe-stack/db';

// Mock RawDb interface
const mockRaw = vi.fn();
const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

const mockDb = {
  raw: mockRaw,
  query: mockQuery,
  queryOne: mockQueryOne,
  execute: mockExecute,
} as unknown as RawDb;

// Mock repositories
const mockRepos = {} as Repositories;

const tableConfig: Partial<SqlTableConfig> & { table: string } = {
  table: 'users',
  primaryKey: 'id',
  columns: [
    { field: 'id', column: 'id', type: 'string' },
    { field: 'name', column: 'name', type: 'string' },
    { field: 'email', column: 'email', type: 'string' },
    { field: 'age', column: 'age', type: 'number' },
    { field: 'status', column: 'status', type: 'string' },
    { field: 'createdAt', column: 'created_at', type: 'date' },
  ],
};

describe('SqlSearchProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRaw.mockResolvedValue([]);
    mockQuery.mockResolvedValue([]);
    mockQueryOne.mockResolvedValue(null);
    mockExecute.mockResolvedValue(0);
  });

  describe('constructor', () => {
    test('should create provider with default config', () => {
      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      expect(provider.name).toBe('sql');
    });

    test('should create provider with custom config', () => {
      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig, {
        name: 'custom-sql',
        maxPageSize: 500,
      });

      expect(provider.name).toBe('custom-sql');
    });
  });

  describe('getCapabilities', () => {
    test('should return correct capabilities', () => {
      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      const capabilities = provider.getCapabilities();

      expect(capabilities.fullTextSearch).toBe(false);
      expect(capabilities.fuzzyMatching).toBe(false);
      expect(capabilities.cursorPagination).toBe(true);
      expect(capabilities.arrayOperations).toBe(true);
      expect(capabilities.maxPageSize).toBe(1000);
    });
  });

  describe('search', () => {
    test('should execute basic search', async () => {
      mockRaw.mockResolvedValue([{ id: '1', name: 'Test' }]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      const result = await provider.search({ limit: 10 });

      expect(mockRaw).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.item).toEqual({ id: '1', name: 'Test' });
    });

    test('should apply filters correctly', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: {
          field: 'name',
          operator: FILTER_OPERATORS.EQ,
          value: 'Test',
        },
        limit: 10,
      });

      // Verify the raw SQL was called
      expect(mockRaw).toHaveBeenCalled();
      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('WHERE');
      expect(sql).toContain('name');
    });

    test('should handle pagination correctly', async () => {
      mockRaw.mockResolvedValue([
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      const result = await provider.search({ page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.hasPrev).toBe(true);
    });

    test('should include total count when requested', async () => {
      mockRaw.mockResolvedValueOnce([{ id: '1', name: 'Test' }]);
      mockRaw.mockResolvedValueOnce([{ count: '5' }]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      const result = await provider.search({ limit: 10, includeCount: true });

      expect(mockRaw).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(5);
    });
  });

  describe('filter operators', () => {
    test('should support EQ operator', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: { field: 'status', operator: FILTER_OPERATORS.EQ, value: 'active' },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('status');
      expect(sql).toContain('=');
    });

    test('should support NEQ operator', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: { field: 'status', operator: FILTER_OPERATORS.NEQ, value: 'deleted' },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('<>');
    });

    test('should support GT/GTE/LT/LTE operators', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: { field: 'age', operator: FILTER_OPERATORS.GT, value: 18 },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('>');
    });

    test('should support CONTAINS operator', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: { field: 'name', operator: FILTER_OPERATORS.CONTAINS, value: 'test' },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('ILIKE');
    });

    test('should support IN operator', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: { field: 'status', operator: FILTER_OPERATORS.IN, value: ['active', 'pending'] },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('IN');
    });

    test('should support IsNull operator', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: { field: 'email', operator: FILTER_OPERATORS.IsNull, value: null },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('IS NULL');
    });

    test('should support BETWEEN operator', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: { field: 'age', operator: FILTER_OPERATORS.BETWEEN, value: { min: 18, max: 65 } },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('BETWEEN');
    });
  });

  describe('compound filters', () => {
    test('should support AND compound filter', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: {
          operator: 'and',
          conditions: [
            { field: 'status', operator: FILTER_OPERATORS.EQ, value: 'active' },
            { field: 'age', operator: FILTER_OPERATORS.GT, value: 18 },
          ],
        },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('AND');
    });

    test('should support OR compound filter', async () => {
      mockRaw.mockResolvedValue([]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      await provider.search({
        filters: {
          operator: 'or',
          conditions: [
            { field: 'status', operator: FILTER_OPERATORS.EQ, value: 'active' },
            { field: 'status', operator: FILTER_OPERATORS.EQ, value: 'pending' },
          ],
        },
      });

      const [sql] = mockRaw.mock.calls[0] as [string];
      expect(sql).toContain('OR');
    });
  });

  describe('query limits', () => {
    test('should throw error for too deep nesting', async () => {
      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig, {
        maxQueryDepth: 2,
      });

      // Create deeply nested filter
      const deepFilter = {
        operator: 'and' as const,
        conditions: [
          {
            operator: 'and' as const,
            conditions: [
              {
                operator: 'and' as const,
                conditions: [{ field: 'name', operator: FILTER_OPERATORS.EQ, value: 'test' }],
              },
            ],
          },
        ],
      };

      await expect(provider.search({ filters: deepFilter })).rejects.toMatchObject({
        name: 'QueryTooComplexError',
      });
    });

    test('should throw error for too many conditions', async () => {
      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig, {
        maxConditions: 2,
      });

      const manyConditions = {
        operator: 'and' as const,
        conditions: [
          { field: 'name', operator: FILTER_OPERATORS.EQ, value: 'test1' },
          { field: 'email', operator: FILTER_OPERATORS.EQ, value: 'test2' },
          { field: 'status', operator: FILTER_OPERATORS.EQ, value: 'test3' },
        ],
      };

      await expect(provider.search({ filters: manyConditions })).rejects.toMatchObject({
        name: 'QueryTooComplexError',
      });
    });
  });

  describe('healthCheck', () => {
    test('should return true when database is accessible', async () => {
      mockRaw.mockResolvedValue([{ '?column?': 1 }]);

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false when database is not accessible', async () => {
      mockRaw.mockRejectedValue(new Error('Connection failed'));

      const provider = new SqlSearchProvider(mockDb, mockRepos, tableConfig);

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('createSqlSearchProvider factory', () => {
    test('should create provider with factory function', () => {
      const provider = createSqlSearchProvider(mockDb, mockRepos, tableConfig);

      expect(provider).toBeInstanceOf(SqlSearchProvider);
      expect(provider.name).toBe('sql');
    });

    test('should create provider with custom config', () => {
      const provider = createSqlSearchProvider(mockDb, mockRepos, tableConfig, {
        name: 'factory-sql',
      });

      expect(provider.name).toBe('factory-sql');
    });
  });
});
