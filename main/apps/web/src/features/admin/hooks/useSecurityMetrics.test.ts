// main/apps/web/src/features/admin/hooks/useSecurityMetrics.test.ts
/**
 * Tests for useSecurityMetrics hook
 *
 * Validates security metrics fetching with period selection and state management.
 */

import { useQuery } from '@bslt/react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSecurityMetrics } from './useSecurityMetrics';

import type { MetricsPeriod } from './useSecurityMetrics';
import type { SecurityMetrics } from '@bslt/shared';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@bslt/react', () => ({
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

vi.mock('@bslt/shared', async () => {
  const actual = await vi.importActual<typeof import('@bslt/shared')>('@bslt/shared');
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
  periodStart: '2024-01-01T00:00:00Z',
  periodEnd: '2024-01-01T23:59:59Z',
} as any;

// ============================================================================
// Tests
// ============================================================================

describe('useSecurityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default period "day"', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.period).toBe('day');
      expect(result.current.isLoading).toBe(true);
    });

    it('should accept initial period option', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityMetrics({ period: 'week' }));

      expect(result.current.period).toBe('week');
    });

    it('should be enabled by default', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      renderHook(() => useSecurityMetrics());

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        }),
      );
    });
  });

  describe('data fetching', () => {
    it('should fetch metrics on mount', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.data).toEqual(mockMetrics);
      expect(result.current.isLoading).toBe(false);
    });

    it('should pass period to query', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      renderHook(() => useSecurityMetrics({ period: 'month' }));

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['securityMetrics', 'month'],
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

      renderHook(() => useSecurityMetrics({ enabled: false }));

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', () => {
      const error = new Error('Failed to fetch metrics');
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe('setPeriod', () => {
    it('should update period state', async () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result, rerender } = renderHook(() => useSecurityMetrics());

      result.current.setPeriod('week');
      rerender();

      await waitFor(() => {
        expect(result.current.period).toBe('week');
      });
    });

    it('should accept all valid period values', async () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

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
      vi.mocked(useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchFn,
      } as any);

      const { result } = renderHook(() => useSecurityMetrics());

      await result.current.refetch();

      expect(refetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('query key updates', () => {
    it('should update query key when period changes', () => {
      const queryKeyCalls: unknown[][] = [];

      vi.mocked(useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          queryKeyCalls.push(options.queryKey);
        }
        return {
          data: mockMetrics,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        } as any;
      });

      const { result, rerender } = renderHook(() => useSecurityMetrics());

      const initialCallCount = queryKeyCalls.length;

      result.current.setPeriod('month');
      rerender();

      expect(queryKeyCalls.length).toBeGreaterThan(initialCallCount);
    });

    it('should include period in query key', () => {
      let capturedQueryKey: unknown[] = [];

      vi.mocked(useQuery).mockImplementation((options) => {
        if (typeof options.queryKey === 'object' && Array.isArray(options.queryKey)) {
          capturedQueryKey = options.queryKey;
        }
        return {
          data: mockMetrics,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn().mockResolvedValue(undefined),
        } as any;
      });

      renderHook(() => useSecurityMetrics({ period: 'hour' }));

      expect(capturedQueryKey).toEqual(['securityMetrics', 'hour']);
    });
  });

  describe('loading state', () => {
    it('should be true while fetching', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should be false after successful fetch', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockMetrics,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { result } = renderHook(() => useSecurityMetrics());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockMetrics);
    });
  });
});
