// main/apps/web/src/features/admin/hooks/useFeatureFlags.test.ts
import { useMutation, useQuery } from '@abe-stack/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import { createAdminApiClient } from '../services/adminApi';

import {
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
} from './useFeatureFlags';

import type { UseMutationResult, UseQueryResult } from '@abe-stack/react';

vi.mock('@abe-stack/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('../services/adminApi', () => ({
  createAdminApiClient: vi.fn(),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

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

describe('useFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdminApiClient).mockReturnValue({
      listFeatureFlags: vi.fn(),
    } as unknown as ReturnType<typeof createAdminApiClient>);
  });

  test('should return feature flags data', () => {
    const mockData = {
      flags: [
        {
          key: 'billing.seat_based',
          description: 'Enable seat-based billing',
          isEnabled: true,
          defaultValue: null,
          metadata: {},
          createdAt: '2026-02-11T10:00:00Z',
          updatedAt: '2026-02-11T10:00:00Z',
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
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlags());

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  test('should return loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlags());

    expect(result.current.isLoading).toBe(true);
  });

  test('should return error state', () => {
    const mockError = new Error('Forbidden');
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useFeatureFlags());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });
});

describe('useCreateFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdminApiClient).mockReturnValue({
      createFeatureFlag: vi.fn(),
    } as unknown as ReturnType<typeof createAdminApiClient>);
  });

  test('should expose createFlag and status', () => {
    const mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue(mockMutationReturn({ mutate: mutateFn }));

    const { result } = renderHook(() => useCreateFeatureFlag());

    expect(result.current.createFlag).toBe(mutateFn);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});

describe('useUpdateFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdminApiClient).mockReturnValue({
      updateFeatureFlag: vi.fn(),
    } as unknown as ReturnType<typeof createAdminApiClient>);
  });

  test('should expose updateFlag and status', () => {
    const mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue(mockMutationReturn({ mutate: mutateFn }));

    const { result } = renderHook(() => useUpdateFeatureFlag());

    expect(result.current.updateFlag).toBe(mutateFn);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});

describe('useDeleteFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdminApiClient).mockReturnValue({
      deleteFeatureFlag: vi.fn(),
    } as unknown as ReturnType<typeof createAdminApiClient>);
  });

  test('should expose deleteFlag and status', () => {
    const mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue(mockMutationReturn({ mutate: mutateFn }));

    const { result } = renderHook(() => useDeleteFeatureFlag());

    expect(result.current.deleteFlag).toBe(mutateFn);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
