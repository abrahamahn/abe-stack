// apps/web/src/features/admin/hooks/useAdminUsers.ts
/**
 * useAdminUsers hook
 *
 * Manage admin user listing with filtering and pagination.
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
  lockedUntil: string | null;
  createdAt: string;
}

interface AdminUserListFiltersLocal {
  search?: string;
  role?: UserRoleLocal;
  status?: 'active' | 'locked' | 'unverified';
  sortBy?: 'email' | 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface AdminUserListResponseLocal {
  data: AdminUserLocal[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UseAdminUsersState {
  users: AdminUserLocal[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseAdminUsersActions {
  setFilters: (filters: AdminUserListFiltersLocal) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

export interface UseAdminUsersResult extends UseAdminUsersState, UseAdminUsersActions {
  filters: AdminUserListFiltersLocal;
}

const DEFAULT_LIMIT = 20;

/**
 * Hook for managing admin user listing
 */
export function useAdminUsers(initialFilters: AdminUserListFiltersLocal = {}): UseAdminUsersResult {
  const { config } = useClientEnvironment();
  const [filters, setFiltersState] = useState<AdminUserListFiltersLocal>({
    page: 1,
    limit: DEFAULT_LIMIT,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialFilters,
  });

  const [state, setState] = useState<UseAdminUsersState>({
    users: [],
    total: 0,
    page: 1,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
    isLoading: true,
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

  const fetchUsers = useCallback(
    async (currentFilters: AdminUserListFiltersLocal) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result: AdminUserListResponseLocal = (await adminApi.listUsers(
        currentFilters,
      )) as AdminUserListResponseLocal;
      setState({
        users: result.data,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  },
    [adminApi],
  );

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers(filters).catch(() => {
      // Error is already handled in fetchUsers
    });
  }, [filters, fetchUsers]);

  const setFilters = useCallback((newFilters: AdminUserListFiltersLocal) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(async () => {
    await fetchUsers(filters);
  }, [filters, fetchUsers]);

  return {
    ...state,
    filters,
    setFilters,
    setPage,
    refresh,
  };
}
