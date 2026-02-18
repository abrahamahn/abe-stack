// main/server/core/src/notifications/errors.ts
/**
 * Push Notification Errors
 *
 * Re-exports all notification error classes from @bslt/shared.
 * Server/core consumers can import from this file or directly from shared.
 */

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
} from '@bslt/shared';

