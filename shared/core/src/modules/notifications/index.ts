// shared/core/src/modules/notifications/index.ts
/**
 * Notifications Domain
 *
 * Push notification types, schemas, and errors.
 */

// Types
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
} from './types';

// Schemas
export {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  batchSendResultSchema,
  notificationActionSchema,
  notificationChannelSchema,
  notificationPayloadSchema,
  notificationPrioritySchema,
  notificationTypePreferenceSchema,
  notificationTypeSchema,
  preferencesResponseSchema,
  pushSubscriptionKeysSchema,
  pushSubscriptionSchema,
  quietHoursSchema,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  sendResultSchema,
  subscribeRequestSchema,
  subscribeResponseSchema,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
} from './schemas';
export type {
  NotificationPayloadSchema,
  SendNotificationRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  UpdatePreferencesRequestSchema,
} from './schemas';

// Errors
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
  PushSubscriptionExistsError,
  QuietHoursActiveError,
  SubscriptionExistsError,
  SubscriptionExpiredError,
  SubscriptionNotFoundError,
  VapidNotConfiguredError,
} from './errors';
