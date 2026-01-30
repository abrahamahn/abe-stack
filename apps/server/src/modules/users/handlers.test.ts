// apps/server/src/modules/users/handlers.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Use vi.hoisted to create mock functions that survive hoisting
const { mockGetUserById, mockListUsers } = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
  mockListUsers: vi.fn(),
}));

// Mock user service functions - handlers.ts imports from @abe-stack/users
vi.mock('@abe-stack/users', () => ({
  getUserById: mockGetUserById,
  listUsers: mockListUsers,
}));

vi.mock('../../shared', () => ({
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Unauthorized',
    USER_NOT_FOUND: 'User not found',
    INTERNAL_ERROR: 'Internal server error',
  },
}));

import { handleMe } from './handlers';

describe('Users Handlers', () => {
  const mockCtx = {
    repos: {
      users: {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      },
    },
    log: {
      error: vi.fn(),
    },
  };

  const mockRequest = {
    user: { userId: 'user-123', email: 'test@example.com', role: 'user' as const },
    headers: {},
    cookies: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMe', () => {
    test('should return 401 when user is not authenticated', async () => {
      const requestWithoutUser = { ...mockRequest, user: undefined };

      const result = await handleMe(mockCtx as never, requestWithoutUser as never);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: 'Unauthorized' });
    });

    test('should return user profile when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      };
      mockGetUserById.mockResolvedValue(mockUser);

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    });

    test('should return 404 when user not found', async () => {
      mockGetUserById.mockResolvedValue(null);

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({ message: 'User not found' });
    });

    test('should return 500 on unexpected error', async () => {
      mockGetUserById.mockRejectedValue(new Error('Database error'));

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});
