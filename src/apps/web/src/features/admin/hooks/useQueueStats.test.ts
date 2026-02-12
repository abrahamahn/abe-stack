// src/apps/web/src/features/admin/hooks/useQueueStats.test.ts
import { useQuery } from '@abe-stack/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminApiClient } from './../services/adminApi';
import { useQueueStats } from './useQueueStats';

import type { AdminApiClient } from './../services/adminApi';
import type { UseQueryResult } from '@abe-stack/react';

vi.mock('@abe-stack/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

describe('useQueueStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return query result state', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: { waiting: 1, active: 2, completed: 3, failed: 0, delayed: 0, paused: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
      isFetching: false,
      isSuccess: true,
      isPending: false,
      isStale: false,
      failureCount: 0,
      status: 'success',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      getQueueStats: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useQueueStats());

    expect(result.current.data).toEqual({
      waiting: 1,
      active: 2,
      completed: 3,
      failed: 0,
      delayed: 0,
      paused: 0,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.refetch).toBe(refetch);
  });

  test('should pass enabled false when option disabled', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      isFetching: false,
      isSuccess: false,
      isPending: false,
      isStale: false,
      failureCount: 0,
      status: 'idle',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      getQueueStats: vi.fn(),
    } as unknown as AdminApiClient);

    renderHook(() => useQueueStats({ enabled: false }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['queueStats'],
      }),
    );
  });
});
