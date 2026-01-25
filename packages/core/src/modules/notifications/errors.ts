// packages/core/src/modules/notifications/errors.ts
/**
 * Push Notification Errors
 *
 * Specific error types for notification-related operations including
 * subscription management, sending, and preference handling.
 */

import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from '../../infrastructure/errors';
import { HTTP_STATUS } from '../../shared/constants/http';

// ============================================================================
// Subscription Errors
// ============================================================================

/**
 * Push subscription not found
 */
export class SubscriptionNotFoundError extends NotFoundError {
  constructor(identifier?: string) {
    const message = identifier
      ? `Push subscription not found: ${identifier}`
      : 'Push subscription not found';
    super(message, 'SUBSCRIPTION_NOT_FOUND');
  }
}

/**
 * Push subscription already exists (duplicate)
 */
export class SubscriptionExistsError extends ConflictError {
  constructor(message = 'Push subscription already exists') {
    super(message, 'SUBSCRIPTION_EXISTS');
  }
}

export { SubscriptionExistsError as PushSubscriptionExistsError };

/**
 * Invalid push subscription data
 */
export class InvalidSubscriptionError extends BadRequestError {
  constructor(message = 'Invalid push subscription data', details?: Record<string, unknown>) {
    super(message, 'INVALID_SUBSCRIPTION', details);
  }
}

/**
 * Push subscription has expired
 */
export class SubscriptionExpiredError extends UnprocessableError {
  constructor(subscriptionId?: string) {
    const message = subscriptionId
      ? `Push subscription has expired: ${subscriptionId}`
      : 'Push subscription has expired';
    super(message, 'SUBSCRIPTION_EXPIRED');
  }
}

// ============================================================================
// Send Errors
// ============================================================================

/**
 * Failed to send push notification
 */
export class NotificationSendError extends AppError {
  constructor(
    message = 'Failed to send push notification',
    public readonly subscriptionId?: string,
    public readonly httpStatusCode?: number,
    public readonly originalError?: Error,
  ) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'NOTIFICATION_SEND_FAILED', {
      subscriptionId,
      httpStatusCode,
    });
  }
}

/**
 * Push notification payload is too large
 */
export class PayloadTooLargeError extends BadRequestError {
  constructor(
    public readonly actualSize: number,
    public readonly maxSize: number = 4096,
  ) {
    super(
      `Notification payload too large: ${actualSize.toString()} bytes (max: ${maxSize.toString()} bytes)`,
      'PAYLOAD_TOO_LARGE',
      { actualSize, maxSize },
    );
  }
}

/**
 * Rate limit exceeded for sending notifications
 */
export class NotificationRateLimitError extends AppError {
  constructor(
    message = 'Notification rate limit exceeded',
    public readonly retryAfter?: number,
  ) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'NOTIFICATION_RATE_LIMITED', { retryAfter });
  }
}

// ============================================================================
// Provider Errors
// ============================================================================

/**
 * Push notification provider not configured
 */
export class ProviderNotConfiguredError extends AppError {
  constructor(providerName: string) {
    super(
      `Push notification provider not configured: ${providerName}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'PROVIDER_NOT_CONFIGURED',
      { provider: providerName },
    );
  }
}

/**
 * Push notification provider error
 */
export class ProviderError extends AppError {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly originalError?: Error,
  ) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'PROVIDER_ERROR', {
      provider: providerName,
      originalMessage: originalError?.message,
    });
  }
}

/**
 * VAPID keys not configured
 */
export class VapidNotConfiguredError extends AppError {
  constructor() {
    super(
      'VAPID keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'VAPID_NOT_CONFIGURED',
    );
  }
}

// ============================================================================
// Preference Errors
// ============================================================================

/**
 * Notification preferences not found
 */
export class PreferencesNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super(`Notification preferences not found for user: ${userId}`, 'PREFERENCES_NOT_FOUND');
  }
}

/**
 * Invalid notification preferences
 */
export class InvalidPreferencesError extends BadRequestError {
  constructor(message = 'Invalid notification preferences', details?: Record<string, unknown>) {
    super(message, 'INVALID_PREFERENCES', details);
  }
}

// ============================================================================
// Permission Errors
// ============================================================================

/**
 * User has disabled notifications
 */
export class NotificationsDisabledError extends UnprocessableError {
  constructor(
    public readonly userId: string,
    public readonly notificationType?: string,
  ) {
    const message = notificationType
      ? `User has disabled ${notificationType} notifications`
      : 'User has disabled notifications';
    super(message, 'NOTIFICATIONS_DISABLED', { userId, notificationType });
  }
}

/**
 * Notification blocked by quiet hours
 */
export class QuietHoursActiveError extends UnprocessableError {
  constructor(
    public readonly userId: string,
    public readonly endTime?: Date,
  ) {
    super('Notification blocked: quiet hours are active', 'QUIET_HOURS_ACTIVE', {
      userId,
      endTime: endTime?.toISOString(),
    });
  }
}
