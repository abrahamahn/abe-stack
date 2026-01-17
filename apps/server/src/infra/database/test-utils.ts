// apps/server/src/infra/database/test-utils.ts
import { vi } from 'vitest';

// MockDbClient represents a minimal mock of DbClient for testing
// It doesn't extend DbClient to avoid type errors from missing properties
// Tests cast to this type and use `as never` when passing to functions expecting DbClient
export interface MockDbClient {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  query: {
    securityEvents: {
      findMany: ReturnType<typeof vi.fn>;
    };
    users: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    refreshTokens?: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    refreshTokenFamilies?: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    loginAttempts?: {
      findMany: ReturnType<typeof vi.fn>;
    };
    passwordResetTokens?: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    emailVerificationTokens?: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
}

// Type alias for using MockDbClient where DbClient is expected
export type MockDbClientAsDb = MockDbClient & { _brand: 'db' };

// Create mock db client
export function createMockDb(): MockDbClient {
  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });

  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  });

  const mockQuery = {
    securityEvents: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    users: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };

  return {
    insert: mockInsert,
    select: mockSelect,
    query: mockQuery,
  } as unknown as MockDbClient;
}
