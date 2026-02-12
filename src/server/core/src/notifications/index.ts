// src/server/core/src/notifications/index.ts
/**
 * @abe-stack/notifications - Push Notification Module
 *
 * Provides push notification infrastructure including:
 * - Subscription management (subscribe, unsubscribe, query)
 * - Preference management (get, update, quiet hours)
 * - Provider abstraction (FCM stub, extensible factory)
 * - HTTP handlers and route definitions
 *
 * @example
 * ```ts
 * import {
 *   subscribe,
 *   getPreferences,
 *   notificationRoutes,
 *   createNotificationProviderService,
 * } from '@abe-stack/notifications';
 *
 * // Register routes
 * registerRouteMap(app, ctx, notificationRoutes, routerOptions);
 *
 * // Use service directly
 * const subId = await subscribe(db, userId, subscription, deviceId, userAgent);
 * const prefs = await getPreferences(db, userId);
 * ```
 */

// Module types
export type { NotificationModuleDeps, NotificationRequest } from './types';

// Service - Subscription management
export {
  clearAllData,
  cleanupExpiredSubscriptions,
  createNotificationForEvent,
  getActiveSubscriptionCount,
  getAllActiveSubscriptions,
  getPreferences,
  getSubscriptionById,
  getSubscriptionCount,
  getSubscriptionStats,
  getUserSubscriptions,
  markSubscriptionsExpired,
  shouldSendNotification,
  subscribe,
  unsubscribe,
  updatePreferences,
  type NotificationEventType,
} from './service';

// Handlers
export {
  handleDeleteNotification,
  handleGetPreferences,
  handleGetVapidKey,
  handleListNotifications,
  handleMarkAllAsRead,
  handleMarkAsRead,
  handleSendNotification,
  handleSubscribe,
  handleTestNotification,
  handleUnsubscribe,
  handleUpdatePreferences,
} from './handlers';

// Routes
export { notificationRoutes } from './routes';

// Errors (re-exported from @abe-stack/shared)
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

// Provider types
export type {
  FcmConfig,
  NotificationFactoryOptions,
  NotificationProviderService,
  ProviderConfig,
  PushNotificationProvider,
  SendOptions,
  SubscriptionWithId,
} from './providers';

// Provider implementations
export { FcmProvider, createFcmProvider } from './providers';

// Provider factory
export {
  createNotificationProviderService,
  createNotificationProviderServiceFromEnv,
} from './providers';
