// apps/web/src/features/admin/hooks/useSecurityMetrics.test.ts
/**
 * Tests for useSecurityMetrics hook
 *
 * Validates security metrics fetching with period selection and state management.
 */

import * as sdk from '@abe-stack/client';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSecurityMetrics } from './useSecurityMetrics';

import type { MetricsPeriod } from './useSecurityMetrics';
import type { SecurityMetrics } from '@abe-stack/core';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@abe-stack/client', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: { apiUrl: 'http://localhost:3001' },
  }),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(() => ({
    getSecurityMetrics: vi.fn(),
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

const mockMetrics: SecurityMetrics = {
  totalEvents: 1234,
  eventsByType: {
    login_success: 800,
    login_failed: 234,
    password_changed: 100,
    account_locked: 50,
    suspicious_activity: 50,
  },
  topIpAddresses: [
    { ipAddress: '192.168.1.1', count: 100 },
    { ipAddress: '192.168.1.2', count: 80 },
  ],
  topUsers: [
    { userId: 'user-1', count: 50 },
    { userId: 'user-2', count: 40 },
  ],
  period: 'day',
  generatedAt: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('useSecurityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default period "day"', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.period).toBe('day');
      expect(result.current.isLoading).toBe(true);
    });

    it('should accept initial period option', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityMetrics({ period: 'week' }));

      expect(result.current.period).toBe('week');
    });

    it('should be enabled by default', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      renderHook(() => useSecurityMetrics());

      expect(sdk.useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        }),
      );
    });
  });

  describe('data fetching', () => {
    it('should fetch metrics on mount', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.data).toEqual(mockMetrics);
      expect(result.current.isLoading).toBe(false);
    });

    it('should pass period to query', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      renderHook(() => useSecurityMetrics({ period: 'month' }));

      expect(sdk.useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['securityMetrics', 'month'],
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

      renderHook(() => useSecurityMetrics({ enabled: false }));

      expect(sdk.useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', () => {
      const error = new Error('Failed to fetch metrics');
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe('setPeriod', () => {
    it('should update period state', async () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result, rerender } = renderHook(() => useSecurityMetrics());

      result.current.setPeriod('week');
      rerender();

      await waitFor(() => {
        expect(result.current.period).toBe('week');
      });
    });

    it('should accept all valid period values', async () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const periods: MetricsPeriod[] = ['hour', 'day', 'week', 'month'];
      const { result, rerender } = renderHook(() => useSecurityMetrics());

      for (const period of periods) {
        result.current.setPeriod(period);
        rerender();

        await waitFor(() => {
          expect(result.current.period).toBe(period);
        });
      }
    });
  });

  describe('refetch', () => {
    it('should call refetch function', async () => {
      const refetchFn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchFn,
      });

      const { result } = renderHook(() => useSecurityMetrics());

      await result.current.refetch();

      expect(refetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('query key updates', () => {
    it('should update query key when period changes', () => {
      const queryKeyCalls: unknown[][] = [];

      vi.mocked(sdk.useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          queryKeyCalls.push(options.queryKey);
        }
        return {
          data: mockMetrics,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        };
      });

      const { result, rerender } = renderHook(() => useSecurityMetrics());

      const initialCallCount = queryKeyCalls.length;

      result.current.setPeriod('month');
      rerender();

      expect(queryKeyCalls.length).toBeGreaterThan(initialCallCount);
    });

    it('should include period in query key', () => {
      let capturedQueryKey: unknown[] = [];

      vi.mocked(sdk.useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          capturedQueryKey = options.queryKey;
        }
        return {
          data: mockMetrics,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        };
      });

      renderHook(() => useSecurityMetrics({ period: 'hour' }));

      expect(capturedQueryKey).toEqual(['securityMetrics', 'hour']);
    });
  });

  describe('loading state', () => {
    it('should be true while fetching', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should be false after successful fetch', () => {
      vi.mocked(sdk.useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockMetrics);
    });
  });
});
