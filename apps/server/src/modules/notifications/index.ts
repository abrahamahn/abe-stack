// modules/notifications/src/index.ts
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

// Configuration
export {
  DEFAULT_NOTIFICATION_CONFIG,
  loadNotificationsConfig,
  validateNotificationsConfig,
} from './config';

// Module types
export type { NotificationLogger, NotificationModuleDeps, NotificationRequest } from './types';

// Service - Subscription management
export {
  clearAllData,
  cleanupExpiredSubscriptions,
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
} from './service';

// Handlers
export {
  handleGetPreferences,
  handleGetVapidKey,
  handleSendNotification,
  handleSubscribe,
  handleTestNotification,
  handleUnsubscribe,
  handleUpdatePreferences,
} from './handlers';

// Routes
export { notificationRoutes } from './routes';

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
