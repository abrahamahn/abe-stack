// main/apps/web/src/features/admin/hooks/useFeatureFlag.test.ts
import { useQuery } from '@bslt/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useFeatureFlag } from './useFeatureFlag';

import type { UseQueryResult } from '@bslt/react';

vi.mock('@bslt/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

// ============================================================================
// useFeatureFlag
// ============================================================================

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return enabled=true when flag is enabled in response', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        flags: {
          'billing.seats': true,
          'beta.feature': false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlag('billing.seats'));

    expect(result.current.enabled).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test('should return enabled=false when flag is disabled in response', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        flags: {
          'billing.seats': true,
          'beta.feature': false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlag('beta.feature'));

    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  test('should return enabled=false when flag key is not in response', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        flags: {
          'billing.seats': true,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlag('nonexistent.flag'));

    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  test('should return loading=true while query is pending', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlag('billing.seats'));

    expect(result.current.loading).toBe(true);
    expect(result.current.enabled).toBe(false);
  });

  test('should default to enabled=false on error', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlag('billing.seats'));

    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  test('should include tenantId in query key when provided', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { flags: {} },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    renderHook(() => useFeatureFlag('billing.seats', { tenantId: 'tenant-1' }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['featureFlagEval', 'tenant-1'],
      }),
    );
  });

  test('should use base query key when no tenantId provided', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { flags: {} },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    renderHook(() => useFeatureFlag('billing.seats'));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['featureFlagEval'],
      }),
    );
  });

  test('should disable query when enabled option is false', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    renderHook(() => useFeatureFlag('billing.seats', { enabled: false }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
