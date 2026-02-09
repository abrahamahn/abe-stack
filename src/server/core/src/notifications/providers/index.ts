// src/server/core/src/notifications/providers/index.ts
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
  NotificationProviderService,
  ProviderConfig,
  PushNotificationProvider,
  SendOptions,
  SubscriptionWithId,
} from './types';

// FCM Provider (stub)
export { FcmProvider, createFcmProvider } from './fcm-provider';

// Factory
export {
  createNotificationProviderService,
  createNotificationProviderServiceFromEnv,
} from './factory';
