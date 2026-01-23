// apps/web/src/features/admin/hooks/useAdminUsers.ts
/**
 * useAdminUsers hook
 *
 * Manage admin user listing with filtering and pagination.
 */

import { useCallback, useEffect, useState } from 'react';
import { listUsers } from '../api';

import type { AdminUser, AdminUserListFilters } from '@abe-stack/core';

export interface UseAdminUsersState {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseAdminUsersActions {
  setFilters: (filters: AdminUserListFilters) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

export interface UseAdminUsersResult extends UseAdminUsersState, UseAdminUsersActions {
  filters: AdminUserListFilters;
}

const DEFAULT_LIMIT = 20;

/**
 * Hook for managing admin user listing
 */
export function useAdminUsers(initialFilters: AdminUserListFilters = {}): UseAdminUsersResult {
  const [filters, setFiltersState] = useState<AdminUserListFilters>({
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

  const fetchUsers = useCallback(async (currentFilters: AdminUserListFilters) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await listUsers(currentFilters);
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
  }, []);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers(filters).catch(() => {
      // Error is already handled in fetchUsers
    });
  }, [filters, fetchUsers]);

  const setFilters = useCallback((newFilters: AdminUserListFilters) => {
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
