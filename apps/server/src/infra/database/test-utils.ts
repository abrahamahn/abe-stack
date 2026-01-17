// apps/server/src/infra/database/test-utils.ts
import type { DbClient } from '@database';
import { vi } from 'vitest';

export interface MockDbClient extends DbClient {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  query: {
    securityEvents: {
      findMany: ReturnType<typeof vi.fn>;
    };
    users: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
}

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
