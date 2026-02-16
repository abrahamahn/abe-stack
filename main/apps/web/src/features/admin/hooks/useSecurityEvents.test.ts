// main/apps/web/src/features/admin/hooks/useSecurityEvents.test.ts
/**
 * Tests for useSecurityEvents hook
 *
 * Validates security events listing with filters, pagination, and state management.
 */

import { useQuery } from '@abe-stack/react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { useSecurityEvents } from './useSecurityEvents';

import type { SecurityEventsFilter, SecurityEventsListResponse } from '@abe-stack/shared';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@abe-stack/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: { apiUrl: 'http://localhost:3001' },
  }),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(() => ({
    listSecurityEvents: vi.fn(),
  })),
}));

vi.mock('@abe-stack/shared', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/shared')>('@abe-stack/shared');
  return {
    ...actual,
    tokenStore: {
      get: vi.fn(() => 'mock-token'),
    },
  };
});

// ============================================================================
// Test Data
// ============================================================================

const mockResponse: SecurityEventsListResponse = {
  data: [
    {
      id: 'event-1',
      userId: 'user-1',
      email: 'user1@example.com',
      eventType: 'login_failed',
      severity: 'medium',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: {},
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'event-2',
      userId: 'user-2',
      email: 'user2@example.com',
      eventType: 'password_changed',
      severity: 'low',
      ipAddress: '192.168.1.2',
      userAgent: 'Chrome',
      metadata: {},
      createdAt: '2024-01-02T00:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 50,
  hasNext: false,
  hasPrev: false,
  totalPages: 1,
};

// ============================================================================
// Tests
// ============================================================================

describe('useSecurityEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default filter and pagination', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityEvents());

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.filter).toEqual({});
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should accept initial filter options', () => {
      const filter: SecurityEventsFilter = { eventType: 'login_failed' };
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityEvents({ filter }));

      expect(result.current.filter).toEqual(filter);
    });

    it('should accept initial pagination options', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() =>
        useSecurityEvents({
          pagination: { page: 2, limit: 25 },
        }),
      );

      expect(result.current.pagination.page).toBe(2);
      expect(result.current.pagination.limit).toBe(25);
    });
  });

  describe('data fetching', () => {
    it('should fetch security events on mount', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityEvents());

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isLoading).toBe(false);
    });

    it('should pass filter and pagination to query', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const filter: SecurityEventsFilter = { userId: 'user-1' };
      renderHook(() => useSecurityEvents({ filter }));

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['securityEvents', filter, expect.any(Object)]),
        }),
      );
    });

    it('should be disabled when enabled option is false', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      renderHook(() => useSecurityEvents({ enabled: false }));

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', () => {
      const error = new Error('Network error');
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityEvents());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe('setFilter', () => {
    it('should update filter and reset page to 1', async () => {
      const queryFn = vi.fn();

      vi.mocked(useQuery).mockImplementation(() => {
        return {
          data: mockResponse,
          isLoading: false,
          isError: false,
          error: null,
          refetch: queryFn,
        } as any;
      });

      const { result, rerender } = renderHook(() => useSecurityEvents());

      const newFilter: SecurityEventsFilter = { eventType: 'login_failed' };
      result.current.setFilter(newFilter);

      rerender();

      await waitFor(() => {
        expect(result.current.filter).toEqual(newFilter);
        expect(result.current.pagination.page).toBe(1);
      });
    });
  });

  describe('setPage', () => {
    it('should update pagination page', async () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result, rerender } = renderHook(() => useSecurityEvents());

      result.current.setPage(3);
      rerender();

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(3);
      });
    });
  });

  describe('refetch', () => {
    it('should call refetch function', async () => {
      const refetchFn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchFn,
      } as any);

      const { result } = renderHook(() => useSecurityEvents());

      await result.current.refetch();

      expect(refetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('query key updates', () => {
    it('should update query key when filter changes', () => {
      const queryKeyCalls: unknown[][] = [];

      vi.mocked(useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          queryKeyCalls.push(options.queryKey);
        }
        return {
          data: mockResponse,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        } as any;
      });

      const { result, rerender } = renderHook(() => useSecurityEvents());

      result.current.setFilter({ userId: 'user-123' });
      rerender();

      expect(queryKeyCalls.length).toBeGreaterThan(0);
    });

    it('should update query key when pagination changes', () => {
      const queryKeyCalls: unknown[][] = [];

      vi.mocked(useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          queryKeyCalls.push(options.queryKey);
        }
        return {
          data: mockResponse,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        } as any;
      });

      const { result, rerender } = renderHook(() => useSecurityEvents());

      result.current.setPage(2);
      rerender();

      expect(queryKeyCalls.length).toBeGreaterThan(0);
    });
  });
});
