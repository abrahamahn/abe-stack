// src/apps/web/src/features/settings/hooks/usePasswordChange.test.ts
/**
 * Tests for usePasswordChange hook.
 *
 * Tests password change functionality with proper mocking
 * of the settings API.
 */

import { QueryCache } from '@abe-stack/client-engine';
import { QueryCacheProvider } from '@abe-stack/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode, createElement } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { createSettingsApi } from '../api';

import { usePasswordChange } from './usePasswordChange';

import type { ChangePasswordRequest } from '../api';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../api', () => ({
  createSettingsApi: vi.fn(),
}));

// ============================================================================
// Test Setup
// ============================================================================

const mockChangePassword = vi.fn();

const createWrapper = (cache: QueryCache): ((props: { children: ReactNode }) => ReactElement) => {
  return ({ children }: { children: ReactNode }): ReactElement => {
    return createElement(QueryCacheProvider, { cache: cache, children }, children);
  };
};

describe('usePasswordChange', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCache = new QueryCache();

    (createSettingsApi as Mock).mockReturnValue({
      changePassword: mockChangePassword,
    });

    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide changePassword function', () => {
      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      expect(typeof result.current.changePassword).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('successful password change', () => {
    it('should change password successfully', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockResponse = { success: true };

      mockChangePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(mockChangePassword).toHaveBeenCalledWith(passwordData);
    });

    it('should call onSuccess callback', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockResponse = { success: true };
      const onSuccess = vi.fn();

      mockChangePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePasswordChange({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle password with special characters', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'P@ssw0rd!#$',
        newPassword: 'N3w-P@ssw0rd!#$%',
      };
      const mockResponse = { success: true };

      mockChangePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockChangePassword).toHaveBeenCalledWith(passwordData);
    });
  });

  describe('error handling', () => {
    it('should handle incorrect current password error', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      };
      const mockError = new Error('Current password is incorrect');

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle weak password error', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: '123',
      };
      const mockError = new Error('Password is too weak');

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockError = new Error('Network error');

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should call onError callback', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockError = new Error('Password change failed');
      const onError = vi.fn();

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('reset functionality', () => {
    it('should reset state to idle', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockResponse = { success: true };

      mockChangePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
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

    it('should reset error state', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      };
      const mockError = new Error('Current password is incorrect');

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
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
    it('should handle empty password strings', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: '',
        newPassword: '',
      };
      const mockError = new Error('Password cannot be empty');

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockChangePassword).toHaveBeenCalledWith(passwordData);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const passwordData: ChangePasswordRequest = {
        currentPassword: longPassword,
        newPassword: longPassword,
      };
      const mockResponse = { success: true };

      mockChangePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockChangePassword).toHaveBeenCalledWith(passwordData);
    });

    it('should handle same current and new password', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'same-password',
        newPassword: 'same-password',
      };
      const mockError = new Error('New password must be different');

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('callbacks without options', () => {
    it('should work without any callbacks', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockResponse = { success: true };

      mockChangePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePasswordChange(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockChangePassword).toHaveBeenCalledWith(passwordData);
    });

    it('should work with only onSuccess callback', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockResponse = { success: true };
      const onSuccess = vi.fn();

      mockChangePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePasswordChange({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });

    it('should work with only onError callback', async () => {
      const passwordData: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const mockError = new Error('Failed');
      const onError = vi.fn();

      mockChangePassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePasswordChange({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.changePassword(passwordData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });
});
