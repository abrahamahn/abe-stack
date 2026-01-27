// apps/web/src/features/admin/hooks/useUserActions.test.ts
/**
 * Tests for useUserActions hook
 *
 * Validates admin user action operations (update, lock, unlock) and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserActions } from './useUserActions';
import * as adminApi from '../api';

import type {
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminLockUserRequest,
  AdminLockUserResponse,
} from '@abe-stack/core';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../api', () => ({
  updateUser: vi.fn(),
  lockUser: vi.fn(),
  unlockUser: vi.fn(),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockUpdateResponse: AdminUpdateUserResponse = {
  user: {
    id: 'user-123',
    email: 'updated@example.com',
    name: 'Updated Name',
    role: 'admin',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    version: 2,
  },
};

const mockLockResponse: AdminLockUserResponse = {
  success: true,
  message: 'User locked successfully',
};

// ============================================================================
// Tests
// ============================================================================

describe('useUserActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      vi.mocked(adminApi.updateUser).mockResolvedValue(mockUpdateResponse);

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
      expect(adminApi.updateUser).toHaveBeenCalledWith('user-123', updateData);
    });

    it('should set isUpdating to true during operation', async () => {
      let resolvePromise: (value: AdminUpdateUserResponse) => void;
      const promise = new Promise<AdminUpdateUserResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(adminApi.updateUser).mockReturnValue(promise);

      const { result } = renderHook(() => useUserActions());

      const updatePromise = act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test' });
      });

      expect(result.current.isUpdating).toBe(true);

      resolvePromise(mockUpdateResponse);
      await updatePromise;

      expect(result.current.isUpdating).toBe(false);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      vi.mocked(adminApi.updateUser).mockRejectedValue(error);

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
      vi.mocked(adminApi.updateUser).mockRejectedValue('String error');

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test' });
      });

      expect(result.current.error).toBe('Failed to update user');
    });

    it('should clear error on successful update after failure', async () => {
      vi.mocked(adminApi.updateUser).mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test' });
      });

      expect(result.current.error).toBe('First error');

      vi.mocked(adminApi.updateUser).mockResolvedValue(mockUpdateResponse);

      await act(async () => {
        await result.current.updateUserAction('user-123', { name: 'Test 2' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('lockUserAction', () => {
    it('should lock user successfully', async () => {
      vi.mocked(adminApi.lockUser).mockResolvedValue(mockLockResponse);

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
      expect(adminApi.lockUser).toHaveBeenCalledWith('user-123', lockData);
    });

    it('should set isLocking to true during operation', async () => {
      let resolvePromise: (value: AdminLockUserResponse) => void;
      const promise = new Promise<AdminLockUserResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(adminApi.lockUser).mockReturnValue(promise);

      const { result } = renderHook(() => useUserActions());

      const lockPromise = act(async () => {
        await result.current.lockUserAction('user-123', { reason: 'Test' });
      });

      expect(result.current.isLocking).toBe(true);

      resolvePromise(mockLockResponse);
      await lockPromise;

      expect(result.current.isLocking).toBe(false);
    });

    it('should handle lock errors', async () => {
      const error = new Error('Lock failed');
      vi.mocked(adminApi.lockUser).mockRejectedValue(error);

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
      vi.mocked(adminApi.lockUser).mockRejectedValue('String error');

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.lockUserAction('user-123', { reason: 'Test' });
      });

      expect(result.current.error).toBe('Failed to lock user');
    });
  });

  describe('unlockUserAction', () => {
    it('should unlock user successfully', async () => {
      vi.mocked(adminApi.unlockUser).mockResolvedValue(mockLockResponse);

      const { result } = renderHook(() => useUserActions());

      let response: AdminLockUserResponse | null = null;

      await act(async () => {
        response = await result.current.unlockUserAction('user-123', 'Account reviewed');
      });

      expect(response).toEqual(mockLockResponse);
      expect(result.current.isUnlocking).toBe(false);
      expect(result.current.lastAction).toBe('unlock');
      expect(result.current.error).toBeNull();
      expect(adminApi.unlockUser).toHaveBeenCalledWith('user-123', {
        email: '',
        reason: 'Account reviewed',
      });
    });

    it('should set isUnlocking to true during operation', async () => {
      let resolvePromise: (value: AdminLockUserResponse) => void;
      const promise = new Promise<AdminLockUserResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(adminApi.unlockUser).mockReturnValue(promise);

      const { result } = renderHook(() => useUserActions());

      const unlockPromise = act(async () => {
        await result.current.unlockUserAction('user-123', 'Test');
      });

      expect(result.current.isUnlocking).toBe(true);

      resolvePromise(mockLockResponse);
      await unlockPromise;

      expect(result.current.isUnlocking).toBe(false);
    });

    it('should handle unlock errors', async () => {
      const error = new Error('Unlock failed');
      vi.mocked(adminApi.unlockUser).mockRejectedValue(error);

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
      vi.mocked(adminApi.unlockUser).mockRejectedValue('String error');

      const { result } = renderHook(() => useUserActions());

      await act(async () => {
        await result.current.unlockUserAction('user-123', 'Test');
      });

      expect(result.current.error).toBe('Failed to unlock user');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      vi.mocked(adminApi.updateUser).mockRejectedValue(new Error('Test error'));

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
      vi.mocked(adminApi.updateUser).mockResolvedValue(mockUpdateResponse);
      vi.mocked(adminApi.lockUser).mockResolvedValue(mockLockResponse);

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
