// src/server/core/src/users/handlers/profile-completeness.test.ts
/**
 * Profile Completeness Handler Unit Tests
 *
 * Tests for computeProfileCompleteness and handleGetProfileCompleteness.
 *
 * @complexity O(1) per test
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// Use vi.hoisted to create mock functions that survive hoisting
const { mockGetUserById } = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
}));

// Mock the service module
vi.mock('../service', () => ({
  getUserById: mockGetUserById,
}));

import { computeProfileCompleteness, handleGetProfileCompleteness } from './profile-completeness';

describe('Profile Completeness', () => {
  // ==========================================================================
  // computeProfileCompleteness (pure function)
  // ==========================================================================

  describe('computeProfileCompleteness', () => {
    test('should return 0% for completely empty profile', () => {
      const user = {
        firstName: '',
        lastName: '',
        avatarUrl: null,
        bio: null,
        city: null,
        state: null,
        country: null,
        language: null,
        website: null,
        phone: null,
      };

      const result = computeProfileCompleteness(user);

      expect(result.percentage).toBe(0);
      expect(result.missingFields).toHaveLength(10);
      expect(result.missingFields).toContain('firstName');
      expect(result.missingFields).toContain('lastName');
      expect(result.missingFields).toContain('avatarUrl');
      expect(result.missingFields).toContain('bio');
      expect(result.missingFields).toContain('city');
      expect(result.missingFields).toContain('state');
      expect(result.missingFields).toContain('country');
      expect(result.missingFields).toContain('language');
      expect(result.missingFields).toContain('website');
      expect(result.missingFields).toContain('phone');
    });

    test('should return 100% for fully filled profile', () => {
      const user = {
        firstName: 'Jane',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Software engineer',
        city: 'Seattle',
        state: 'WA',
        country: 'US',
        language: 'en',
        website: 'https://jane.dev',
        phone: '+1-555-1234',
      };

      const result = computeProfileCompleteness(user);

      expect(result.percentage).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    test('should return correct percentage for partially filled profile', () => {
      const user = {
        firstName: 'Jane',
        lastName: 'Doe',
        avatarUrl: null,
        bio: null,
        city: 'Seattle',
        state: null,
        country: 'US',
        language: null,
        website: null,
        phone: '+1-555-1234',
      };

      const result = computeProfileCompleteness(user);

      // 5 filled out of 10 = 50%
      expect(result.percentage).toBe(50);
      expect(result.missingFields).toHaveLength(5);
      expect(result.missingFields).toContain('avatarUrl');
      expect(result.missingFields).toContain('bio');
      expect(result.missingFields).toContain('state');
      expect(result.missingFields).toContain('language');
      expect(result.missingFields).toContain('website');
    });

    test('should treat undefined values as missing', () => {
      const user = {
        firstName: 'Jane',
        lastName: undefined,
        avatarUrl: null,
        bio: undefined,
        city: null,
        state: null,
        country: null,
        language: null,
        website: null,
        phone: null,
      };

      const result = computeProfileCompleteness(user);

      expect(result.percentage).toBe(10);
      expect(result.missingFields).toContain('lastName');
      expect(result.missingFields).toContain('bio');
    });

    test('should treat empty string values as missing', () => {
      const user = {
        firstName: '',
        lastName: 'Doe',
        avatarUrl: '',
        bio: '',
        city: null,
        state: null,
        country: null,
        language: null,
        website: null,
        phone: null,
      };

      const result = computeProfileCompleteness(user);

      expect(result.missingFields).toContain('firstName');
      expect(result.missingFields).toContain('avatarUrl');
      expect(result.missingFields).toContain('bio');
      expect(result.missingFields).not.toContain('lastName');
    });
  });

  // ==========================================================================
  // handleGetProfileCompleteness (handler)
  // ==========================================================================

  describe('handleGetProfileCompleteness', () => {
    const mockCtx = {
      repos: {
        users: {
          findById: vi.fn(),
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

    test('should return 401 when user is not authenticated', async () => {
      const requestWithoutUser = {
        ...mockRequest,
        user: undefined,
      };

      const result = await handleGetProfileCompleteness(
        mockCtx as never,
        requestWithoutUser as never,
      );

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: 'Unauthorized' });
    });

    test('should return 404 when user not found', async () => {
      mockGetUserById.mockResolvedValue(null);

      const result = await handleGetProfileCompleteness(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({ message: 'User not found' });
    });

    test('should return completeness data for authenticated user', async () => {
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
        bio: null,
        city: null,
        state: null,
        country: null,
        language: null,
        website: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };
      mockGetUserById.mockResolvedValue(mockUser);

      const result = await handleGetProfileCompleteness(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(200);
      if (result.status === 200) {
        expect(result.body.percentage).toBe(20);
        expect(result.body.missingFields).toContain('avatarUrl');
        expect(result.body.missingFields).toContain('bio');
        expect(result.body.missingFields).toContain('city');
        expect(result.body.missingFields).toContain('state');
        expect(result.body.missingFields).toContain('country');
        expect(result.body.missingFields).toContain('language');
        expect(result.body.missingFields).toContain('website');
        expect(result.body.missingFields).toContain('phone');
        expect(result.body.missingFields).not.toContain('firstName');
        expect(result.body.missingFields).not.toContain('lastName');
      }
    });

    test('should return 100% for fully filled profile', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'user' as const,
        emailVerified: true,
        phone: '+1-555-1234',
        phoneVerified: true,
        dateOfBirth: '1990-01-01',
        gender: 'female',
        bio: 'A software engineer',
        city: 'Seattle',
        state: 'WA',
        country: 'US',
        language: 'en',
        website: 'https://example.com',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };
      mockGetUserById.mockResolvedValue(mockUser);

      const result = await handleGetProfileCompleteness(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(200);
      if (result.status === 200) {
        expect(result.body.percentage).toBe(100);
        expect(result.body.missingFields).toHaveLength(0);
      }
    });

    test('should return 500 on unexpected error', async () => {
      mockGetUserById.mockRejectedValue(new Error('Database error'));

      const result = await handleGetProfileCompleteness(mockCtx as never, mockRequest as never);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});
