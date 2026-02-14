// main/apps/web/src/features/settings/hooks/useProfile.test.ts
/**
 * Tests for useProfileUpdate hook.
 *
 * Tests profile update functionality with proper mocking
 * of the settings API and query cache invalidation.
 */

import { QueryCache } from '@abe-stack/client-engine';
import { QueryCacheProvider } from '@abe-stack/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode, createElement } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock, beforeEach, afterEach } from 'vitest';

import { createSettingsApi } from '../api';

import { useProfileUpdate } from './useProfile';

import type { UpdateProfileRequest, User } from '../api';
import type { UserId } from '@abe-stack/shared';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../api', () => ({
  createSettingsApi: vi.fn(),
}));

// ============================================================================
// Test Setup
// ============================================================================

const mockUpdateProfile = vi.fn();

const createWrapper = (cache: QueryCache): ((props: { children: ReactNode }) => ReactElement) => {
  return ({ children }: { children: ReactNode }): ReactElement => {
    return createElement(QueryCacheProvider, { cache: cache, children }, children);
  };
};

const mockUser: User = {
  id: '1' as unknown as UserId,
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
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useProfileUpdate', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCache = new QueryCache();

    (createSettingsApi as Mock).mockReturnValue({
      updateProfile: mockUpdateProfile,
    });

    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide updateProfile function', () => {
      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('successful profile update', () => {
    it('should update profile successfully', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });

    it('should update email successfully', async () => {
      const profileData: UpdateProfileRequest = {
        email: 'newemail@example.com',
      };
      const updatedUser: User = {
        ...mockUser,
        email: 'newemail@example.com',
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });

    it('should update firstName, lastName and email', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'New',
        lastName: 'Name',
        email: 'newemail@example.com',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: 'New',
        lastName: 'Name',
        email: 'newemail@example.com',
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });

    it('should invalidate user cache on success', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['user', 'me']);
      expect(invalidateSpy).toHaveBeenCalledWith(['users']);
    });

    it('should call onSuccess callback with updated user', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };
      const onSuccess = vi.fn();

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(updatedUser);
    });
  });

  describe('error handling', () => {
    it('should handle invalid email format error', async () => {
      const profileData: UpdateProfileRequest = {
        email: 'invalid-email',
      };
      const mockError = new Error('Invalid email format');

      mockUpdateProfile.mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle duplicate email error', async () => {
      const profileData: UpdateProfileRequest = {
        email: 'taken@example.com',
      };
      const mockError = new Error('Email already in use');

      mockUpdateProfile.mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const mockError = new Error('Network error');

      mockUpdateProfile.mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should call onError callback', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const mockError = new Error('Update failed');
      const onError = vi.fn();

      mockUpdateProfile.mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileUpdate({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('should not invalidate cache on error', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const mockError = new Error('Update failed');

      mockUpdateProfile.mockRejectedValue(mockError);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset state to idle', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very long firstName', async () => {
      const longFirstName = 'a'.repeat(1000);
      const profileData: UpdateProfileRequest = {
        firstName: longFirstName,
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: longFirstName,
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });

    it('should handle names with special characters', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: "O'Neill",
        lastName: '李明',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: "O'Neill",
        lastName: '李明',
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });

    it('should handle empty update object', async () => {
      const profileData: UpdateProfileRequest = {};
      const updatedUser: User = { ...mockUser };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });
  });

  describe('callbacks without options', () => {
    it('should work without any callbacks', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });

    it('should work with only onSuccess callback', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser: User = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };
      const onSuccess = vi.fn();

      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileUpdate({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(updatedUser);
    });

    it('should work with only onError callback', async () => {
      const profileData: UpdateProfileRequest = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const mockError = new Error('Failed');
      const onError = vi.fn();

      mockUpdateProfile.mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileUpdate({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.updateProfile(profileData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });
});
