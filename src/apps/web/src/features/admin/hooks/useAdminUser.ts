// apps/web/src/features/admin/hooks/useAdminUser.ts
/**
 * useAdminUser hook
 *
 * Fetch and manage a single user for admin purposes.
 */

import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createAdminApiClient } from '../services/adminApi';

type UserRoleLocal = 'user' | 'moderator' | 'admin';

interface AdminUserLocal {
  id: string;
  email: string;
  name: string | null;
  role: UserRoleLocal;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseAdminUserState {
  user: AdminUserLocal | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseAdminUserResult extends UseAdminUserState {
  refresh: () => Promise<void>;
  setUser: (user: AdminUserLocal | null) => void;
}

/**
 * Hook for fetching and managing a single admin user
 */
export function useAdminUser(userId: string | null): UseAdminUserResult {
  const { config } = useClientEnvironment();
  const [state, setState] = useState<UseAdminUserState>({
    user: null,
    isLoading: false,
    error: null,
  });

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const fetchUser = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result: AdminUserLocal = (await adminApi.getUser(id)) as AdminUserLocal;
        setState({
          user: result,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load user';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [adminApi],
  );

  // Fetch user when userId changes
  useEffect(() => {
    if (userId !== null && userId !== '') {
      fetchUser(userId).catch(() => {
        // Error is already handled in fetchUser
      });
    } else {
      setState({ user: null, isLoading: false, error: null });
    }
  }, [userId, fetchUser]);

  const refresh = useCallback(async () => {
    if (userId !== null && userId !== '') {
      await fetchUser(userId);
    }
  }, [userId, fetchUser]);

  const setUser = useCallback((user: AdminUserLocal | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  return {
    ...state,
    refresh,
    setUser,
  };
}
