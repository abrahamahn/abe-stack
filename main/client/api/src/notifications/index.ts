// main/client/api/src/notifications/index.ts
/**
 * Push Notifications SDK
 *
 * Client and utilities for push notification management.
 */

// Client
export {
  createNotificationClient,
  getDeviceId,
  getExistingSubscription,
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
} from './client';
export type {
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationClient,
  NotificationClientConfig,
  NotificationsListResponse,
} from './client';
