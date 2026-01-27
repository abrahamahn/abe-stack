// apps/web/src/features/admin/hooks/useAdminUsers.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as adminApi from '../api/adminApi';

import { useAdminUsers } from './useAdminUsers';

import type { AdminUserListFilters, AdminUserListResponse } from '@abe-stack/core';

vi.mock('../api/adminApi', () => ({
  listUsers: vi.fn(),
}));

describe('useAdminUsers', () => {
  const mockListUsers = vi.mocked(adminApi.listUsers);

  const mockResponse: AdminUserListResponse = {
    data: [
      {
        id: 'user-1',
        email: 'user1@test.com',
        name: 'User One',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: '2024-01-01T00:00:00Z',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'user-2',
        email: 'user2@test.com',
        name: 'User Two',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: '2024-01-02T00:00:00Z',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when initialized', () => {
    it('should start with loading state', () => {
      mockListUsers.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useAdminUsers());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.users).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it('should apply default filters', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(mockListUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
      });
    });

    it('should merge initial filters with defaults', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      const initialFilters: AdminUserListFilters = {
        role: 'admin',
        search: 'test',
      };

      renderHook(() => useAdminUsers(initialFilters));

      await waitFor(() => {
        expect(mockListUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          role: 'admin',
          search: 'test',
        });
      });
    });
  });

  describe('when fetching succeeds', () => {
    it('should populate users and pagination state', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.users).toEqual(mockResponse.data);
      expect(result.current.total).toBe(2);
      expect(result.current.page).toBe(1);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.hasNext).toBe(false);
      expect(result.current.hasPrev).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('when fetching fails', () => {
    it('should set error message from Error instance', async () => {
      const errorMessage = 'Network error occurred';
      mockListUsers.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.users).toEqual([]);
    });

    it('should set generic error message for non-Error failures', async () => {
      mockListUsers.mockRejectedValue('string error');

      const { result } = renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load users');
    });
  });

  describe('setFilters', () => {
    it('should update filters and reset to page 1', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFilters: AdminUserListFilters = {
        role: 'admin',
        status: 'active',
      };

      result.current.setFilters(newFilters);

      await waitFor(() => {
        expect(mockListUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            role: 'admin',
            status: 'active',
          }),
        );
      });
    });

    it('should preserve existing filters not being changed', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useAdminUsers({ sortBy: 'email', sortOrder: 'asc' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.setFilters({ search: 'test' });

      await waitFor(() => {
        expect(mockListUsers).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortBy: 'email',
            sortOrder: 'asc',
            search: 'test',
            page: 1,
          }),
        );
      });
    });
  });

  describe('setPage', () => {
    it('should update only the page number', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAdminUsers({ role: 'admin' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.setPage(3);

      await waitFor(() => {
        expect(mockListUsers).toHaveBeenLastCalledWith(
          expect.objectContaining({
            page: 3,
            role: 'admin',
          }),
        );
      });
    });
  });

  describe('refresh', () => {
    it('should refetch with current filters', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAdminUsers({ role: 'moderator' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockListUsers.mockClear();

      await result.current.refresh();

      await waitFor(() => {
        expect(mockListUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'moderator',
          }),
        );
      });
    });

    it('should handle refresh errors gracefully', async () => {
      mockListUsers.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockListUsers.mockRejectedValue(new Error('Refresh failed'));

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.error).toBe('Refresh failed');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', async () => {
      const emptyResponse: AdminUserListResponse = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockListUsers.mockResolvedValue(emptyResponse);

      const { result } = renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.users).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should handle pagination with hasNext and hasPrev', async () => {
      const paginatedResponse: AdminUserListResponse = {
        ...mockResponse,
        page: 2,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      };

      mockListUsers.mockResolvedValue(paginatedResponse);

      const { result } = renderHook(() => useAdminUsers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.page).toBe(2);
      expect(result.current.totalPages).toBe(5);
      expect(result.current.hasNext).toBe(true);
      expect(result.current.hasPrev).toBe(true);
    });
  });
});
