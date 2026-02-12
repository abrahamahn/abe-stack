// src/apps/web/src/features/activities/hooks/useActivities.test.ts
import { useQuery } from '@abe-stack/client-engine';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createActivitiesApi } from '../api/activitiesApi';

import { useActivities, useTenantActivities } from './useActivities';

import type { UseQueryResult } from '@abe-stack/client-engine';

vi.mock('@abe-stack/client-engine', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../api/activitiesApi', () => ({
  createActivitiesApi: vi.fn(),
}));

describe('useActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createActivitiesApi).mockReturnValue({
      listActivities: vi.fn(),
      listTenantActivities: vi.fn(),
    } as unknown as ReturnType<typeof createActivitiesApi>);
  });

  test('should return activities data', () => {
    const mockActivities = [
      {
        id: 'act-1',
        tenantId: null,
        actorId: 'user-1',
        actorType: 'user' as const,
        action: 'created',
        resourceType: 'project',
        resourceId: 'proj-1',
        description: 'Created a new project',
        metadata: {},
        ipAddress: '127.0.0.1',
        createdAt: '2026-02-11T10:00:00Z',
      },
    ];

    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useQuery).mockReturnValue({
      data: { activities: mockActivities },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useActivities());

    expect(result.current.activities).toEqual(mockActivities);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  test('should return empty array when no data', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useActivities());

    expect(result.current.activities).toEqual([]);
  });

  test('should return loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useActivities());

    expect(result.current.isLoading).toBe(true);
  });

  test('should pass limit to query key', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    renderHook(() => useActivities({ limit: 10 }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['activities', 10],
      }),
    );
  });
});

describe('useTenantActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createActivitiesApi).mockReturnValue({
      listActivities: vi.fn(),
      listTenantActivities: vi.fn(),
    } as unknown as ReturnType<typeof createActivitiesApi>);
  });

  test('should pass tenantId to query key', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    renderHook(() => useTenantActivities({ tenantId: 'tenant-1' }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tenantActivities', 'tenant-1', 50],
      }),
    );
  });

  test('should return activities data', () => {
    const mockActivities = [
      {
        id: 'act-2',
        tenantId: 'tenant-1',
        actorId: 'user-2',
        actorType: 'user' as const,
        action: 'updated',
        resourceType: 'document',
        resourceId: 'doc-1',
        description: null,
        metadata: {},
        ipAddress: null,
        createdAt: '2026-02-11T09:00:00Z',
      },
    ];

    vi.mocked(useQuery).mockReturnValue({
      data: { activities: mockActivities },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useTenantActivities({ tenantId: 'tenant-1' }));

    expect(result.current.activities).toEqual(mockActivities);
  });
});
