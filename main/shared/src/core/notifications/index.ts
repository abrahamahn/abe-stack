// main/shared/src/domain/notifications/index.ts

export { notificationsContract } from '../../contracts';

export { getNotificationLevelTone } from './notifications.display';

export { shouldSendNotification } from './notifications.logic';

export {
  baseMarkAsReadRequestSchema,
  deleteNotificationResponseSchema,
  markReadResponseSchema, NOTIFICATION_LEVELS,
  NOTIFICATION_TYPES, notificationDeleteRequestSchema,
  notificationPreferencesSchema,
  notificationSchema,
  notificationsListRequestSchema,
  notificationsListResponseSchema,
  type BaseMarkAsReadRequest,
  type DeleteNotificationResponse,
  type MarkReadResponse, type Notification, type NotificationDeleteRequest, type NotificationLevel,
  type NotificationPreferencesConfig,
  type NotificationsListRequest,
  type NotificationsListResponse
} from './notifications.schemas';

export {
  preferencesResponseSchema, sendNotificationRequestSchema,
  sendNotificationResponseSchema, subscribeRequestSchema,
  subscribeResponseSchema,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema
} from './notifications.push-schemas';

export {
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NOTIFICATION_PAYLOAD_MAX_SIZE,
  NotificationRateLimitError, NotificationsDisabledError, NotificationSendError, PayloadTooLargeError,
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
  VapidNotConfiguredError
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
  type VapidKeyResponse
} from './notifications.types';

