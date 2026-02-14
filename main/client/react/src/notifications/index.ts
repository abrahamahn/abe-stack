// main/client/react/src/notifications/index.ts
/**
 * Push Notifications React Hooks
 *
 * React hooks for push notification management.
 */

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
