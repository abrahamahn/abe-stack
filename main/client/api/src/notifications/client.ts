// main/client/api/src/notifications/client.ts
/**
 * Notification API Client
 *
 * Type-safe client for interacting with the push notification API endpoints.
 */

import {
  baseMarkAsReadRequestSchema,
  deleteNotificationResponseSchema,
  markReadResponseSchema,
  notificationDeleteRequestSchema,
  notificationsListResponseSchema,
  preferencesResponseSchema,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  subscribeRequestSchema,
  subscribeResponseSchema,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
} from '@bslt/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationsListResponse,
  PreferencesResponse,
  SendNotificationRequest,
  SendNotificationResponse,
  SubscribeRequest,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  UpdatePreferencesRequest,
  VapidKeyResponse,
} from '@bslt/shared';
export type {
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationsListResponse,
} from '@bslt/shared';

/** localStorage key for persisting device ID across sessions */
const DEVICE_ID_STORAGE_KEY = 'bslt-device-id';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the notification client
 */
export type NotificationClientConfig = BaseClientConfig;

/**
 * Notification API client interface
 */
export interface NotificationClient {
  /** Get VAPID public key for subscribing */
  getVapidKey: () => Promise<VapidKeyResponse>;
  /** Subscribe to push notifications */
  subscribe: (data: SubscribeRequest) => Promise<SubscribeResponse>;
  /** Unsubscribe from push notifications */
  unsubscribe: (data: UnsubscribeRequest) => Promise<UnsubscribeResponse>;
  /** Get notification preferences */
  getPreferences: () => Promise<PreferencesResponse>;
  /** Update notification preferences */
  updatePreferences: (data: UpdatePreferencesRequest) => Promise<PreferencesResponse>;
  /** Send test notification to self */
  testNotification: () => Promise<SendNotificationResponse>;
  /** Send notification (admin only) */
  sendNotification: (data: SendNotificationRequest) => Promise<SendNotificationResponse>;
  /** List in-app notifications */
  listNotifications: (limit?: number, offset?: number) => Promise<NotificationsListResponse>;
  /** Mark selected notifications as read */
  markRead: (ids: string[]) => Promise<MarkReadResponse>;
  /** Mark all notifications as read */
  markAllRead: () => Promise<MarkReadResponse>;
  /** Delete a single notification */
  deleteNotification: (id: string) => Promise<DeleteNotificationResponse>;
}

// ============================================================================
// Client Implementation
// ============================================================================

/**
 * Create a notification API client
 *
 * @param config - Client configuration
 * @returns Notification client instance
 *
 * @example
 * ```ts
 * const client = createNotificationClient({
 *   baseUrl: 'http://localhost:3001',
 *   getToken: () => localStorage.getItem('token'),
 * });
 *
 * // Get VAPID key
 * const { publicKey } = await client.getVapidKey();
 *
 * // Subscribe
 * const browserSub = await navigator.serviceWorker.ready
 *   .then(reg => reg.pushManager.subscribe({
 *     userVisibleOnly: true,
 *     applicationServerKey: publicKey,
 *   }));
 *
 * await client.subscribe({
 *   subscription: browserSub.toJSON(),
 *   deviceId: 'device-123',
 *   userAgent: navigator.userAgent,
 * });
 * ```
 */
export function createNotificationClient(config: NotificationClientConfig): NotificationClient {
  const factory = createRequestFactory(config);

  return {
    async getVapidKey(): Promise<VapidKeyResponse> {
      return apiRequest(
        factory,
        '/notifications/vapid-key',
        undefined,
        false,
        vapidKeyResponseSchema,
      );
    },

    async subscribe(data: SubscribeRequest): Promise<SubscribeResponse> {
      const validated = subscribeRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/notifications/subscribe',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        subscribeResponseSchema,
      );
    },

    async unsubscribe(data: UnsubscribeRequest): Promise<UnsubscribeResponse> {
      const validated = unsubscribeRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/notifications/unsubscribe',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        unsubscribeResponseSchema,
      );
    },

    async getPreferences(): Promise<PreferencesResponse> {
      return apiRequest(
        factory,
        '/notifications/preferences',
        undefined,
        true,
        preferencesResponseSchema,
      );
    },

    async updatePreferences(data: UpdatePreferencesRequest): Promise<PreferencesResponse> {
      const validated = updatePreferencesRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/notifications/preferences/update',
        {
          method: 'PUT',
          body: JSON.stringify(validated),
        },
        true,
        preferencesResponseSchema,
      );
    },

    async testNotification(): Promise<SendNotificationResponse> {
      const parsed = await apiRequest(
        factory,
        '/notifications/test',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        sendNotificationResponseSchema,
      );
      return parsed as SendNotificationResponse;
    },

    async sendNotification(data: SendNotificationRequest): Promise<SendNotificationResponse> {
      const validated = sendNotificationRequestSchema.parse(data);
      const parsed = await apiRequest(
        factory,
        '/notifications/send',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        sendNotificationResponseSchema,
      );
      return parsed as SendNotificationResponse;
    },

    async listNotifications(limit = 20, offset = 0): Promise<NotificationsListResponse> {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      return apiRequest(
        factory,
        `/notifications/list?${params.toString()}`,
        undefined,
        true,
        notificationsListResponseSchema,
      );
    },

    async markRead(ids: string[]): Promise<MarkReadResponse> {
      const validated = baseMarkAsReadRequestSchema.parse({ ids });
      return apiRequest(
        factory,
        '/notifications/mark-read',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        markReadResponseSchema,
      );
    },

    async markAllRead(): Promise<MarkReadResponse> {
      return apiRequest(
        factory,
        '/notifications/mark-all-read',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        markReadResponseSchema,
      );
    },

    async deleteNotification(id: string): Promise<DeleteNotificationResponse> {
      const validated = notificationDeleteRequestSchema.parse({ id });
      return apiRequest(
        factory,
        '/notifications/delete',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        deleteNotificationResponseSchema,
      );
    },
  };
}

// ============================================================================
// Browser Push Subscription Helpers
// ============================================================================

/**
 * Convert base64 string to Uint8Array for applicationServerKey
 *
 * @param base64String - Base64 or base64url encoded string
 * @returns Uint8Array for use with pushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Convert base64url to base64 if needed
  const base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
  const BASE64_BLOCK_SIZE = 4;
  const padding = '='.repeat(
    (BASE64_BLOCK_SIZE - (base64.length % BASE64_BLOCK_SIZE)) % BASE64_BLOCK_SIZE,
  );
  const rawData = atob(base64 + padding);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if push notifications are supported in this browser
 *
 * @returns true if push is supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current push notification permission status
 *
 * @returns Permission status ('granted', 'denied', or 'default')
 */
export function getPushPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request push notification permission from user
 *
 * @returns Permission result
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.requestPermission();
}

/**
 * Get existing push subscription if any
 *
 * @returns Existing subscription or null
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Subscribe to push notifications in the browser
 *
 * @param vapidPublicKey - VAPID public key from server
 * @returns Browser push subscription
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    throw new Error('Push notification permission denied');
  }

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  return subscription;
}

/**
 * Unsubscribe from push notifications in the browser
 *
 * @returns true if unsubscribed successfully
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription();
  if (subscription === null) {
    return false;
  }
  return subscription.unsubscribe();
}

/**
 * Generate a unique device ID for this browser
 *
 * Uses localStorage to persist the ID across sessions.
 *
 * @returns Device ID string
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (deviceId === null || deviceId === '') {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }

  return deviceId;
}
