// apps/web/src/features/admin/hooks/useJobDetails.test.ts
import { useQuery } from '@abe-stack/engine';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminApiClient } from './../services/adminApi';
import { useJobDetails } from './useJobDetails';

import type { AdminApiClient } from './../services/adminApi';
import type { UseQueryResult } from '@abe-stack/engine';

vi.mock('@abe-stack/engine', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

describe('useJobDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return query result state', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: { id: 'job-123' },
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
      getJobDetails: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobDetails('job-123'));

    expect(result.current.data).toEqual({ id: 'job-123' });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.refetch).toBe(refetch);
  });

  test('should pass enabled false when jobId is undefined', () => {
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
      getJobDetails: vi.fn(),
    } as unknown as AdminApiClient);

    renderHook(() => useJobDetails(undefined));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['job', undefined],
      }),
    );
  });
});
