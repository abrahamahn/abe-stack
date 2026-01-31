// apps/web/src/features/admin/hooks/useSecurityEvent.test.ts
import { useQuery } from '@abe-stack/client';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminApiClient } from '../services/adminApi';

import { useSecurityEvent } from './useSecurityEvent';

import type { SecurityEvent } from '@abe-stack/core';
import type { UseQueryResult } from '@abe-stack/client';
import type { AdminApiClient } from '../services/adminApi';

vi.mock('@abe-stack/client', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

vi.mock('@abe-stack/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...actual,
    tokenStore: {
      get: vi.fn().mockReturnValue('mock-token'),
    },
  };
});

describe('useSecurityEvent', () => {
  const mockSecurityEvent: SecurityEvent = {
    id: 'event-123',
    type: 'login_failed',
    userId: 'user-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date().toISOString(),
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should fetch security event by id', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockSecurityEvent,
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
      getSecurityEvent: vi.fn().mockResolvedValue(mockSecurityEvent),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useSecurityEvent('event-123'));

    expect(result.current.data).toEqual(mockSecurityEvent);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should disable query when id is undefined', () => {
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
      getSecurityEvent: vi.fn(),
    } as unknown as AdminApiClient);

    renderHook(() => useSecurityEvent(undefined));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['securityEvent', undefined],
      }),
    );
  });

  test('should disable query when id is empty string', () => {
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
      getSecurityEvent: vi.fn(),
    } as unknown as AdminApiClient);

    renderHook(() => useSecurityEvent(''));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['securityEvent', ''],
      }),
    );
  });

  test('should disable query when enabled option is false', () => {
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
      getSecurityEvent: vi.fn(),
    } as unknown as AdminApiClient);

    renderHook(() => useSecurityEvent('event-123', { enabled: false }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  test('should return error state when fetch fails', () => {
    const mockError = new Error('Failed to fetch security event');
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
      getSecurityEvent: vi.fn().mockRejectedValue(mockError),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useSecurityEvent('event-123'));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  test('should return loading state', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch,
      isFetching: true,
      isSuccess: false,
      isPending: true,
      isStale: false,
      failureCount: 0,
      status: 'pending',
      fetchStatus: 'fetching',
    } as unknown as UseQueryResult);

    vi.mocked(createAdminApiClient).mockReturnValue({
      getSecurityEvent: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useSecurityEvent('event-123'));

    expect(result.current.isLoading).toBe(true);
  });

  test('should call refetch', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockSecurityEvent,
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
      getSecurityEvent: vi.fn().mockResolvedValue(mockSecurityEvent),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useSecurityEvent('event-123'));

    await result.current.refetch();

    expect(refetch).toHaveBeenCalled();
  });

  test('should use correct query key', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: mockSecurityEvent,
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
      getSecurityEvent: vi.fn().mockResolvedValue(mockSecurityEvent),
    } as unknown as AdminApiClient);

    renderHook(() => useSecurityEvent('event-123'));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['securityEvent', 'event-123'],
      }),
    );
  });
});
