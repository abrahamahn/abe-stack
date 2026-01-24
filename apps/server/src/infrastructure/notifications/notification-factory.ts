// apps/server/src/infrastructure/notifications/notification-factory.ts
/**
 * Notification Provider Factory
 *
 * Creates and manages push notification providers based on configuration.
 * Currently supports FCM (Firebase Cloud Messaging) as a stub implementation.
 */

import { createFcmProvider, FcmProvider } from './fcm-provider';

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
  private readonly fcmProvider: FcmProvider | undefined;

  constructor(fcmProvider: FcmProvider | undefined) {
    this.fcmProvider = fcmProvider;
  }

  getFcmProvider(): PushNotificationProvider | undefined {
    return this.fcmProvider?.isConfigured() ? this.fcmProvider : undefined;
  }

  isConfigured(): boolean {
    return this.fcmProvider?.isConfigured() ?? false;
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
 *   fcm: {
 *     credentials: 'service-account-json',
 *     projectId: 'my-project',
 *   },
 * });
 * ```
 */
export function createNotificationService(
  options: NotificationFactoryOptions,
): NotificationService {
  let fcmProvider: FcmProvider | undefined;

  if (options.fcm) {
    fcmProvider = new FcmProvider(options.fcm);
  }

  return new NotificationServiceImpl(fcmProvider);
}

/**
 * Create a notification service from environment variables
 *
 * Reads configuration from environment:
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
 *   const provider = service.getFcmProvider();
 *   await provider?.send(subscription, payload);
 * }
 * ```
 */
export function createNotificationServiceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): NotificationService {
  const fcmProvider = createFcmProvider({
    FCM_CREDENTIALS: env.FCM_CREDENTIALS,
    FCM_PROJECT_ID: env.FCM_PROJECT_ID,
  });

  return new NotificationServiceImpl(fcmProvider);
}
