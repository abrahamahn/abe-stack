// apps/server/src/modules/admin/__tests__/handlers.test.ts
import { handleAdminUnlock } from '@admin/handlers';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('../service.js', () => ({
  unlockUserAccount: vi.fn(),
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'UserNotFoundError';
    }
  },
}));

vi.mock('@modules/auth', () => ({
  extractRequestInfo: vi.fn(() => ({
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  })),
}));

vi.mock('@shared', () => ({
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Unauthorized',
    USER_NOT_FOUND: 'User not found',
    INTERNAL_ERROR: 'Internal server error',
  },
  SUCCESS_MESSAGES: {
    ACCOUNT_UNLOCKED: 'Account unlocked successfully',
  },
}));

describe('Admin Handlers', () => {
  const mockCtx = {
    db: {},
    log: {
      info: vi.fn(),
      error: vi.fn(),
    },
  };

  const mockRequest = {
    user: { userId: 'admin-123' },
    headers: {},
    cookies: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAdminUnlock', () => {
    test('should return 401 when user is not authenticated', async () => {
      const requestWithoutUser = { ...mockRequest, user: null };

      const result = await handleAdminUnlock(
        mockCtx as never,
        { email: 'test@example.com' },
        requestWithoutUser as never,
      );

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: 'Unauthorized' });
    });

    test('should successfully unlock account', async () => {
      const { unlockUserAccount } = await import('../service.js');
      (unlockUserAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: 'test@example.com',
      });

      const result = await handleAdminUnlock(
        mockCtx as never,
        { email: 'test@example.com' },
        mockRequest as never,
      );

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        message: 'Account unlocked successfully',
        email: 'test@example.com',
      });
      expect(mockCtx.log.info).toHaveBeenCalled();
    });

    test('should return 404 when user not found', async () => {
      const { unlockUserAccount, UserNotFoundError } = await import('../service.js');
      (unlockUserAccount as ReturnType<typeof vi.fn>).mockRejectedValue(
        new UserNotFoundError('User not found'),
      );

      const result = await handleAdminUnlock(
        mockCtx as never,
        { email: 'nonexistent@example.com' },
        mockRequest as never,
      );

      expect(result.status).toBe(404);
      expect(result.body).toEqual({ message: 'User not found' });
    });

    test('should return 500 on unexpected error', async () => {
      const { unlockUserAccount } = await import('../service.js');
      (unlockUserAccount as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await handleAdminUnlock(
        mockCtx as never,
        { email: 'test@example.com' },
        mockRequest as never,
      );

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});
