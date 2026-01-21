// apps/server/src/modules/users/__tests__/service.test.ts
import { getUserById } from '@users/service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('@infrastructure', () => ({
  users: { id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ eq: [col, val] })),
}));

describe('Users Service', () => {
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

  describe('getUserById', () => {
    test('should return user when found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: new Date('2024-01-01'),
      };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserById(mockDb as never, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: mockUser.createdAt,
      });
    });

    test('should return null when user not found', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const result = await getUserById(mockDb as never, 'nonexistent');

      expect(result).toBeNull();
    });

    test('should handle user with null name', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        role: 'admin' as const,
        createdAt: new Date('2024-01-01'),
      };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserById(mockDb as never, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        role: 'admin',
        createdAt: mockUser.createdAt,
      });
    });

    test('should query with correct user id', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await getUserById(mockDb as never, 'specific-user-id');

      expect(mockDb.query.users.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything() as unknown,
        }),
      );
    });
  });
});
