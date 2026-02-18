// main/server/realtime/src/service.test.ts
/**
 * Realtime Service Unit Tests
 *
 * Tests for server-specific service functions:
 * - Table registry (isTableAllowed, registerRealtimeTable)
 * - Record loading (loadRecords)
 *
 * Pure operation logic tests are in @bslt/shared
 * (main/shared/src/domain/realtime/realtime.operations.test.ts)
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { isTableAllowed, loadRecords, registerRealtimeTable } from './service';

// ============================================================================
// Mock Database Client
// ============================================================================

interface MockDbClient {
  query: ReturnType<typeof vi.fn>;
  queryOne: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  raw: ReturnType<typeof vi.fn>;
}

function createMockDb(): MockDbClient {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Realtime Service', () => {
  describe('Table Validation', () => {
    test('should allow registered tables', () => {
      expect(isTableAllowed('users')).toBe(true);
    });

    test('should reject unregistered tables', () => {
      expect(isTableAllowed('unknown_table')).toBe(false);
      expect(isTableAllowed('admin_secrets')).toBe(false);
    });

    test('should allow newly registered tables', () => {
      expect(isTableAllowed('custom_table')).toBe(false);
      registerRealtimeTable('custom_table');
      expect(isTableAllowed('custom_table')).toBe(true);
    });
  });

  describe('loadRecords', () => {
    let mockDb: MockDbClient;

    beforeEach(() => {
      mockDb = createMockDb();
    });

    test('should return empty map for empty pointers', async () => {
      const result = await loadRecords(mockDb as never, []);

      expect(result).toEqual({});
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    test('should throw for disallowed table', async () => {
      const pointers = [{ table: 'secret_table', id: 'id-1' }];

      await expect(loadRecords(mockDb as never, pointers)).rejects.toThrow(
        "Table 'secret_table' is not allowed for realtime operations",
      );
    });

    test('should load records from database', async () => {
      const mockRows = [
        { id: 'id-1', name: 'User 1', email: 'user1@example.com', version: 1 },
        { id: 'id-2', name: 'User 2', email: 'user2@example.com', version: 2 },
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const pointers = [
        { table: 'users', id: 'id-1' },
        { table: 'users', id: 'id-2' },
      ];

      const result = await loadRecords(mockDb as never, pointers);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(result['users']?.['id-1']).toEqual(mockRows[0]);
      expect(result['users']?.['id-2']).toEqual(mockRows[1]);
    });

    test('should deduplicate pointers for same record', async () => {
      const mockRows = [{ id: 'id-1', name: 'User 1', version: 1 }];

      mockDb.query.mockResolvedValue(mockRows);

      const pointers = [
        { table: 'users', id: 'id-1' },
        { table: 'users', id: 'id-1' },
        { table: 'users', id: 'id-1' },
      ];

      await loadRecords(mockDb as never, pointers);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    test('should handle records from database correctly', async () => {
      const mockRows = [{ id: 'id-1', name: 'User', version: 1 }];

      mockDb.query.mockResolvedValue(mockRows);

      const pointers = [{ table: 'users', id: 'id-1' }];

      const result = await loadRecords(mockDb as never, pointers);

      expect(result['users']?.['id-1']).toEqual(mockRows[0]);
    });
  });
});
