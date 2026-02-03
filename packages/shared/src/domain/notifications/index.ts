// shared/src/domain/notifications/index.ts

export { shouldSendNotification } from './notifications.logic';

export {
  baseMarkAsReadRequestSchema,
  NOTIFICATION_TYPES,
  notificationPreferencesSchema,
  notificationSchema,
  notificationsListRequestSchema,
  notificationsListResponseSchema,
  type BaseMarkAsReadRequest,
  type Notification,
  type NotificationPreferences,
  type NotificationsListRequest,
  type NotificationsListResponse,
} from './notifications.schemas';

export {
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NotificationRateLimitError,
  NotificationSendError,
  NotificationsDisabledError,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  ProviderError,
  ProviderNotConfiguredError,
  QuietHoursActiveError,
  SubscriptionExpiredError,
  SubscriptionExistsError,
  SubscriptionNotFoundError,
  VapidNotConfiguredError,
} from './notifications.errors';

export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type BatchSendResult,
  type NotificationAction,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationPayload,
  type NotificationPriority,
  type NotificationType,
  type PreferencesResponse,
  type PushSubscription,
  type PushSubscriptionKeys,
  type SendNotificationRequest,
  type SendNotificationResponse,
  type SendResult,
  type StoredPushSubscription,
  type SubscribeRequest,
  type SubscribeResponse,
  type UnsubscribeRequest,
  type UnsubscribeResponse,
  type UpdatePreferencesRequest,
  type VapidKeyResponse,
} from './notifications.types';
