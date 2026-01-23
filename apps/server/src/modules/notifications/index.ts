// apps/server/src/modules/notifications/index.ts
/**
 * Notifications Module
 *
 * Push notification management including subscription management
 * and preference handling.
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * Subscription management and preferences remain for future provider implementations.
 */

// Routes (for auto-registration)
export { notificationRoutes } from './routes';

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

// Service (business logic)
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
