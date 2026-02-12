// src/apps/web/src/features/settings/hooks/useApiKeys.test.ts
import { useMutation, useQuery } from '@abe-stack/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createSettingsApi } from '../api';

import { useApiKeys, useCreateApiKey, useDeleteApiKey, useRevokeApiKey } from './useApiKeys';

import type { UseMutationResult, UseQueryResult } from '@abe-stack/react';

vi.mock('@abe-stack/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('../api', () => ({
  createSettingsApi: vi.fn(),
}));

const mockSettingsApi = () => {
  vi.mocked(createSettingsApi).mockReturnValue({
    listApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
  } as unknown as ReturnType<typeof createSettingsApi>);
};

const mockMutationReturn = (overrides?: Partial<UseMutationResult<unknown, unknown, unknown>>) =>
  ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    status: 'idle',
    error: null,
    data: undefined,
    reset: vi.fn(),
    isLoading: false,
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    failureCount: 0,
    ...overrides,
  }) as unknown as UseMutationResult<unknown, unknown, unknown>;

describe('useApiKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsApi();
  });

  test('should return api keys data', () => {
    const mockKeys = [
      {
        id: 'key-1',
        tenantId: null,
        userId: 'user-1',
        name: 'CI Key',
        keyPrefix: 'abe_k1',
        scopes: [],
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        createdAt: '2026-02-11T10:00:00Z',
        updatedAt: '2026-02-11T10:00:00Z',
      },
    ];

    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: { apiKeys: mockKeys },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useApiKeys());

    expect(result.current.apiKeys).toEqual(mockKeys);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.refetch).toBe(refetch);
  });

  test('should return empty array when no data', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useApiKeys());

    expect(result.current.apiKeys).toEqual([]);
  });

  test('should return loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useApiKeys());

    expect(result.current.isLoading).toBe(true);
  });

  test('should return error state', () => {
    const mockError = new Error('Network error');
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useApiKeys());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });
});

describe('useCreateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsApi();
  });

  test('should expose createKey and status', () => {
    const mutateFn = vi.fn();
    const resetFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue(
      mockMutationReturn({ mutate: mutateFn, reset: resetFn }),
    );

    const { result } = renderHook(() => useCreateApiKey());

    expect(result.current.createKey).toBe(mutateFn);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
    expect(result.current.reset).toBe(resetFn);
  });

  test('should report pending status as loading', () => {
    vi.mocked(useMutation).mockReturnValue(mockMutationReturn({ status: 'pending' }));

    const { result } = renderHook(() => useCreateApiKey());

    expect(result.current.isLoading).toBe(true);
  });

  test('should call onSuccess callback', () => {
    let capturedOnSuccess: ((response: unknown) => void) | undefined;
    vi.mocked(useMutation).mockImplementation(((opts: Record<string, unknown>) => {
      capturedOnSuccess = opts['onSuccess'] as typeof capturedOnSuccess;
      return mockMutationReturn();
    }) as unknown as typeof useMutation);

    const onSuccess = vi.fn();
    renderHook(() => useCreateApiKey({ onSuccess }));

    const mockResponse = { apiKey: { id: 'key-1' }, plaintext: 'abe_test123' };
    capturedOnSuccess?.(mockResponse);

    expect(onSuccess).toHaveBeenCalledWith(mockResponse);
  });
});

describe('useRevokeApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsApi();
  });

  test('should expose revokeKey and status', () => {
    const mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue(mockMutationReturn({ mutate: mutateFn }));

    const { result } = renderHook(() => useRevokeApiKey());

    expect(result.current.revokeKey).toBe(mutateFn);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useDeleteApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsApi();
  });

  test('should expose deleteKey and status', () => {
    const mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue(mockMutationReturn({ mutate: mutateFn }));

    const { result } = renderHook(() => useDeleteApiKey());

    expect(result.current.deleteKey).toBe(mutateFn);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should call onSuccess callback', () => {
    let capturedOnSuccess: (() => void) | undefined;
    vi.mocked(useMutation).mockImplementation(((opts: Record<string, unknown>) => {
      capturedOnSuccess = opts['onSuccess'] as typeof capturedOnSuccess;
      return mockMutationReturn();
    }) as unknown as typeof useMutation);

    const onSuccess = vi.fn();
    renderHook(() => useDeleteApiKey({ onSuccess }));

    capturedOnSuccess?.();

    expect(onSuccess).toHaveBeenCalled();
  });
});
