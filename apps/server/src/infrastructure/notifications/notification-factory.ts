// apps/server/src/infrastructure/notifications/notification-factory.ts
/**
 * Notification Provider Factory
 *
 * Creates and manages push notification providers based on configuration.
 */

import { createFcmProvider, FcmProvider } from './fcm-provider';
import { createWebPushProvider, WebPushProvider } from './web-push-provider';

import type {
  NotificationFactoryOptions,
  NotificationService,
  PushNotificationProvider,
} from './types';

// ============================================================================
// Notification Service Implementation
// ============================================================================

/**
 * Notification service that aggregates multiple providers
 */
class NotificationServiceImpl implements NotificationService {
  private readonly webPushProvider: WebPushProvider | undefined;
  private readonly fcmProvider: FcmProvider | undefined;

  constructor(webPushProvider: WebPushProvider | undefined, fcmProvider: FcmProvider | undefined) {
    this.webPushProvider = webPushProvider;
    this.fcmProvider = fcmProvider;
  }

  getWebPushProvider(): PushNotificationProvider | undefined {
    return this.webPushProvider?.isConfigured() ? this.webPushProvider : undefined;
  }

  getFcmProvider(): PushNotificationProvider | undefined {
    return this.fcmProvider?.isConfigured() ? this.fcmProvider : undefined;
  }

  getVapidPublicKey(): string | undefined {
    return this.webPushProvider?.getPublicKey();
  }

  isConfigured(): boolean {
    return (
      (this.webPushProvider?.isConfigured() ?? false) || (this.fcmProvider?.isConfigured() ?? false)
    );
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a notification service from explicit configuration
 *
 * @param options - Provider configuration options
 * @returns NotificationService instance
 *
 * @example
 * ```ts
 * const service = createNotificationService({
 *   vapid: {
 *     publicKey: 'BEl62iUYgUivx...',
 *     privateKey: 'UUxI4O8k2r...',
 *     subject: 'mailto:admin@example.com',
 *   },
 * });
 * ```
 */
export function createNotificationService(
  options: NotificationFactoryOptions,
): NotificationService {
  let webPushProvider: WebPushProvider | undefined;
  let fcmProvider: FcmProvider | undefined;

  if (options.vapid) {
    webPushProvider = new WebPushProvider(options.vapid, options.defaultTtl);
  }

  if (options.fcm) {
    fcmProvider = new FcmProvider(options.fcm);
  }

  return new NotificationServiceImpl(webPushProvider, fcmProvider);
}

/**
 * Create a notification service from environment variables
 *
 * Reads configuration from environment:
 * - VAPID_PUBLIC_KEY: Web Push public key
 * - VAPID_PRIVATE_KEY: Web Push private key
 * - VAPID_SUBJECT: Contact URL for VAPID (default: mailto:admin@example.com)
 * - FCM_CREDENTIALS: FCM service account credentials
 * - FCM_PROJECT_ID: FCM project ID
 *
 * @param env - Environment variables object (defaults to process.env)
 * @returns NotificationService instance
 *
 * @example
 * ```ts
 * const service = createNotificationServiceFromEnv();
 *
 * if (service.isConfigured()) {
 *   const provider = service.getWebPushProvider();
 *   await provider?.send(subscription, payload);
 * }
 * ```
 */
export function createNotificationServiceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): NotificationService {
  const webPushProvider = createWebPushProvider({
    VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: env.VAPID_SUBJECT,
  });

  const fcmProvider = createFcmProvider({
    FCM_CREDENTIALS: env.FCM_CREDENTIALS,
    FCM_PROJECT_ID: env.FCM_PROJECT_ID,
  });

  return new NotificationServiceImpl(webPushProvider, fcmProvider);
}

/**
 * Get the default notification service instance (singleton)
 *
 * Creates a service from environment variables on first call.
 * Subsequent calls return the same instance.
 *
 * @returns NotificationService singleton
 */
let defaultService: NotificationService | undefined;

export function getNotificationService(): NotificationService {
  if (!defaultService) {
    defaultService = createNotificationServiceFromEnv();
  }
  return defaultService;
}

/**
 * Reset the default notification service (for testing)
 */
export function resetNotificationService(): void {
  defaultService = undefined;
}
