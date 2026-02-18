// main/apps/web/src/features/admin/hooks/useRouteManifest.test.ts
import { useQuery } from '@bslt/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminApiClient } from './../services/adminApi';
import { useRouteManifest } from './useRouteManifest';

import type { AdminApiClient } from './../services/adminApi';
import type { UseQueryResult } from '@bslt/react';

vi.mock('@bslt/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

describe('useRouteManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return route manifest data', () => {
    const mockData = {
      routes: [
        {
          path: '/api/auth/login',
          method: 'POST',
          isPublic: true,
          roles: [],
          hasSchema: true,
          module: 'auth',
        },
        {
          path: '/api/users/me',
          method: 'GET',
          isPublic: false,
          roles: [],
          hasSchema: false,
          module: 'users',
        },
      ],
      count: 2,
    };

    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockData,
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
      getRouteManifest: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useRouteManifest());

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.refetch).toBe(refetch);
  });

  test('should return loading state initially', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      isFetching: true,
      isSuccess: false,
      isPending: true,
      isStale: false,
      failureCount: 0,
      status: 'pending',
      fetchStatus: 'fetching',
    } as unknown as UseQueryResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      getRouteManifest: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useRouteManifest());

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
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
      getRouteManifest: vi.fn(),
    } as unknown as AdminApiClient);

    renderHook(() => useRouteManifest({ enabled: false }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['routeManifest'],
      }),
    );
  });

  test('should return error state on failure', () => {
    const mockError = new Error('Network error');
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      refetch: vi.fn().mockResolvedValue(undefined),
      isFetching: false,
      isSuccess: false,
      isPending: false,
      isStale: false,
      failureCount: 1,
      status: 'error',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      getRouteManifest: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useRouteManifest());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });
});
