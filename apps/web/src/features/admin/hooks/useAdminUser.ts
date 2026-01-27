// apps/web/src/features/admin/hooks/useAdminUser.ts
/**
 * useAdminUser hook
 *
 * Fetch and manage a single user for admin purposes.
 */

import { useCallback, useEffect, useState } from 'react';

import { getUser } from '../api';

import type { AdminUser } from '@abe-stack/core';

export interface UseAdminUserState {
  user: AdminUser | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseAdminUserResult extends UseAdminUserState {
  refresh: () => Promise<void>;
  setUser: (user: AdminUser | null) => void;
}

/**
 * Hook for fetching and managing a single admin user
 */
export function useAdminUser(userId: string | null): UseAdminUserResult {
  const [state, setState] = useState<UseAdminUserState>({
    user: null,
    isLoading: false,
    error: null,
  });

  const fetchUser = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getUser(id);
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
  }, []);

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

  const setUser = useCallback((user: AdminUser | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  return {
    ...state,
    refresh,
    setUser,
  };
}
