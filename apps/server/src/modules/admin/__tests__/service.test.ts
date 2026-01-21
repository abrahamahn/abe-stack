// apps/server/src/modules/admin/__tests__/service.test.ts
import { unlockUserAccount, UserNotFoundError } from '@admin/service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../infrastructure/index.js', () => ({
  unlockAccount: vi.fn().mockResolvedValue(undefined),
  users: { email: 'email' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ eq: [col, val] })),
}));

describe('Admin Service', () => {
  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unlockUserAccount', () => {
    test('should unlock account when user exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await unlockUserAccount(
        mockDb as never,
        'test@example.com',
        'admin-456',
        'User verified identity via phone',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual({ email: 'test@example.com' });
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
    });

    test('should throw UserNotFoundError when user does not exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(
        unlockUserAccount(mockDb as never, 'nonexistent@example.com', 'admin-456', 'Test reason'),
      ).rejects.toThrow(UserNotFoundError);
    });

    test('should call infraUnlockAccount with correct parameters including reason', async () => {
      const { unlockAccount } = await import('../../../infrastructure/index.js');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      await unlockUserAccount(
        mockDb as never,
        'test@example.com',
        'admin-456',
        'Customer support ticket #12345',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(unlockAccount).toHaveBeenCalledWith(
        mockDb,
        'test@example.com',
        'admin-456',
        'Customer support ticket #12345',
        '192.168.1.1',
        'Mozilla/5.0',
      );
    });

    test('should work without optional parameters but require reason', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await unlockUserAccount(
        mockDb as never,
        'test@example.com',
        'admin-456',
        'Password reset requested',
      );

      expect(result).toEqual({ email: 'test@example.com' });
    });

    test('should pass reason through to infraUnlockAccount', async () => {
      const { unlockAccount } = await import('../../../infrastructure/index.js');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const customReason = 'User locked out due to forgotten password, verified via email';
      await unlockUserAccount(mockDb as never, 'test@example.com', 'admin-789', customReason);

      expect(unlockAccount).toHaveBeenCalledWith(
        mockDb,
        'test@example.com',
        'admin-789',
        customReason,
        undefined,
        undefined,
      );
    });
  });
});
