// apps/server/src/infrastructure/notifications/types.ts
/**
 * Push Notification Provider Types
 *
 * Interfaces for implementing push notification providers.
 */

import type {
  BatchSendResult,
  NotificationPayload,
  PushSubscription,
  SendResult,
} from '@abe-stack/core';

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Push notification provider interface
 *
 * Implementations handle the actual sending of push notifications
 * to different push services (FCM, APNs, etc.)
 */
export interface PushNotificationProvider {
  /** Provider name for identification */
  readonly name: string;

  /**
   * Send a notification to a single subscription
   *
   * @param subscription - Push subscription to send to
   * @param payload - Notification payload
   * @param options - Additional send options
   * @returns Send result
   */
  send(
    subscription: PushSubscription,
    payload: NotificationPayload,
    options?: SendOptions,
  ): Promise<SendResult>;

  /**
   * Send notifications to multiple subscriptions
   *
   * @param subscriptions - Array of subscriptions with their IDs
   * @param payload - Notification payload
   * @param options - Additional send options
   * @returns Batch send result with success/failure counts
   */
  sendBatch(
    subscriptions: SubscriptionWithId[],
    payload: NotificationPayload,
    options?: SendOptions,
  ): Promise<BatchSendResult>;

  /**
   * Check if the provider is properly configured
   *
   * @returns true if provider is ready to send
   */
  isConfigured(): boolean;

  /**
   * Get the public key for client subscription (if applicable)
   *
   * @returns Public key string or undefined if not applicable
   */
  getPublicKey(): string | undefined;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Subscription with associated ID for tracking
 */
export interface SubscriptionWithId {
  /** Unique subscription ID */
  id: string;
  /** Push subscription data */
  subscription: PushSubscription;
}

/**
 * Options for sending notifications
 */
export interface SendOptions {
  /** Time-to-live in seconds (how long push service should retry) */
  ttl?: number;
  /** Urgency level */
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  /** Topic for message collapsing */
  topic?: string;
}

/**
 * FCM configuration
 */
export interface FcmConfig {
  /** FCM server key or service account credentials */
  credentials: string;
  /** FCM project ID */
  projectId: string;
}

/**
 * Provider configuration union type
 */
export type ProviderConfig = {
  type: 'fcm';
  fcm: FcmConfig;
};

// ============================================================================
// Factory Types
// ============================================================================

/**
 * Options for creating notification providers
 */
export interface NotificationFactoryOptions {
  /** FCM configuration */
  fcm?: FcmConfig;
  /** Default TTL for notifications (seconds) */
  defaultTtl?: number;
}

/**
 * Notification service aggregating multiple providers
 */
export interface NotificationService {
  /** Get the FCM provider */
  getFcmProvider(): PushNotificationProvider | undefined;

  /** Check if any provider is configured */
  isConfigured(): boolean;
}
