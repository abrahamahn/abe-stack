// apps/server/src/modules/users/__tests__/handlers.test.ts
import { handleMe } from '@users/handlers';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('../service.js', () => ({
  getUserById: vi.fn(),
}));

vi.mock('@shared', () => ({
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Unauthorized',
    USER_NOT_FOUND: 'User not found',
    INTERNAL_ERROR: 'Internal server error',
  },
}));

describe('Users Handlers', () => {
  const mockCtx = {
    db: {},
    log: {
      error: vi.fn(),
    },
  };

  const mockRequest = {
    user: { userId: 'user-123' },
    headers: {},
    cookies: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMe', () => {
    test('should return 401 when user is not authenticated', async () => {
      const requestWithoutUser = { ...mockRequest, user: null };

      const result = await handleMe(mockCtx as never, requestWithoutUser as never);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: 'Unauthorized' });
    });

    test('should return user profile when authenticated', async () => {
      const { getUserById } = await import('../service.js');
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      };
      (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    });

    test('should return 404 when user not found', async () => {
      const { getUserById } = await import('../service.js');
      (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({ message: 'User not found' });
    });

    test('should return 500 on unexpected error', async () => {
      const { getUserById } = await import('../service.js');
      (getUserById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database error'));

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});
