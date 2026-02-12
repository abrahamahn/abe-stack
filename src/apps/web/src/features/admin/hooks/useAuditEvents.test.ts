// src/apps/web/src/features/admin/hooks/useAuditEvents.test.ts
import { useQuery } from '@abe-stack/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminApiClient } from './../services/adminApi';
import { useAuditEvents } from './useAuditEvents';

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

describe('useAuditEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return audit events data', () => {
    const mockData = {
      events: [
        {
          id: '1',
          tenantId: null,
          actorId: 'user-1',
          action: 'user.login',
          category: 'security',
          severity: 'info',
          resource: 'auth',
          resourceId: null,
          metadata: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          createdAt: '2026-02-11T10:00:00Z',
        },
      ],
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
      listAuditEvents: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useAuditEvents());

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
      listAuditEvents: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useAuditEvents());

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  test('should pass filter to query key', () => {
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
      listAuditEvents: vi.fn(),
    } as unknown as AdminApiClient);

    const filter = { action: 'user.login', limit: 50 };
    renderHook(() => useAuditEvents({ filter }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['auditEvents', filter],
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
      listAuditEvents: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useAuditEvents());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });
});
