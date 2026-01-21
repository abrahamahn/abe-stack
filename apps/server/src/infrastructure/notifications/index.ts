// apps/server/src/infrastructure/notifications/index.ts
/**
 * Notification Infrastructure
 *
 * Push notification providers and factory for Web Push and FCM.
 */

// Types
export type {
  FcmConfig,
  NotificationFactoryOptions,
  NotificationService,
  ProviderConfig,
  PushNotificationProvider,
  SendOptions,
  SubscriptionWithId,
  VapidConfig,
} from './types';

// Web Push Provider
export { createWebPushProvider, WebPushProvider } from './web-push-provider';

// FCM Provider (stub)
export { createFcmProvider, FcmProvider } from './fcm-provider';

// Factory
export {
  createNotificationService,
  createNotificationServiceFromEnv,
  getNotificationService,
  resetNotificationService,
} from './notification-factory';
