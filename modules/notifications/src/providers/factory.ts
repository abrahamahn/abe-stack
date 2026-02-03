// modules/notifications/src/providers/factory.ts
/**
 * Notification Provider Factory
 *
 * Creates and manages push notification providers based on configuration.
 * Currently supports FCM (Firebase Cloud Messaging) as a stub implementation.
 */

import { createFcmProvider, FcmProvider } from './fcm-provider';

import type {
  NotificationFactoryOptions,
  NotificationProviderService,
  PushNotificationProvider,
} from './types';

// ============================================================================
// Notification Service Implementation
// ============================================================================

/**
 * Internal notification service implementation that aggregates multiple providers.
 */
class NotificationProviderServiceImpl implements NotificationProviderService {
  private readonly fcmProvider: FcmProvider | undefined;

  /**
   * Create a new notification provider service.
   *
   * @param fcmProvider - Optional FCM provider instance
   */
  constructor(fcmProvider: FcmProvider | undefined) {
    this.fcmProvider = fcmProvider;
  }

  /**
   * Get the FCM provider if configured.
   *
   * @returns The FCM provider if configured and ready, undefined otherwise
   */
  getFcmProvider(): PushNotificationProvider | undefined {
    return this.fcmProvider?.isConfigured() === true ? this.fcmProvider : undefined;
  }

  /**
   * Check if any provider is configured and ready.
   *
   * @returns true if at least one provider is configured
   */
  isConfigured(): boolean {
    return this.fcmProvider?.isConfigured() ?? false;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a notification service from explicit configuration.
 *
 * @param options - Provider configuration options
 * @returns NotificationProviderService instance
 *
 * @example
 * ```ts
 * const service = createNotificationProviderService({
 *   fcm: {
 *     credentials: 'service-account-json',
 *     projectId: 'my-project',
 *   },
 * });
 * ```
 */
export function createNotificationProviderService(
  options: NotificationFactoryOptions,
): NotificationProviderService {
  let fcmProvider: FcmProvider | undefined;

  if (options.fcm != null) {
    fcmProvider = new FcmProvider(options.fcm);
  }

  return new NotificationProviderServiceImpl(fcmProvider);
}

/**
 * Create a notification service from environment variables.
 *
 * Reads configuration from environment:
 * - FCM_CREDENTIALS: FCM service account credentials
 * - FCM_PROJECT_ID: FCM project ID
 *
 * @param env - Environment variables object (defaults to process.env)
 * @returns NotificationProviderService instance
 *
 * @example
 * ```ts
 * const service = createNotificationProviderServiceFromEnv();
 *
 * if (service.isConfigured()) {
 *   const provider = service.getFcmProvider();
 *   await provider?.send(subscription, payload);
 * }
 * ```
 */
export function createNotificationProviderServiceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): NotificationProviderService {
  const fcmCredentials = env['FCM_CREDENTIALS'];
  const fcmProjectId = env['FCM_PROJECT_ID'];
  const fcmConfig: { FCM_CREDENTIALS?: string; FCM_PROJECT_ID?: string } = {};
  if (fcmCredentials !== undefined) {
    fcmConfig.FCM_CREDENTIALS = fcmCredentials;
  }
  if (fcmProjectId !== undefined) {
    fcmConfig.FCM_PROJECT_ID = fcmProjectId;
  }
  const fcmProvider = createFcmProvider(fcmConfig);

  return new NotificationProviderServiceImpl(fcmProvider);
}
