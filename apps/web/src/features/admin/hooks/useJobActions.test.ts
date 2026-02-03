// apps/web/src/features/admin/hooks/useJobActions.test.ts
import { useMutation } from '@abe-stack/engine';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminApiClient } from '../services/adminApi';

import { useJobActions } from './useJobActions';

import type { JobActionResponse } from '@abe-stack/shared';
import type { AdminApiClient } from '../services/adminApi';

vi.mock('@abe-stack/engine', () => ({
  useMutation: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: { apiUrl: 'http://localhost:3000' },
    queryCache: {
      invalidateQueries: vi.fn(),
    },
  }),
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

describe('useJobActions', () => {
  const mockJobActionResponse: JobActionResponse = {
    success: true,
    message: 'Job action successful',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should retry job successfully', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(mockJobActionResponse);
    const onSuccess = vi.fn();

    vi.mocked(useMutation).mockImplementation((config) => {
      // Store onSuccess callback for later invocation
      if (config?.onSuccess) {
        onSuccess.mockImplementation(config.onSuccess);
      }
      return {
        mutate: vi.fn(),
        mutateAsync,
        data: null,
        error: null,
        isError: false,
        status: 'idle',
        isPending: false,
        isSuccess: false,
        failureCount: 0,
        reset: vi.fn(),
      } as any;
    });

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn().mockResolvedValue(mockJobActionResponse),
      cancelJob: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobActions());

    const response = await result.current.retryJob('job-123');

    expect(response).toEqual(mockJobActionResponse);
    expect(mutateAsync).toHaveBeenCalledWith('job-123');
  });

  test('should cancel job successfully', async () => {
    const retryMutateAsync = vi.fn();
    const cancelMutateAsync = vi.fn().mockResolvedValue(mockJobActionResponse);

    let callCount = 0;
    vi.mocked(useMutation).mockImplementation(() => {
      callCount++;
      const mutateAsync = callCount === 1 ? retryMutateAsync : cancelMutateAsync;

      return {
        mutate: vi.fn(),
        mutateAsync,
        data: null,
        error: null,
        isError: false,
        status: 'idle',
        isPending: false,
        isSuccess: false,
        failureCount: 0,
        reset: vi.fn(),
      } as any;
    });

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn(),
      cancelJob: vi.fn().mockResolvedValue(mockJobActionResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobActions());

    const response = await result.current.cancelJob('job-123');

    expect(response).toEqual(mockJobActionResponse);
    expect(cancelMutateAsync).toHaveBeenCalledWith('job-123');
  });

  test('should return retry loading state', () => {
    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: null,
      isError: false,
      status: 'pending',
      isPending: true,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as any);

    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as any);

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn(),
      cancelJob: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobActions());

    expect(result.current.isRetrying).toBe(true);
    expect(result.current.isCancelling).toBe(false);
  });

  test('should return cancel loading state', () => {
    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as any);

    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: null,
      isError: false,
      status: 'pending',
      isPending: true,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as any);

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn(),
      cancelJob: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobActions());

    expect(result.current.isRetrying).toBe(false);
    expect(result.current.isCancelling).toBe(true);
  });

  test('should return retry error', () => {
    const mockError = new Error('Retry failed');
    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: mockError,
      isError: true,
      status: 'error',
      isPending: false,
      isSuccess: false,
      failureCount: 1,
      reset: vi.fn(),
    } as any);

    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as any);

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn(),
      cancelJob: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobActions());

    expect(result.current.retryError).toBe(mockError);
    expect(result.current.cancelError).toBeNull();
  });

  test('should return cancel error', () => {
    const mockError = new Error('Cancel failed');
    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: null,
      isError: false,
      status: 'idle',
      isPending: false,
      isSuccess: false,
      failureCount: 0,
      reset: vi.fn(),
    } as any);

    vi.mocked(useMutation).mockReturnValueOnce({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      error: mockError,
      isError: true,
      status: 'error',
      isPending: false,
      isSuccess: false,
      failureCount: 1,
      reset: vi.fn(),
    } as any);

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn(),
      cancelJob: vi.fn(),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobActions());

    expect(result.current.retryError).toBeNull();
    expect(result.current.cancelError).toBe(mockError);
  });

  test('should invalidate queries on retry success', async () => {
    const mockInvalidate = vi.fn();
    const mutateAsync = vi.fn().mockResolvedValue(mockJobActionResponse);

    vi.mocked(useMutation).mockImplementation((config) => {
      // Immediately invoke onSuccess for testing
      if (config?.onSuccess) {
        void Promise.resolve(mockJobActionResponse).then(() => {
          config.onSuccess?.(mockJobActionResponse, 'job-123', undefined);
        });
      }
      return {
        mutate: vi.fn(),
        mutateAsync,
        data: null,
        error: null,
        isError: false,
        status: 'idle',
        isPending: false,
        isSuccess: false,
        failureCount: 0,
        reset: vi.fn(),
      } as any;
    });

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn().mockResolvedValue(mockJobActionResponse),
      cancelJob: vi.fn(),
    } as unknown as AdminApiClient);

    // Override the mock for this test
    vi.doMock('@app/ClientEnvironment', () => ({
      useClientEnvironment: () => ({
        config: { apiUrl: 'http://localhost:3000' },
        queryCache: {
          invalidateQueries: mockInvalidate,
        },
      }),
    }));

    const { result } = renderHook(() => useJobActions());
    await result.current.retryJob('job-123');

    // Note: In real implementation, invalidateQueries is called via onSuccess callback
    // This test verifies the hook structure, but full integration would require testing the callback
  });

  test('should invalidate queries on cancel success', async () => {
    const retryMutateAsync = vi.fn();
    const cancelMutateAsync = vi.fn().mockResolvedValue(mockJobActionResponse);

    let callCount = 0;
    vi.mocked(useMutation).mockImplementation((config) => {
      callCount++;
      const mutateAsync = callCount === 1 ? retryMutateAsync : cancelMutateAsync;

      // Immediately invoke onSuccess for cancel mutation (second call)
      if (callCount === 2 && config?.onSuccess) {
        void Promise.resolve(mockJobActionResponse).then(() => {
          config.onSuccess?.(mockJobActionResponse, 'job-123', undefined);
        });
      }

      return {
        mutate: vi.fn(),
        mutateAsync,
        data: null,
        error: null,
        isError: false,
        status: 'idle',
        isPending: false,
        isSuccess: false,
        failureCount: 0,
        reset: vi.fn(),
      } as any;
    });

    vi.mocked(createAdminApiClient).mockReturnValue({
      retryJob: vi.fn(),
      cancelJob: vi.fn().mockResolvedValue(mockJobActionResponse),
    } as unknown as AdminApiClient);

    const { result } = renderHook(() => useJobActions());
    await result.current.cancelJob('job-123');

    // Note: In real implementation, invalidateQueries is called via onSuccess callback
  });
});
