// apps/server/src/infrastructure/notifications/web-push-provider.ts
/**
 * Web Push Provider
 *
 * Implementation of push notifications using the Web Push protocol with VAPID.
 * Uses the web-push library for encryption and sending.
 */

import webPush from 'web-push';

import type {
  PushNotificationProvider,
  SendOptions,
  SubscriptionWithId,
  VapidConfig,
} from './types';
import type {
  BatchSendResult,
  NotificationPayload,
  PushSubscription,
  SendResult,
} from '@abe-stack/core';

// ============================================================================
// Constants
// ============================================================================

/** Default TTL for notifications (24 hours) */
const DEFAULT_TTL = 86400;

/** Maximum payload size (4KB) */
const MAX_PAYLOAD_SIZE = 4096;

/** HTTP status codes that indicate subscription should be removed */
const GONE_STATUS_CODES = [404, 410];

// ============================================================================
// Web Push Provider
// ============================================================================

/**
 * Web Push provider using VAPID authentication
 *
 * Implements the Web Push protocol for sending notifications to
 * browsers that support the Push API (Chrome, Firefox, Edge, Safari).
 *
 * @example
 * ```ts
 * const provider = new WebPushProvider({
 *   publicKey: process.env.VAPID_PUBLIC_KEY,
 *   privateKey: process.env.VAPID_PRIVATE_KEY,
 *   subject: 'mailto:admin@example.com',
 * });
 *
 * await provider.send(subscription, {
 *   title: 'Hello',
 *   body: 'World',
 * });
 * ```
 */
export class WebPushProvider implements PushNotificationProvider {
  readonly name = 'web-push';
  private readonly config: VapidConfig;
  private readonly defaultTtl: number;
  private configured = false;

  constructor(config: VapidConfig, defaultTtl = DEFAULT_TTL) {
    this.config = config;
    this.defaultTtl = defaultTtl;

    // Configure web-push with VAPID details
    if (this.validateConfig(config)) {
      webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
      this.configured = true;
    }
  }

  /**
   * Validate VAPID configuration
   */
  private validateConfig(config: VapidConfig): boolean {
    if (!config.publicKey || !config.privateKey || !config.subject) {
      return false;
    }

    // Basic validation of key format (should be base64url)
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    if (!base64UrlPattern.test(config.publicKey) || !base64UrlPattern.test(config.privateKey)) {
      return false;
    }

    // Subject should be mailto: or https:
    if (!config.subject.startsWith('mailto:') && !config.subject.startsWith('https:')) {
      return false;
    }

    return true;
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Get VAPID public key for client subscription
   */
  getPublicKey(): string | undefined {
    return this.configured ? this.config.publicKey : undefined;
  }

  /**
   * Send notification to a single subscription
   */
  async send(
    subscription: PushSubscription,
    payload: NotificationPayload,
    options?: SendOptions,
  ): Promise<SendResult> {
    if (!this.configured) {
      return {
        success: false,
        subscriptionId: 'unknown',
        error: 'Web Push provider not configured',
      };
    }

    const jsonPayload = JSON.stringify(payload);

    // Check payload size
    if (Buffer.byteLength(jsonPayload, 'utf8') > MAX_PAYLOAD_SIZE) {
      return {
        success: false,
        subscriptionId: 'unknown',
        error: `Payload too large (max ${MAX_PAYLOAD_SIZE.toString()} bytes)`,
      };
    }

    const webPushSubscription: webPush.PushSubscription = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    };

    const webPushOptions: webPush.RequestOptions = {
      TTL: options?.ttl ?? this.defaultTtl,
      urgency: options?.urgency ?? 'normal',
      topic: options?.topic,
    };

    try {
      const response = await webPush.sendNotification(
        webPushSubscription,
        jsonPayload,
        webPushOptions,
      );

      return {
        success: true,
        subscriptionId: 'unknown',
        statusCode: response.statusCode,
      };
    } catch (error) {
      const webPushError = error as webPush.WebPushError;
      return {
        success: false,
        subscriptionId: 'unknown',
        error: webPushError.message,
        statusCode: webPushError.statusCode,
      };
    }
  }

  /**
   * Send notifications to multiple subscriptions
   */
  async sendBatch(
    subscriptions: SubscriptionWithId[],
    payload: NotificationPayload,
    options?: SendOptions,
  ): Promise<BatchSendResult> {
    if (!this.configured) {
      return {
        total: subscriptions.length,
        successful: 0,
        failed: subscriptions.length,
        results: subscriptions.map((s) => ({
          success: false,
          subscriptionId: s.id,
          error: 'Web Push provider not configured',
        })),
        expiredSubscriptions: [],
      };
    }

    const jsonPayload = JSON.stringify(payload);

    // Check payload size
    if (Buffer.byteLength(jsonPayload, 'utf8') > MAX_PAYLOAD_SIZE) {
      return {
        total: subscriptions.length,
        successful: 0,
        failed: subscriptions.length,
        results: subscriptions.map((s) => ({
          success: false,
          subscriptionId: s.id,
          error: `Payload too large (max ${MAX_PAYLOAD_SIZE.toString()} bytes)`,
        })),
        expiredSubscriptions: [],
      };
    }

    const webPushOptions: webPush.RequestOptions = {
      TTL: options?.ttl ?? this.defaultTtl,
      urgency: options?.urgency ?? 'normal',
      topic: options?.topic,
    };

    // Send to all subscriptions concurrently
    const promises = subscriptions.map(async ({ id, subscription }): Promise<SendResult> => {
      const webPushSubscription: webPush.PushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      try {
        const response = await webPush.sendNotification(
          webPushSubscription,
          jsonPayload,
          webPushOptions,
        );

        return {
          success: true,
          subscriptionId: id,
          statusCode: response.statusCode,
        };
      } catch (error) {
        const webPushError = error as webPush.WebPushError;
        return {
          success: false,
          subscriptionId: id,
          error: webPushError.message,
          statusCode: webPushError.statusCode,
        };
      }
    });

    const results = await Promise.all(promises);

    // Calculate summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Identify expired subscriptions (404 or 410 status)
    const expiredSubscriptions = results
      .filter(
        (r) => !r.success && r.statusCode !== undefined && GONE_STATUS_CODES.includes(r.statusCode),
      )
      .map((r) => r.subscriptionId);

    return {
      total: subscriptions.length,
      successful,
      failed,
      results,
      expiredSubscriptions,
    };
  }
}

/**
 * Create a Web Push provider from environment variables
 *
 * @param env - Environment variables object
 * @returns Configured WebPushProvider or undefined if not configured
 */
export function createWebPushProvider(env: {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}): WebPushProvider | undefined {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT ?? 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    return undefined;
  }

  return new WebPushProvider({ publicKey, privateKey, subject });
}
