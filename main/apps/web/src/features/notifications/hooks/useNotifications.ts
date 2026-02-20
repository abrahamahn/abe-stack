// main/apps/web/src/features/notifications/hooks/useNotifications.ts
/**
 * useNotifications hook
 *
 * Fetches in-app notifications and provides mutation helpers
 * for marking as read, marking all as read, and deleting.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMutation, useQuery } from '@bslt/react';
import { useCallback, useMemo } from 'react';

import { createNotificationsApi } from '../api/notificationsApi';

import type {
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationsListResponse,
} from '../api/notificationsApi';
import type { Notification } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

export interface UseNotificationsOptions {
  enabled?: boolean;
  limit?: number;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  markAsRead: (ids: string[]) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  isMarkingRead: boolean;
  isMarkingAllRead: boolean;
  isDeleting: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const { config } = useClientEnvironment();
  const limit = options.limit ?? 20;

  const api = useMemo(
    () =>
      createNotificationsApi({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      }),
    [config.apiUrl],
  );

  const queryResult = useQuery<NotificationsListResponse>({
    queryKey: ['notifications', limit],
    queryFn: async (): Promise<NotificationsListResponse> => {
      return api.list(limit);
    },
    enabled: options.enabled !== false,
    staleTime: 15000,
  });

  const markReadMutation = useMutation<MarkReadResponse, Error, string[]>({
    mutationFn: async (ids): Promise<MarkReadResponse> => {
      return api.markRead(ids);
    },
    onSuccess: (): void => {
      void queryResult.refetch();
    },
  });

  const markAllReadMutation = useMutation<MarkReadResponse, Error, undefined>({
    mutationFn: async (): Promise<MarkReadResponse> => {
      return api.markAllRead();
    },
    onSuccess: (): void => {
      void queryResult.refetch();
    },
  });

  const deleteMutation = useMutation<DeleteNotificationResponse, Error, string>({
    mutationFn: async (id): Promise<DeleteNotificationResponse> => {
      return api.deleteNotification(id);
    },
    onSuccess: (): void => {
      void queryResult.refetch();
    },
  });

  const markAsRead = useCallback(
    (ids: string[]): void => {
      markReadMutation.mutate(ids);
    },
    [markReadMutation],
  );

  const markAllAsRead = useCallback((): void => {
    markAllReadMutation.mutate(undefined);
  }, [markAllReadMutation]);

  const deleteNotification = useCallback(
    (id: string): void => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  return {
    notifications: queryResult.data?.notifications ?? [],
    unreadCount: queryResult.data?.unreadCount ?? 0,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingRead: markReadMutation.status === 'pending',
    isMarkingAllRead: markAllReadMutation.status === 'pending',
    isDeleting: deleteMutation.status === 'pending',
  };
}
