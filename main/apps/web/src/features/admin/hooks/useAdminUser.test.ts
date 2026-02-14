// main/apps/web/src/features/admin/hooks/useAdminUser.test.ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createAdminApiClient } from '../services/adminApi';

import { useAdminUser } from './useAdminUser';

import type { AdminApiClient } from '../services/adminApi';
import type { AdminUser } from '@abe-stack/shared';

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    tokenStore: {
      get: vi.fn().mockReturnValue('mock-token'),
    },
  };
});

describe('useAdminUser', () => {
  const mockGetUser = vi.fn();

  const mockUser: AdminUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: '2024-01-01T00:00:00Z',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lockReason: null,
    phone: null,
    phoneVerified: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdminApiClient).mockReturnValue({
      getUser: mockGetUser,
    } as unknown as AdminApiClient);
  });

  describe('when userId is null', () => {
    it('should not fetch and return initial state', () => {
      const { result } = renderHook(() => useAdminUser(null));

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('when userId is empty string', () => {
    it('should not fetch and return initial state', () => {
      const { result } = renderHook(() => useAdminUser(''));

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('when userId is provided', () => {
    it('should fetch user on mount', async () => {
      mockGetUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAdminUser('user-123'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetUser).toHaveBeenCalledWith('user-123');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });

    it('should update when userId changes', async () => {
      mockGetUser.mockResolvedValue(mockUser);

      const { result, rerender } = renderHook<
        ReturnType<typeof useAdminUser>,
        { userId: string | null }
      >(({ userId }) => useAdminUser(userId), {
        initialProps: { userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetUser).toHaveBeenCalledWith('user-123');

      const newUser: AdminUser = {
        ...mockUser,
        id: 'user-456',
        email: 'other@example.com',
      };
      mockGetUser.mockResolvedValue(newUser);

      rerender({ userId: 'user-456' });

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalledWith('user-456');
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(newUser);
      });
    });

    it('should reset to initial state when userId changes to null', async () => {
      mockGetUser.mockResolvedValue(mockUser);

      const { result, rerender } = renderHook<
        ReturnType<typeof useAdminUser>,
        { userId: string | null }
      >(({ userId }) => useAdminUser(userId), {
        initialProps: { userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      rerender({ userId: null });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('when fetching fails', () => {
    it('should set error message from Error instance', async () => {
      const errorMessage = 'User not found';
      mockGetUser.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAdminUser('user-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.user).toBeNull();
    });

    it('should set generic error message for non-Error failures', async () => {
      mockGetUser.mockRejectedValue('string error');

      const { result } = renderHook(() => useAdminUser('user-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load user');
      expect(result.current.user).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should refetch user with same userId', async () => {
      mockGetUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAdminUser('user-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetUser.mockClear();
      const updatedUser: AdminUser = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };
      mockGetUser.mockResolvedValue(updatedUser);

      await result.current.refresh();

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalledWith('user-123');
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(updatedUser);
      });
    });

    it('should not fetch when userId is null', async () => {
      const { result } = renderHook(() => useAdminUser(null));

      await result.current.refresh();

      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should not fetch when userId is empty string', async () => {
      const { result } = renderHook(() => useAdminUser(''));

      await result.current.refresh();

      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      mockGetUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAdminUser('user-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetUser.mockRejectedValue(new Error('Refresh failed'));

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.error).toBe('Refresh failed');
      });
    });
  });

  describe('setUser', () => {
    it('should update user state directly', async () => {
      mockGetUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAdminUser('user-123'));

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      const updatedUser: AdminUser = {
        ...mockUser,
        firstName: 'Manually',
        lastName: 'Updated',
      };

      act(() => {
        result.current.setUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);
    });

    it('should allow setting user to null', async () => {
      mockGetUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAdminUser('user-123'));

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle loading state during fetch', () => {
      mockGetUser.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useAdminUser('user-123'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it('should clear previous error on successful fetch', async () => {
      mockGetUser.mockRejectedValueOnce(new Error('First error'));

      const { result, rerender } = renderHook<
        ReturnType<typeof useAdminUser>,
        { userId: string | null }
      >(({ userId }) => useAdminUser(userId), {
        initialProps: { userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      mockGetUser.mockResolvedValue(mockUser);

      rerender({ userId: 'user-456' });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });
});
