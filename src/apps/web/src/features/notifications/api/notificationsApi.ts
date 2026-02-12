// src/apps/web/src/features/notifications/api/notificationsApi.ts
/**
 * Notifications API Client
 *
 * API functions for in-app notification operations:
 * list, mark-read, mark-all-read, and delete.
 */

import { createApiError, NetworkError } from '@abe-stack/client-engine';
import { addAuthHeader, API_PREFIX, trimTrailingSlashes } from '@abe-stack/shared';

import type { Notification } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface NotificationsApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface NotificationsListResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface MarkReadResponse {
  message: string;
  count: number;
}

export interface DeleteNotificationResponse {
  message: string;
}

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
  const baseUrl = trimTrailingSlashes(config.baseUrl);
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    addAuthHeader(headers, config.getToken?.());

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error: unknown) {
      throw new NetworkError(
        `Failed to fetch ${options?.method ?? 'GET'} ${path}`,
        error instanceof Error ? error : undefined,
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data as { message?: string; code?: string });
    }

    return data as T;
  };

  return {
    async list(limit = 20, offset = 0): Promise<NotificationsListResponse> {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      return request<NotificationsListResponse>(`/notifications/list?${params.toString()}`);
    },

    async markRead(ids: string[]): Promise<MarkReadResponse> {
      return request<MarkReadResponse>('/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    },

    async markAllRead(): Promise<MarkReadResponse> {
      return request<MarkReadResponse>('/notifications/mark-all-read', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async deleteNotification(id: string): Promise<DeleteNotificationResponse> {
      return request<DeleteNotificationResponse>('/notifications/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    },
  };
}
