// main/server/core/src/notifications/errors.ts
/**
 * Push Notification Errors
 *
 * Re-exports all notification error classes from @abe-stack/shared.
 * Server/core consumers can import from this file or directly from shared.
 */

export {
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NOTIFICATION_PAYLOAD_MAX_SIZE,
  NotificationRateLimitError,
  NotificationSendError,
  NotificationsDisabledError,
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
} from '@abe-stack/shared';
