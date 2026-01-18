// packages/tests/src/mocks/database.ts
/**
 * Mock Database Factory
 *
 * Creates mock Drizzle-like database clients for testing.
 */

import { vi } from 'vitest';

/**
 * Mock database client interface
 */
export interface MockDbClient {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  query: MockDbQuery;
  transaction: ReturnType<typeof vi.fn>;
}

/**
 * Mock query interface for Drizzle's relational queries
 */
export interface MockDbQuery {
  users: MockTableQuery;
  refreshTokens: MockTableQuery;
  refreshTokenFamilies: MockTableQuery;
  loginAttempts: MockTableQuery;
  securityEvents: MockTableQuery;
  passwordResetTokens: MockTableQuery;
  emailVerificationTokens: MockTableQuery;
  [key: string]: MockTableQuery;
}

export interface MockTableQuery {
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock table query
 */
function createMockTableQuery(): MockTableQuery {
  return {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Create a chainable mock for insert/update/delete
 */
function createChainableMock(): Record<string, ReturnType<typeof vi.fn>> {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.values = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue([]);
  chain.execute = vi.fn().mockResolvedValue(undefined);

  // Make the chain resolve to undefined by default
  Object.defineProperty(chain, 'then', {
    value: (resolve: (value: unknown) => void) => {
      resolve(undefined);
    },
    enumerable: false,
  });

  return chain;
}

/**
 * Create a chainable mock for select
 */
function createSelectMock(): Record<string, ReturnType<typeof vi.fn>> {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);

  // Make the chain resolve to empty array by default
  Object.defineProperty(chain, 'then', {
    value: (resolve: (value: unknown[]) => void) => {
      resolve([]);
    },
    enumerable: false,
  });

  return chain;
}

/**
 * Create a mock database client
 */
export function createMockDb(): MockDbClient {
  const mockInsert = vi.fn().mockReturnValue(createChainableMock());
  const mockUpdate = vi.fn().mockReturnValue(createChainableMock());
  const mockDelete = vi.fn().mockReturnValue(createChainableMock());
  const mockSelect = vi.fn().mockReturnValue(createSelectMock());
  const mockExecute = vi.fn().mockResolvedValue({ rows: [] });

  const mockQuery: MockDbQuery = {
    users: createMockTableQuery(),
    refreshTokens: createMockTableQuery(),
    refreshTokenFamilies: createMockTableQuery(),
    loginAttempts: createMockTableQuery(),
    securityEvents: createMockTableQuery(),
    passwordResetTokens: createMockTableQuery(),
    emailVerificationTokens: createMockTableQuery(),
  };

  // Transaction mock that executes the callback with the same db
  const mockTransaction = vi.fn().mockImplementation(async (callback: (tx: MockDbClient) => Promise<unknown>) => {
    const txDb = createMockDb();
    return callback(txDb);
  });

  return {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
    execute: mockExecute,
    query: mockQuery,
    transaction: mockTransaction,
  };
}

/**
 * Configure a mock db query to return specific data
 */
export function configureMockQuery(
  db: MockDbClient,
  table: keyof MockDbQuery,
  method: 'findFirst' | 'findMany',
  returnValue: unknown,
): void {
  const tableQuery = db.query[table];
  if (tableQuery) {
    tableQuery[method].mockResolvedValue(returnValue);
  }
}
