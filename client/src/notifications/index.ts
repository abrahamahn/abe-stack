// client/src/notifications/index.ts
/**
 * Push Notifications SDK
 *
 * Client and hooks for push notification management.
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
export type { NotificationClient, NotificationClientConfig } from './client';

// Hooks
export {
  useNotificationPreferences,
  usePushPermission,
  usePushSubscription,
  useTestNotification,
} from './hooks';
export type {
  NotificationPreferencesState,
  PushPermissionState,
  PushSubscriptionState,
  TestNotificationState,
  UseNotificationPreferencesOptions,
  UsePushSubscriptionOptions,
} from './hooks';
