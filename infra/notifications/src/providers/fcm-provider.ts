// infra/notifications/src/providers/fcm-provider.ts
/**
 * FCM (Firebase Cloud Messaging) Provider Stub
 *
 * Placeholder implementation for FCM push notifications.
 * To be implemented when FCM integration is needed.
 */

import type { FcmConfig, PushNotificationProvider, SendOptions, SubscriptionWithId } from './types';
import type {
  BatchSendResult,
  NotificationPayload,
  PushSubscription,
  SendResult,
} from '@abe-stack/core';

// ============================================================================
// FCM Provider Stub
// ============================================================================

/**
 * FCM provider stub.
 *
 * This is a placeholder implementation that returns not-configured status.
 * Implement this class when FCM support is needed for mobile push notifications.
 *
 * To implement:
 * 1. Add firebase-admin package
 * 2. Initialize Firebase Admin SDK with service account
 * 3. Implement send() and sendBatch() using admin.messaging()
 *
 * @example
 * ```ts
 * // Future implementation
 * import * as admin from 'firebase-admin';
 *
 * class FcmProvider implements PushNotificationProvider {
 *   constructor(config: FcmConfig) {
 *     admin.initializeApp({
 *       credential: admin.credential.cert(config.credentials),
 *     });
 *   }
 *
 *   async send(subscription, payload) {
 *     const message = {
 *       token: subscription.endpoint, // FCM token
 *       notification: {
 *         title: payload.title,
 *         body: payload.body,
 *       },
 *     };
 *     await admin.messaging().send(message);
 *   }
 * }
 * ```
 */
export class FcmProvider implements PushNotificationProvider {
  readonly name = 'fcm';
  private readonly config: FcmConfig | undefined;

  /**
   * Create a new FCM provider instance.
   *
   * @param config - FCM configuration (optional, provider is unconfigured without it)
   */
  constructor(config?: FcmConfig) {
    this.config = config;
    // FCM initialization would go here
  }

  /**
   * Check if provider is configured.
   *
   * @returns false - FCM is not yet implemented
   */
  isConfigured(): boolean {
    // FCM is not yet implemented - requires config to be set
    return this.config !== undefined && false;
  }

  /**
   * FCM doesn't use VAPID public key.
   *
   * @returns undefined - FCM uses its own token mechanism
   */
  getPublicKey(): string | undefined {
    return undefined;
  }

  /**
   * Send notification to a single subscription.
   *
   * @param _subscription - Push subscription (unused in stub)
   * @param _payload - Notification payload (unused in stub)
   * @param _options - Send options (unused in stub)
   * @returns Promise resolving to a failed SendResult
   */
  send(
    _subscription: PushSubscription,
    _payload: NotificationPayload,
    _options?: SendOptions,
  ): Promise<SendResult> {
    return Promise.resolve({
      success: false,
      subscriptionId: 'unknown',
      error: 'FCM provider not implemented',
    });
  }

  /**
   * Send notifications to multiple subscriptions.
   *
   * @param subscriptions - Array of subscriptions with IDs
   * @param _payload - Notification payload (unused in stub)
   * @param _options - Send options (unused in stub)
   * @returns Promise resolving to a BatchSendResult with all failures
   * @complexity O(n) where n is the number of subscriptions
   */
  sendBatch(
    subscriptions: SubscriptionWithId[],
    _payload: NotificationPayload,
    _options?: SendOptions,
  ): Promise<BatchSendResult> {
    return Promise.resolve({
      total: subscriptions.length,
      successful: 0,
      failed: subscriptions.length,
      results: subscriptions.map((s) => ({
        success: false,
        subscriptionId: s.id,
        error: 'FCM provider not implemented',
      })),
      expiredSubscriptions: [],
    });
  }
}

/**
 * Create an FCM provider from environment variables.
 *
 * @param env - Environment variables object with optional FCM_CREDENTIALS and FCM_PROJECT_ID
 * @returns FcmProvider instance if both credentials and projectId are provided, undefined otherwise
 */
export function createFcmProvider(env: {
  FCM_CREDENTIALS?: string;
  FCM_PROJECT_ID?: string;
}): FcmProvider | undefined {
  const credentials = env.FCM_CREDENTIALS;
  const projectId = env.FCM_PROJECT_ID;

  if (credentials == null || credentials === '' || projectId == null || projectId === '') {
    return undefined;
  }

  return new FcmProvider({ credentials, projectId });
}
