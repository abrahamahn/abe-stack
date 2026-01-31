// apps/web/src/features/admin/hooks/useUserActions.ts
/**
 * useUserActions hook
 *
 * Actions for admin user management (update, lock, unlock).
 */

import { useCallback, useState } from 'react';

import { lockUser, unlockUser, updateUser } from '../api';

// ============================================================================
// Types
// ============================================================================

type UserRoleLocal = 'user' | 'moderator' | 'admin';

interface AdminUserLocal {
  id: string;
  email: string;
  name: string | null;
  role: UserRoleLocal;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminUpdateUserRequestLocal {
  name?: string | null;
  role?: UserRoleLocal;
}

interface AdminUpdateUserResponseLocal {
  message: string;
  user: AdminUserLocal;
}

interface AdminLockUserRequestLocal {
  reason: string;
  durationMinutes?: number;
}

interface AdminLockUserResponseLocal {
  message: string;
  user: AdminUserLocal;
}

export interface UseUserActionsState {
  isUpdating: boolean;
  isLocking: boolean;
  isUnlocking: boolean;
  error: string | null;
  lastAction: 'update' | 'lock' | 'unlock' | null;
}

export interface UseUserActionsResult extends UseUserActionsState {
  updateUserAction: (
    userId: string,
    data: AdminUpdateUserRequestLocal,
  ) => Promise<AdminUpdateUserResponseLocal | null>;
  lockUserAction: (
    userId: string,
    data: AdminLockUserRequestLocal,
  ) => Promise<AdminLockUserResponseLocal | null>;
  unlockUserAction: (userId: string, reason: string) => Promise<AdminLockUserResponseLocal | null>;
  clearError: () => void;
}

/**
 * Hook for admin user actions
 */
export function useUserActions(): UseUserActionsResult {
  const [state, setState] = useState<UseUserActionsState>({
    isUpdating: false,
    isLocking: false,
    isUnlocking: false,
    error: null,
    lastAction: null,
  });

  const updateUserAction = useCallback(
    async (
      userId: string,
      data: AdminUpdateUserRequestLocal,
    ): Promise<AdminUpdateUserResponseLocal | null> => {
      setState((prev) => ({ ...prev, isUpdating: true, error: null }));

      try {
        const result: AdminUpdateUserResponseLocal = (await updateUser(
          userId,
          data,
        )) as AdminUpdateUserResponseLocal;
        setState((prev) => ({
          ...prev,
          isUpdating: false,
          lastAction: 'update',
        }));
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
        setState((prev) => ({
          ...prev,
          isUpdating: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [],
  );

  const lockUserAction = useCallback(
    async (
      userId: string,
      data: AdminLockUserRequestLocal,
    ): Promise<AdminLockUserResponseLocal | null> => {
      setState((prev) => ({ ...prev, isLocking: true, error: null }));

      try {
        const result: AdminLockUserResponseLocal = (await lockUser(
          userId,
          data,
        )) as AdminLockUserResponseLocal;
        setState((prev) => ({
          ...prev,
          isLocking: false,
          lastAction: 'lock',
        }));
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to lock user';
        setState((prev) => ({
          ...prev,
          isLocking: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [],
  );

  const unlockUserAction = useCallback(
    async (userId: string, reason: string): Promise<AdminLockUserResponseLocal | null> => {
      setState((prev) => ({ ...prev, isUnlocking: true, error: null }));

      try {
        // The unlock endpoint expects the email in the request body for the legacy endpoint,
        // but the new /users/:id/unlock endpoint needs the email for logging purposes
        // We'll use a placeholder since the backend will look up the user by ID
        const result: AdminLockUserResponseLocal = (await unlockUser(userId, {
          email: '',
          reason,
        })) as AdminLockUserResponseLocal;
        setState((prev) => ({
          ...prev,
          isUnlocking: false,
          lastAction: 'unlock',
        }));
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to unlock user';
        setState((prev) => ({
          ...prev,
          isUnlocking: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    updateUserAction,
    lockUserAction,
    unlockUserAction,
    clearError,
  };
}
