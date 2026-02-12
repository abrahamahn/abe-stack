// src/server/core/src/users/handlers/profile.test.ts
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

import { handleListUsers, handleMe } from './profile';

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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };
      mockGetUserById.mockResolvedValue(mockUser);

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        bio: null,
        city: null,
        state: null,
        country: null,
        language: null,
        website: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
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

    test('should return user with all populated optional fields', async () => {
      const fullUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'user' as const,
        emailVerified: true,
        phone: '+1234567890',
        phoneVerified: true,
        dateOfBirth: '1990-01-01',
        gender: 'male',
        bio: 'Hello world',
        city: 'New York',
        state: 'NY',
        country: 'US',
        language: 'en',
        website: 'https://example.com',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-06-01T00:00:00.000Z'),
      };
      mockGetUserById.mockResolvedValue(fullUser);

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(200);
      const body = result.body as Record<string, unknown>;
      expect(body['avatarUrl']).toBe('https://example.com/avatar.jpg');
      expect(body['phone']).toBe('+1234567890');
      expect(body['bio']).toBe('Hello world');
      expect(body['city']).toBe('New York');
      expect(body['website']).toBe('https://example.com');
    });

    test('should call getUserById with correct userId', async () => {
      mockGetUserById.mockResolvedValue(null);

      await handleMe(mockCtx as never, mockRequest as never);

      expect(mockGetUserById).toHaveBeenCalledWith(mockCtx.repos.users, 'user-123');
    });

    test('should log error with correct context on failure', async () => {
      const dbError = new Error('Connection timeout');
      mockGetUserById.mockRejectedValue(dbError);

      await handleMe(mockCtx as never, mockRequest as never);

      expect(mockCtx.log.error).toHaveBeenCalledWith(dbError, 'Users operation failed');
    });

    test('should serialize dates as ISO strings', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: false,
        dateOfBirth: null,
        gender: null,
        createdAt: new Date('2024-06-15T10:30:00.000Z'),
        updatedAt: new Date('2024-06-20T14:00:00.000Z'),
      };
      mockGetUserById.mockResolvedValue(mockUser);

      const result = await handleMe(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(200);
      const body = result.body as Record<string, unknown>;
      expect(body['createdAt']).toBe('2024-06-15T10:30:00.000Z');
      expect(body['updatedAt']).toBe('2024-06-20T14:00:00.000Z');
    });
  });

  describe('handleListUsers', () => {
    const mockPaginationRequest = {
      user: { userId: 'admin-1', email: 'admin@example.com', role: 'admin' as const },
      headers: {},
      cookies: {},
      requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
      pagination: {
        type: 'cursor' as const,
        cursor: { limit: 20, cursor: undefined },
        helpers: {
          createCursorResult: <T>(
            data: T[],
            nextCursor: string | null,
            hasNext: boolean,
            limit: number,
          ) => ({
            data,
            pagination: { nextCursor, hasNext, limit },
          }),
        },
      },
    };

    test('should return 200 with paginated user list', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          firstName: 'User',
          lastName: 'One',
          avatarUrl: null,
          role: 'user' as const,
          emailVerified: true,
          phone: null,
          phoneVerified: false,
          dateOfBirth: null,
          gender: null,
          bio: null,
          city: null,
          state: null,
          country: null,
          language: null,
          website: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ];
      mockListUsers.mockResolvedValue({
        users: mockUsers,
        nextCursor: null,
        hasNext: false,
      });

      const result = await handleListUsers(mockCtx as never, mockPaginationRequest as never);

      expect(result.status).toBe(200);
      expect((result.body as { data: unknown[] }).data).toHaveLength(1);
    });

    test('should return 400 when pagination type is not cursor', async () => {
      const requestWithOffsetPagination = {
        ...mockPaginationRequest,
        pagination: {
          type: 'offset' as const,
          cursor: undefined,
          helpers: mockPaginationRequest.pagination.helpers,
        },
      };

      const result = await handleListUsers(mockCtx as never, requestWithOffsetPagination as never);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: 'This endpoint only supports cursor pagination' });
    });

    test('should return empty list when no users exist', async () => {
      mockListUsers.mockResolvedValue({
        users: [],
        nextCursor: null,
        hasNext: false,
      });

      const result = await handleListUsers(mockCtx as never, mockPaginationRequest as never);

      expect(result.status).toBe(200);
      expect((result.body as { data: unknown[] }).data).toHaveLength(0);
    });

    test('should pass cursor pagination params to service', async () => {
      mockListUsers.mockResolvedValue({
        users: [],
        nextCursor: null,
        hasNext: false,
      });

      const requestWithCursor = {
        ...mockPaginationRequest,
        pagination: {
          ...mockPaginationRequest.pagination,
          cursor: { limit: 10, cursor: 'abc123' },
        },
      };

      await handleListUsers(mockCtx as never, requestWithCursor as never);

      expect(mockListUsers).toHaveBeenCalledWith(mockCtx.repos.users, {
        limit: 10,
        cursor: 'abc123',
      });
    });

    test('should return 500 on unexpected error', async () => {
      mockListUsers.mockRejectedValue(new Error('Database error'));

      const result = await handleListUsers(mockCtx as never, mockPaginationRequest as never);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});
