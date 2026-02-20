// main/server/core/src/notifications/index.ts
/**
 * @bslt/notifications - Push Notification Module
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
 * } from '@bslt/notifications';
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
  cleanupExpiredSubscriptions,
  clearAllData,
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
  handleEmailUnsubscribe,
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

// Bounce handler
export {
  getDeliveryRecord,
  isUndeliverable,
  MAX_SOFT_BOUNCES,
  processBounce,
  recordDelivery,
  resetBounceStatus,
} from './bounce-handler';
export type { BounceEvent, BounceType, DeliveryRecord, DeliveryStatus } from './bounce-handler';

// Email unsubscribe
export {
  generateUnsubscribeHeaders,
  generateUnsubscribeToken,
  getUnsubscribedCategories,
  isUnsubscribed,
  NON_SUPPRESSIBLE_TYPES,
  resubscribeUser,
  shouldSendEmail,
  UNSUBSCRIBE_CATEGORIES,
  unsubscribeUser,
  validateUnsubscribeToken,
} from './unsubscribe';
export type { UnsubscribeCategory } from './unsubscribe';

// Routes
export { notificationRoutes } from './routes';

// Errors (re-exported from @bslt/shared)
export {
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NOTIFICATION_PAYLOAD_MAX_SIZE,
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
} from '@bslt/shared';

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
export { createFcmProvider, FcmProvider } from './providers';

// Provider factory
export {
  createNotificationProviderService,
  createNotificationProviderServiceFromEnv,
} from './providers';
