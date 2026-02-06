// packages/shared/src/domain/notifications/index.ts

export { shouldSendNotification } from './notifications.logic';

export {
  NOTIFICATION_TYPES,
  baseMarkAsReadRequestSchema,
  notificationPreferencesSchema,
  notificationSchema,
  notificationsListRequestSchema,
  notificationsListResponseSchema,
  type BaseMarkAsReadRequest,
  type Notification,
  type NotificationPreferencesConfig,
  type NotificationsListRequest,
  type NotificationsListResponse,
} from './notifications.schemas';

export {
  sendNotificationRequestSchema,
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
} from './notifications.push-schemas';

export {
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NotificationRateLimitError,
  NotificationSendError,
  NotificationsDisabledError,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  ProviderError,
  PushProviderNotConfiguredError,
  PushSubscriptionExistsError,
  PushSubscriptionNotFoundError,
  QuietHoursActiveError,
  SubscriptionExpiredError,
  VapidNotConfiguredError,
} from './notifications.errors';

export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type BatchSendResult,
  type NotificationAction,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationPayload,
  type NotificationPreferences,
  type NotificationPriority,
  type NotificationType,
  type NotificationTypePreference,
  type PreferencesResponse,
  type SendResult as PushSendResult,
  type PushSubscription,
  type PushSubscriptionKeys,
  type SendNotificationRequest,
  type SendNotificationResponse,
  type StoredPushSubscription,
  type SubscribeRequest,
  type SubscribeResponse,
  type UnsubscribeRequest,
  type UnsubscribeResponse,
  type UpdatePreferencesRequest,
  type VapidKeyResponse,
} from './notifications.types';
