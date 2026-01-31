// infra/users/src/handlers/profile.test.ts
/**
 * Profile Handler Unit Tests
 *
 * Tests for handleMe and handleListUsers HTTP handlers.
 *
 * @complexity O(1) per test
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// Use vi.hoisted to create mock functions that survive hoisting
const { mockGetUserById, mockListUsers } = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
  mockListUsers: vi.fn(),
}));

// Mock the service module
vi.mock('../service', () => ({
  getUserById: mockGetUserById,
  listUsers: mockListUsers,
}));

import { handleMe } from './profile';

describe('Profile Handlers', () => {
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
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMe', () => {
    test('should return 401 when user is not authenticated', async () => {
      const requestWithoutUser = {
        ...mockRequest,
        user: undefined,
      };

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
