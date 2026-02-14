// main/apps/web/src/features/notifications/api/notificationsApi.ts
/**
 * Notifications API Client
 *
 * API functions for in-app notification operations:
 * list, mark-read, mark-all-read, and delete.
 */

import { createNotificationClient } from '@abe-stack/api';

import type {
  BaseClientConfig,
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationsListResponse,
} from '@abe-stack/api';

// ============================================================================
// Types
// ============================================================================

export type NotificationsApiConfig = BaseClientConfig;

export interface NotificationsApi {
  list: (limit?: number, offset?: number) => Promise<NotificationsListResponse>;
  markRead: (ids: string[]) => Promise<MarkReadResponse>;
  markAllRead: () => Promise<MarkReadResponse>;
  deleteNotification: (id: string) => Promise<DeleteNotificationResponse>;
}

// ============================================================================
// API Client
// ============================================================================

export function createNotificationsApi(config: NotificationsApiConfig): NotificationsApi {
  const client = createNotificationClient(config);

  return {
    async list(limit = 20, offset = 0): Promise<NotificationsListResponse> {
      return client.listNotifications(limit, offset);
    },

    async markRead(ids: string[]): Promise<MarkReadResponse> {
      return client.markRead(ids);
    },

    async markAllRead(): Promise<MarkReadResponse> {
      return client.markAllRead();
    },

    async deleteNotification(id: string): Promise<DeleteNotificationResponse> {
      return client.deleteNotification(id);
    },
  };
}

export type {
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationsListResponse,
} from '@abe-stack/api';
