// apps/server/src/infrastructure/data/database/schema/validation.test.ts
import { describe, expect, test, vi } from 'vitest';

import {
  getExistingTables,
  requireValidSchema,
  REQUIRED_TABLES,
  SchemaValidationError,
  validateSchema,
} from './validation';

import type { RawDb } from '@abe-stack/db';

// ============================================================================
// Mock Helpers
// ============================================================================

interface MockTableRow {
  tablename: string;
}

function createMockDb(tables: string[]) {
  const rows: MockTableRow[] = tables.map((tablename) => ({ tablename }));

  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue(rows),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

function asMockDb(mock: MockDb): RawDb {
  return mock as unknown as RawDb;
}

// ============================================================================
// Tests: REQUIRED_TABLES
// ============================================================================

describe('REQUIRED_TABLES', () => {
  test('should include essential auth tables', () => {
    expect(REQUIRED_TABLES).toContain('users');
    expect(REQUIRED_TABLES).toContain('refresh_tokens');
    expect(REQUIRED_TABLES).toContain('refresh_token_families');
  });

  test('should include login tracking tables', () => {
    expect(REQUIRED_TABLES).toContain('login_attempts');
  });

  test('should include security tables', () => {
    expect(REQUIRED_TABLES).toContain('password_reset_tokens');
    expect(REQUIRED_TABLES).toContain('email_verification_tokens');
    expect(REQUIRED_TABLES).toContain('security_events');
  });

  test('should be a readonly array', () => {
    // TypeScript enforces this at compile time via 'as const'
    // At runtime, we can verify it's an array
    expect(Array.isArray(REQUIRED_TABLES)).toBe(true);
    expect(REQUIRED_TABLES.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Tests: SchemaValidationError
// ============================================================================

describe('SchemaValidationError', () => {
  test('should create error with missing tables', () => {
    const missingTables = ['users', 'refresh_tokens'];

    const error = new SchemaValidationError(missingTables);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SchemaValidationError);
    expect(error.name).toBe('SchemaValidationError');
    expect(error.missingTables).toEqual(missingTables);
  });

  test('should include table names in error message', () => {
    const missingTables = ['users', 'refresh_tokens'];

    const error = new SchemaValidationError(missingTables);

    expect(error.message).toContain('users');
    expect(error.message).toContain('refresh_tokens');
  });

  test('should include help text about running migrations', () => {
    const error = new SchemaValidationError(['users']);

    expect(error.message).toContain('db:push');
  });

  test('should handle single missing table', () => {
    const error = new SchemaValidationError(['users']);

    expect(error.missingTables).toEqual(['users']);
    expect(error.message).toContain('users');
  });

  test('should handle empty missing tables array', () => {
    const error = new SchemaValidationError([]);

    expect(error.missingTables).toEqual([]);
    // Message still makes sense even with no tables
    expect(error.message).toContain('Missing tables:');
  });

  test('should have correct stack trace', () => {
    const error = new SchemaValidationError(['users']);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('SchemaValidationError');
  });
});

// ============================================================================
// Tests: getExistingTables
// ============================================================================

describe('getExistingTables', () => {
  test('should return list of existing table names', async () => {
    const mockDb = createMockDb(['users', 'posts', 'comments']);

    const result = await getExistingTables(asMockDb(mockDb));

    expect(result).toEqual(['users', 'posts', 'comments']);
  });

  test('should return empty array when no tables exist', async () => {
    const mockDb = createMockDb([]);

    const result = await getExistingTables(asMockDb(mockDb));

    expect(result).toEqual([]);
  });

  test('should execute SQL query against pg_tables', async () => {
    const mockDb = createMockDb(['users']);

    await getExistingTables(asMockDb(mockDb));

    expect(mockDb.raw).toHaveBeenCalledTimes(1);
  });

  test('should handle database with many tables', async () => {
    const tables = Array.from({ length: 50 }, (_, i) => `table_${i}`);
    const mockDb = createMockDb(tables);

    const result = await getExistingTables(asMockDb(mockDb));

    expect(result).toHaveLength(50);
  });

  test('should handle array-like result from postgres-js', async () => {
    const mockDb = createMockDb(['users', 'posts', 'comments']);

    const result = await getExistingTables(asMockDb(mockDb));

    expect(result).toEqual(['users', 'posts', 'comments']);
  });
});

// ============================================================================
// Tests: validateSchema
// ============================================================================

describe('validateSchema', () => {
  test('should return valid when all required tables exist', async () => {
    const mockDb = createMockDb([...REQUIRED_TABLES]);

    const result = await validateSchema(asMockDb(mockDb));

    expect(result.valid).toBe(true);
    expect(result.missingTables).toEqual([]);
    expect(result.existingTables).toEqual(expect.arrayContaining([...REQUIRED_TABLES]));
  });

  test('should return invalid when tables are missing', async () => {
    const existingTables = ['users', 'refresh_tokens'];
    const mockDb = createMockDb(existingTables);

    const result = await validateSchema(asMockDb(mockDb));

    expect(result.valid).toBe(false);
    expect(result.missingTables.length).toBeGreaterThan(0);
  });

  test('should correctly identify missing tables', async () => {
    const mockDb = createMockDb(['users']);

    const result = await validateSchema(asMockDb(mockDb));

    expect(result.missingTables).toContain('refresh_tokens');
    expect(result.missingTables).toContain('login_attempts');
    expect(result.missingTables).not.toContain('users');
  });

  test('should include extra tables in existingTables', async () => {
    const mockDb = createMockDb([...REQUIRED_TABLES, 'extra_table', 'another_table']);

    const result = await validateSchema(asMockDb(mockDb));

    expect(result.valid).toBe(true);
    expect(result.existingTables).toContain('extra_table');
    expect(result.existingTables).toContain('another_table');
  });

  test('should return invalid when database is empty', async () => {
    const mockDb = createMockDb([]);

    const result = await validateSchema(asMockDb(mockDb));

    expect(result.valid).toBe(false);
    expect(result.missingTables).toEqual([...REQUIRED_TABLES]);
    expect(result.existingTables).toEqual([]);
  });

  test('should handle partial schema', async () => {
    // Only some required tables exist
    const partialTables = REQUIRED_TABLES.slice(0, 3);
    const mockDb = createMockDb([...partialTables]);

    const result = await validateSchema(asMockDb(mockDb));

    expect(result.valid).toBe(false);
    expect(result.missingTables.length).toBe(REQUIRED_TABLES.length - 3);
  });
});

// ============================================================================
// Tests: requireValidSchema
// ============================================================================

describe('requireValidSchema', () => {
  test('should resolve when schema is valid', async () => {
    const mockDb = createMockDb([...REQUIRED_TABLES]);

    await expect(requireValidSchema(asMockDb(mockDb))).resolves.toBeUndefined();
  });

  test('should throw SchemaValidationError when tables are missing', async () => {
    const mockDb = createMockDb(['users']);

    await expect(requireValidSchema(asMockDb(mockDb))).rejects.toThrow(SchemaValidationError);
  });

  test('should include missing tables in error', async () => {
    const mockDb = createMockDb(['users']);

    try {
      await requireValidSchema(asMockDb(mockDb));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      if (error instanceof SchemaValidationError) {
        expect(error.missingTables).toContain('refresh_tokens');
        expect(error.missingTables).not.toContain('users');
      }
    }
  });

  test('should throw when database is completely empty', async () => {
    const mockDb = createMockDb([]);

    await expect(requireValidSchema(asMockDb(mockDb))).rejects.toThrow(SchemaValidationError);

    try {
      await requireValidSchema(asMockDb(mockDb));
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        expect(error.missingTables).toEqual([...REQUIRED_TABLES]);
      }
    }
  });

  test('should not throw when extra tables exist', async () => {
    const mockDb = createMockDb([...REQUIRED_TABLES, 'extra_1', 'extra_2']);

    await expect(requireValidSchema(asMockDb(mockDb))).resolves.toBeUndefined();
  });
});
