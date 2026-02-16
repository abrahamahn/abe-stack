// main/apps/web/src/features/admin/hooks/useJobsList.test.ts
import { useQuery } from '@abe-stack/react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi, beforeEach } from 'vitest';

import { createAdminApiClient } from '../services/adminApi';

import { useJobsList } from './useJobsList';

import type { AdminApiClient } from '../services/adminApi';
import type { UseQueryResult } from '@abe-stack/react';
import type { JobListResponse } from '@abe-stack/shared';

vi.mock('@abe-stack/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    tokenStore: {
      get: vi.fn().mockReturnValue('mock-token'),
    },
  };
});

describe('useJobsList', () => {
  const mockJobsResponse: JobListResponse = {
    data: [
      {
        id: 'job-1',
        name: 'test-job',
        status: 'completed',
        createdAt: new Date().toISOString(),
        args: {},
        attempts: 0,
        maxAttempts: 5,
        scheduledAt: new Date().toISOString(),
        completedAt: null,
        durationMs: null,
        error: null,
        deadLetterReason: null,
      },
      {
        id: 'job-2',
        name: 'test-job-2',
        status: 'failed',
        createdAt: new Date().toISOString(),
        args: {},
        attempts: 1,
        maxAttempts: 5,
        scheduledAt: new Date().toISOString(),
        completedAt: null,
        durationMs: null,
        error: null,
        deadLetterReason: null,
      },
    ],
    total: 2,
    page: 1,
    limit: 50,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should fetch jobs list with default pagination', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobsList());

    expect(result.current.data).toEqual(mockJobsResponse);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.pagination).toEqual({
      page: 1,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  test('should accept custom pagination options', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() =>
      useJobsList({
        pagination: { page: 2, limit: 25, sortBy: 'scheduledAt', sortOrder: 'asc' },
      }),
    );

    expect(result.current.pagination).toEqual({
      page: 2,
      limit: 25,
      sortBy: 'scheduledAt',
      sortOrder: 'asc',
    });
  });

  test('should filter jobs by status', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() =>
      useJobsList({
        filter: { status: 'failed' },
      }),
    );

    expect(result.current.filter).toEqual({ status: 'failed' });
  });

  test('should filter jobs by name', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() =>
      useJobsList({
        filter: { name: 'test-job' },
      }),
    );

    expect(result.current.filter).toEqual({ name: 'test-job' });
  });

  test('should update page number', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobsList());

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.pagination.page).toBe(3);
  });

  test('should update filter and reset page to 1', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobsList({ pagination: { page: 3 } }));

    act(() => {
      result.current.setFilter({ status: 'completed' });
    });

    expect(result.current.filter).toEqual({ status: 'completed' });
    expect(result.current.pagination.page).toBe(1);
  });

  test('should update status filter and reset page to 1', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobsList({ pagination: { page: 2 } }));

    act(() => {
      result.current.setStatus('failed');
    });

    expect(result.current.filter.status).toBe('failed');
    expect(result.current.pagination.page).toBe(1);
  });

  test('should disable query when enabled is false', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
      isFetching: false,
      isSuccess: false,
      isPending: false,
      isStale: false,
      failureCount: 0,
      status: 'idle',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      listJobs: vi.fn(),
    } as unknown as AdminApiClient);

    renderHook(() => useJobsList({ enabled: false }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  test('should return error state', () => {
    const mockError = new Error('Failed to fetch jobs');
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      refetch,
      isFetching: false,
      isSuccess: false,
      isPending: false,
      isStale: false,
      failureCount: 1,
      status: 'error',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      listJobs: vi.fn().mockRejectedValue(mockError),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobsList());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  test('should call refetch', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockJobsResponse,
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
      listJobs: vi.fn().mockResolvedValue(mockJobsResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobsList());

    await result.current.refetch();

    expect(refetch).toHaveBeenCalled();
  });
});
