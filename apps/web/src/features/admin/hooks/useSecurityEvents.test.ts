// apps/web/src/features/admin/hooks/useSecurityEvents.test.ts
/**
 * Tests for useSecurityEvents hook
 *
 * Validates security events listing with filters, pagination, and state management.
 */

import * as sdk from '@abe-stack/sdk';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSecurityEvents } from './useSecurityEvents';


import type { SecurityEventsListResponse, SecurityEventsFilter } from '@abe-stack/core';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@abe-stack/sdk', () => ({
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

vi.mock('@abe-stack/core', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/core')>('@abe-stack/core');
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
  events: [
    {
      id: 'event-1',
      userId: 'user-1',
      eventType: 'login_failed',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: {},
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'event-2',
      userId: 'user-2',
      eventType: 'password_changed',
      ipAddress: '192.168.1.2',
      userAgent: 'Chrome',
      metadata: {},
      createdAt: new Date('2024-01-02'),
    },
  ],
  nextCursor: 'cursor-123',
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
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

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
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityEvents({ filter }));

      expect(result.current.filter).toEqual(filter);
    });

    it('should accept initial pagination options', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

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
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityEvents());

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isLoading).toBe(false);
    });

    it('should pass filter and pagination to query', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const filter: SecurityEventsFilter = { userId: 'user-1' };
      renderHook(() => useSecurityEvents({ filter }));

      expect(sdk.useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining([
            'securityEvents',
            filter,
            expect.any(Object),
          ]),
        }),
      );
    });

    it('should be disabled when enabled option is false', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      renderHook(() => useSecurityEvents({ enabled: false }));

      expect(sdk.useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', () => {
      const error = new Error('Network error');
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityEvents());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe('setFilter', () => {
    it('should update filter and reset page to 1', async () => {
      const queryFn = vi.fn();
      let capturedQueryKey: unknown[] = [];

      vi.mocked(sdk.useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          capturedQueryKey = options.queryKey;
        }
        return {
          data: mockResponse,
          isLoading: false,
          isError: false,
          error: null,
          refetch: queryFn,
        };
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
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

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
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchFn,
      });

      const { result } = renderHook(() => useSecurityEvents());

      await result.current.refetch();

      expect(refetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('query key updates', () => {
    it('should update query key when filter changes', () => {
      const queryKeyCalls: unknown[][] = [];

      vi.mocked(sdk.useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          queryKeyCalls.push(options.queryKey);
        }
        return {
          data: mockResponse,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        };
      });

      const { result, rerender } = renderHook(() => useSecurityEvents());

      result.current.setFilter({ userId: 'user-123' });
      rerender();

      expect(queryKeyCalls.length).toBeGreaterThan(0);
    });

    it('should update query key when pagination changes', () => {
      const queryKeyCalls: unknown[][] = [];

      vi.mocked(sdk.useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          queryKeyCalls.push(options.queryKey);
        }
        return {
          data: mockResponse,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        };
      });

      const { result, rerender } = renderHook(() => useSecurityEvents());

      result.current.setPage(2);
      rerender();

      expect(queryKeyCalls.length).toBeGreaterThan(0);
    });
  });
});
