// apps/web/src/features/admin/hooks/useUserActions.test.ts
/**
 * Tests for useUserActions hook
 *
 * Validates admin user action operations (update, lock, unlock) and error handling.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminApiClient } from '../services/adminApi';
import { useUserActions } from './useUserActions';

import type {
    AdminLockUserRequest,
    AdminLockUserResponse,
    AdminUpdateUserRequest,
    AdminUpdateUserResponse,
} from '@abe-stack/shared';
import type { AdminApiClient } from '../services/adminApi';

// ============================================================================
// Mocks
// ============================================================================

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

// ============================================================================
// Test Data
// ============================================================================

const mockUpdateResponse: AdminUpdateUserResponse = {
  message: 'User updated successfully',
  user: {
    id: 'user-123',
    email: 'updated@example.com',
    name: 'Updated Name',
    role: 'admin',
    emailVerified: true,
    emailVerifiedAt: '2024-01-01T00:00:00Z',
    lockedUntil: null,
    failedLoginAttempts: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
};

const mockLockResponse: AdminLockUserResponse = {
  message: 'User locked successfully',
  user: mockUpdateResponse.user,
};

// ============================================================================
// Tests
// ============================================================================

describe('useUserActions', () => {
  const mockUpdateUser = vi.fn();
  const mockLockUser = vi.fn();
  const mockUnlockUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdminApiClient).mockReturnValue({
      updateUser: mockUpdateUser,
      lockUser: mockLockUser,
      unlockUser: mockUnlockUser,
    } as unknown as AdminApiClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with all flags false', () => {
      const { result } = renderHook(() => useUserActions());

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isLocking).toBe(false);
      expect(result.current.isUnlocking).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastAction).toBeNull();
    });
  });

  describe('updateUserAction', () => {
    it('should update user successfully', async () => {
      mockUpdateUser.mockResolvedValue(mockUpdateResponse);

      const { result } = renderHook(() => useUserActions());

      const updateData: AdminUpdateUserRequest = { name: 'Updated Name' };
      let response: AdminUpdateUserResponse | null = null;

      await act(async () => {
        response = await result.current.updateUserAction('user-123', updateData);
      });

      expect(response).toEqual(mockUpdateResponse);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.lastAction).toBe('update');
      expect(result.current.error).toBeNull();
      expect(mockUpdateUser).toHaveBeenCalledWith('user-123', updateData);
    });

    it('should set isUpdating to true during operation', async () => {
      let resolvePromise: (value: AdminUpdateUserResponse) => void;
      const promise = new Promise<AdminUpdateUserResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockUpdateUser.mockReturnValue(promise);

      const { result } = renderHook(() => useUserActions());

      act(() => {
        void result.current.updateUserAction('user-123', { name: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true);
      });

      await act(async () => {
        resolvePromise(mockUpdateResponse);
        await promise;
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockUpdateUser.mockRejectedValue(error);

      const { result } = renderHook(() => useUserActions());

      let response: AdminUpdateUserResponse | null = null;

      await act(async () => {
        response = await result.current.updateUserAction('user-123', { name: 'Test' });
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe('Update failed');
      expect(result.current.isUpdating).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockUpdateUser.mockRejectedValue('String error');

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test' });
      });

      expect(result.current.error).toBe('Failed to update user');
    });

    it('should clear error on successful update after failure', async () => {
      mockUpdateUser.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test' });
      });

      expect(result.current.error).toBe('First error');

      mockUpdateUser.mockResolvedValue(mockUpdateResponse);

      await act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test 2' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('lockUserAction', () => {
    it('should lock user successfully', async () => {
      mockLockUser.mockResolvedValue(mockLockResponse);

      const { result } = renderHook(() => useUserActions());

      const lockData: AdminLockUserRequest = { reason: 'Suspicious activity' };
      let response: AdminLockUserResponse | null = null;

      await act(async () => {
        response = await result.current.lockUserAction('user-123', lockData);
      });

      expect(response).toEqual(mockLockResponse);
      expect(result.current.isLocking).toBe(false);
      expect(result.current.lastAction).toBe('lock');
      expect(result.current.error).toBeNull();
      expect(mockLockUser).toHaveBeenCalledWith('user-123', lockData);
    });

    it('should set isLocking to true during operation', async () => {
      let resolvePromise: (value: AdminLockUserResponse) => void;
      const promise = new Promise<AdminLockUserResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockLockUser.mockReturnValue(promise);

      const { result } = renderHook(() => useUserActions());

      act(() => {
        void result.current.lockUserAction('user-123', { reason: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.isLocking).toBe(true);
      });

      await act(async () => {
        resolvePromise(mockLockResponse);
        await promise;
      });

      expect(result.current.isLocking).toBe(false);
    });

    it('should handle lock errors', async () => {
      const error = new Error('Lock failed');
      mockLockUser.mockRejectedValue(error);

      const { result } = renderHook(() => useUserActions());

      let response: AdminLockUserResponse | null = null;

      await act(async () => {
        response = await result.current.lockUserAction('user-123', { reason: 'Test' });
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe('Lock failed');
      expect(result.current.isLocking).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockLockUser.mockRejectedValue('String error');

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.lockUserAction('user-123', { reason: 'Test' });
      });

      expect(result.current.error).toBe('Failed to lock user');
    });
  });

  describe('unlockUserAction', () => {
    it('should unlock user successfully', async () => {
      mockUnlockUser.mockResolvedValue(mockLockResponse);

      const { result } = renderHook(() => useUserActions());

      let response: AdminLockUserResponse | null = null;

      await act(async () => {
        response = await result.current.unlockUserAction('user-123', 'Account reviewed');
      });

      expect(response).toEqual(mockLockResponse);
      expect(result.current.isUnlocking).toBe(false);
      expect(result.current.lastAction).toBe('unlock');
      expect(result.current.error).toBeNull();
      expect(mockUnlockUser).toHaveBeenCalledWith('user-123', {
        email: '',
        reason: 'Account reviewed',
      });
    });

    it('should set isUnlocking to true during operation', async () => {
      let resolvePromise: (value: AdminLockUserResponse) => void;
      const promise = new Promise<AdminLockUserResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockUnlockUser.mockReturnValue(promise);

      const { result } = renderHook(() => useUserActions());

      act(() => {
        void result.current.unlockUserAction('user-123', 'Test');
      });

      await waitFor(() => {
        expect(result.current.isUnlocking).toBe(true);
      });

      await act(async () => {
        resolvePromise(mockLockResponse);
        await promise;
      });

      expect(result.current.isUnlocking).toBe(false);
    });

    it('should handle unlock errors', async () => {
      const error = new Error('Unlock failed');
      mockUnlockUser.mockRejectedValue(error);

      const { result } = renderHook(() => useUserActions());

      let response: AdminLockUserResponse | null = null;

      await act(async () => {
        response = await result.current.unlockUserAction('user-123', 'Test');
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe('Unlock failed');
      expect(result.current.isUnlocking).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockUnlockUser.mockRejectedValue('String error');

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.unlockUserAction('user-123', 'Test');
      });

      expect(result.current.error).toBe('Failed to unlock user');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockUpdateUser.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test' });
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('concurrent operations', () => {
    it('should not interfere between different action types', async () => {
      mockUpdateUser.mockResolvedValue(mockUpdateResponse);
      mockLockUser.mockResolvedValue(mockLockResponse);

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.updateUserAction('user-1', { name: 'Test' });
      });

      expect(result.current.lastAction).toBe('update');

      await act(async () => {
        await result.current.lockUserAction('user-2', { reason: 'Test' });
      });

      expect(result.current.lastAction).toBe('lock');
    });
  });
});
