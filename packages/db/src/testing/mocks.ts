// packages/db/src/testing/mocks.ts
/**
 * Database Test Utilities
 *
 * Mock helpers for testing with the database layer.
 * Import vitest as a peer dependency - only use in test files.
 */

import { vi, type Mock } from 'vitest';

import type { RawDb } from '../client';

// MockDbClient represents a minimal mock of RawDb for testing
export interface MockDbClient {
  query: Mock<(sql: { text: string; values: unknown[] }) => Promise<unknown[]>>;
  queryOne: Mock<(sql: { text: string; values: unknown[] }) => Promise<unknown>>;
  execute: Mock<(sql: { text: string; values: unknown[] }) => Promise<number>>;
  raw: Mock<(sql: string) => Promise<unknown[]>>;
  transaction: Mock<<T>(callback: (tx: RawDb) => Promise<T>, options?: unknown) => Promise<T>>;
  healthCheck: Mock<() => Promise<boolean>>;
  close: Mock<() => Promise<void>>;
  getClient: Mock<() => unknown>;
}

// Type alias for using MockDbClient where RawDb is expected
export type MockDbClientAsDb = MockDbClient & { _brand: 'db' };

// Create mock db client matching RawDb interface
export function createMockDb(): MockDbClient {
  const mock = {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn().mockReturnValue({}),
  } as unknown as MockDbClient;

  // Transaction method that executes callback with the same mock
  mock.transaction = vi.fn().mockImplementation(async <T>(callback: (tx: RawDb) => Promise<T>) => {
    return await callback(mock as unknown as RawDb);
  });

  return mock;
}

// Helper to create mock db with specific return values
export function createMockDbWithData(options: {
  queryResult?: unknown[];
  queryOneResult?: unknown;
  executeResult?: number;
  rawResult?: unknown[];
}): MockDbClient {
  const mock = {
    query: vi.fn().mockResolvedValue(options.queryResult ?? []),
    queryOne: vi.fn().mockResolvedValue(options.queryOneResult ?? null),
    execute: vi.fn().mockResolvedValue(options.executeResult ?? 0),
    raw: vi.fn().mockResolvedValue(options.rawResult ?? []),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn().mockReturnValue({}),
  } as unknown as MockDbClient;

  // Transaction method that executes callback with the same mock
  mock.transaction = vi.fn().mockImplementation(async <T>(callback: (tx: RawDb) => Promise<T>) => {
    return await callback(mock as unknown as RawDb);
  });

  return mock;
}

// Helper to cast MockDbClient to RawDb for function calls
export function asMockDb(mock: MockDbClient): RawDb {
  return mock as unknown as RawDb;
}
