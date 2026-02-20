// main/apps/web/src/features/admin/hooks/useAdminUser.ts
/**
 * useAdminUser hook
 *
 * Fetch and manage a single user for admin purposes.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { AdminUser } from '@bslt/shared';

type AdminUserLocal = AdminUser;

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
        getToken: getAccessToken,
      }),
    [config.apiUrl],
  );

  const fetchUser = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await adminApi.getUser(id);
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
      queueMicrotask(() => {
        void fetchUser(userId);
      });
    } else {
      queueMicrotask(() => {
        setState({ user: null, isLoading: false, error: null });
      });
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
