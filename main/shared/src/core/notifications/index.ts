// main/shared/src/core/notifications/index.ts

/**
 * @file Notification Module Barrel
 * @description Public API for notification types, schemas, errors, and logic.
 * @module Core/Notifications
 */

// --- notifications.display ---
export { getNotificationLevelTone } from './notifications.display';

// --- notifications.logic ---
export { shouldSendNotification } from './notifications.logic';

// --- notifications.schemas (in-app) ---
export {
  baseMarkAsReadRequestSchema,
  deleteNotificationResponseSchema,
  markReadResponseSchema,
  NOTIFICATION_LEVELS,
  NOTIFICATION_TYPES,
  notificationDeleteRequestSchema,
  notificationPreferencesSchema,
  notificationSchema,
  notificationsListRequestSchema,
  notificationsListResponseSchema,
  type BaseMarkAsReadRequest,
  type DeleteNotificationResponse,
  type MarkReadResponse,
  type Notification,
  type NotificationDeleteRequest,
  type NotificationLevel,
  type NotificationPreferencesConfig,
  type NotificationsListRequest,
  type NotificationsListResponse,
} from './notifications.schemas';

// --- notifications.push-schemas ---
export {
  preferencesResponseSchema,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  subscribeRequestSchema,
  subscribeResponseSchema,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
} from './notifications.push.schemas';

// --- NOTIFICATION_PAYLOAD_MAX_SIZE (canonical: system/constants) ---
import { NOTIFICATION_PAYLOAD_MAX_SIZE } from '../../system/constants';

export { NOTIFICATION_PAYLOAD_MAX_SIZE };

// --- notifications.errors ---
export {
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NotificationRateLimitError,
  NotificationsDisabledError,
  NotificationSendError,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  ProviderError,
  ProviderNotConfiguredError,
  PushProviderNotConfiguredError,
  PushSubscriptionExistsError,
  PushSubscriptionNotFoundError,
  QuietHoursActiveError,
  SubscriptionExistsError,
  SubscriptionExpiredError,
  SubscriptionNotFoundError,
  VapidNotConfiguredError,
} from './notifications.errors';

// --- notifications.types (push) ---
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
  type SendResult as PushSendResult,
  type StoredPushSubscription,
  type SubscribeRequest,
  type SubscribeResponse,
  type UnsubscribeRequest,
  type UnsubscribeResponse,
  type UpdatePreferencesRequest,
  type VapidKeyResponse,
} from './notifications.types';
