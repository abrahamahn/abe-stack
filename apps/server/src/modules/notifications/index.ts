// apps/server/src/modules/notifications/index.ts
/**
 * Notifications Module
 *
 * Push notification management including subscription, sending,
 * and preference handling.
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
  broadcast,
  clearAllData,
  getActiveSubscriptionCount,
  getPreferences,
  getSubscriptionById,
  getSubscriptionCount,
  getUserSubscriptions,
  getVapidPublicKey,
  markSubscriptionsExpired,
  sendToUser,
  sendToUsers,
  shouldSendNotification,
  subscribe,
  unsubscribe,
  updatePreferences,
} from './service';
