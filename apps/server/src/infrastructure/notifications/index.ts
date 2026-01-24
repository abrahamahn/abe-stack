// apps/server/src/infrastructure/notifications/index.ts
/**
 * Notification Infrastructure
 *
 * Push notification providers and factory.
 * Currently supports FCM (Firebase Cloud Messaging) as a stub implementation.
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
} from './types';

// FCM Provider (stub)
export { FcmProvider, createFcmProvider } from './fcm-provider';

// Factory
export {
  createNotificationService,
  createNotificationServiceFromEnv,
} from './notification-factory';
