// src/client/api/src/notifications/client.ts
/**
 * Notification API Client
 *
 * Type-safe client for interacting with the push notification API endpoints.
 */

import {
  sendNotificationRequestSchema,
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  updatePreferencesRequestSchema,
} from '@abe-stack/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  PreferencesResponse,
  SendNotificationRequest,
  SendNotificationResponse,
  SubscribeRequest,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  UpdatePreferencesRequest,
  VapidKeyResponse,
} from '@abe-stack/shared';

/** localStorage key for persisting device ID across sessions */
const DEVICE_ID_STORAGE_KEY = 'abe-stack-device-id';

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
      return apiRequest<VapidKeyResponse>(factory, '/notifications/vapid-key', undefined, false);
    },

    async subscribe(data: SubscribeRequest): Promise<SubscribeResponse> {
      const validated = subscribeRequestSchema.parse(data);
      return apiRequest<SubscribeResponse>(factory, '/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    async unsubscribe(data: UnsubscribeRequest): Promise<UnsubscribeResponse> {
      const validated = unsubscribeRequestSchema.parse(data);
      return apiRequest<UnsubscribeResponse>(factory, '/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    async getPreferences(): Promise<PreferencesResponse> {
      return apiRequest<PreferencesResponse>(factory, '/notifications/preferences');
    },

    async updatePreferences(data: UpdatePreferencesRequest): Promise<PreferencesResponse> {
      const validated = updatePreferencesRequestSchema.parse(data);
      return apiRequest<PreferencesResponse>(factory, '/notifications/preferences/update', {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    async testNotification(): Promise<SendNotificationResponse> {
      return apiRequest<SendNotificationResponse>(factory, '/notifications/test', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async sendNotification(data: SendNotificationRequest): Promise<SendNotificationResponse> {
      const validated = sendNotificationRequestSchema.parse(data);
      return apiRequest<SendNotificationResponse>(factory, '/notifications/send', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
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
  const padding = '='.repeat((BASE64_BLOCK_SIZE - (base64.length % BASE64_BLOCK_SIZE)) % BASE64_BLOCK_SIZE);
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
