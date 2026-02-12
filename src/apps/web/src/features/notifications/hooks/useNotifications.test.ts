// src/apps/web/src/features/notifications/hooks/useNotifications.test.ts
import { useMutation, useQuery } from '@abe-stack/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useNotifications } from './useNotifications';

import type { UseQueryResult } from '@abe-stack/react';

vi.mock('@abe-stack/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('../api/notificationsApi', () => ({
  createNotificationsApi: vi.fn(() => ({
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    deleteNotification: vi.fn(),
  })),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({ config: { apiUrl: 'http://localhost:3000' } }),
}));

vi.mock('@abe-stack/shared', () => ({
  tokenStore: { get: () => 'mock-token' },
}));

const defaultMutation = {
  mutate: vi.fn(),
  status: 'idle' as const,
  data: undefined,
  error: null,
  reset: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  isIdle: true,
  isLoading: false,
  mutateAsync: vi.fn(),
  variables: undefined,
  failureCount: 0,
  failureReason: null,
  submittedAt: 0,
  context: undefined,
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue(defaultMutation);
  });

  test('should return notifications data', () => {
    const mockData = {
      notifications: [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'info',
          title: 'Test',
          message: 'Test message',
          isRead: false,
          createdAt: '2026-02-11T10:00:00Z',
        },
      ],
      unreadCount: 1,
    };

    vi.mocked(useQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      isFetching: false,
      isSuccess: true,
      isPending: false,
      isStale: false,
      failureCount: 0,
      status: 'success',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult);

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual(mockData.notifications);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
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

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
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

    const { result } = renderHook(() => useNotifications());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  test('should pass limit to query key', () => {
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

    renderHook(() => useNotifications({ limit: 50 }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['notifications', 50],
      }),
    );
  });

  test('should expose mutation action functions', () => {
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

    const { result } = renderHook(() => useNotifications());

    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
    expect(typeof result.current.deleteNotification).toBe('function');
  });

  test('should report mutation loading states', () => {
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

    vi.mocked(useMutation)
      .mockReturnValueOnce({ ...defaultMutation, status: 'pending' as const, isLoading: true })
      .mockReturnValueOnce(defaultMutation)
      .mockReturnValueOnce(defaultMutation);

    const { result } = renderHook(() => useNotifications());

    expect(result.current.isMarkingRead).toBe(true);
    expect(result.current.isMarkingAllRead).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });
});
