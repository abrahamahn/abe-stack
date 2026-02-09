// src/server/core/src/admin/service.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import * as auth from '../auth';

import { unlockUserAccount, UserNotFoundError } from './service';

import type { DbClient } from '@abe-stack/db';

// Mock dependencies - service.ts imports unlockAccount from @abe-stack/auth
vi.mock('../auth', () => ({
  unlockAccount: vi.fn().mockResolvedValue(undefined),
}));

// Create mock db matching RawDb interface
function createMockDb() {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

function asMockDb(mock: MockDb): DbClient {
  return mock as unknown as DbClient;
}

describe('Admin Service', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('unlockUserAccount', () => {
    test('should unlock account when user exists', async () => {
      const mockUser = { id: 'user-123' };
      mockDb.queryOne.mockResolvedValue(mockUser);

      const result = await unlockUserAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'User verified identity via phone',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual({ email: 'test@example.com' });
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    test('should throw UserNotFoundError when user does not exist', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      await expect(
        unlockUserAccount(asMockDb(mockDb), 'nonexistent@example.com', 'admin-456', 'Test reason'),
      ).rejects.toThrow(UserNotFoundError);
    });

    test('should call infraUnlockAccount with correct parameters including reason', async () => {
      const mockUser = { id: 'user-123' };
      mockDb.queryOne.mockResolvedValue(mockUser);

      await unlockUserAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'Customer support ticket #12345',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(auth.unlockAccount).toHaveBeenCalledWith(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'Customer support ticket #12345',
        '192.168.1.1',
        'Mozilla/5.0',
      );
    });

    test('should work without optional parameters but require reason', async () => {
      const mockUser = { id: 'user-123' };
      mockDb.queryOne.mockResolvedValue(mockUser);

      const result = await unlockUserAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'Password reset requested',
      );

      expect(result).toEqual({ email: 'test@example.com' });
    });

    test('should pass reason through to infraUnlockAccount', async () => {
      const mockUser = { id: 'user-123' };
      mockDb.queryOne.mockResolvedValue(mockUser);

      const customReason = 'User locked out due to forgotten password, verified via email';
      await unlockUserAccount(asMockDb(mockDb), 'test@example.com', 'admin-789', customReason);

      expect(auth.unlockAccount).toHaveBeenCalledWith(
        asMockDb(mockDb),
        'test@example.com',
        'admin-789',
        customReason,
        undefined,
        undefined,
      );
    });
  });
});
