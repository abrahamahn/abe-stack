// main/server/core/src/webhooks/delivery.ts
/**
 * Webhook Delivery Service
 *
 * Handles webhook event dispatching, payload signing, signature verification,
 * and retry scheduling. The actual HTTP POST to consumer endpoints is designed
 * to be called by a job queue worker -- this module creates delivery records
 * and provides the signing/retry logic.
 *
 * @module delivery
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import { MS_PER_MINUTE } from '@bslt/shared';

import { MAX_DELIVERY_ATTEMPTS, RETRY_DELAYS_MINUTES, WEBHOOK_RESPONSE_MAX_LENGTH } from './types';

import type { WebhookDispatchResult } from './types';
import type { Repositories, WebhookDelivery } from '../../../db/src';

// ============================================================================
// HMAC Signature Functions
// ============================================================================

/**
 * Sign a webhook payload using HMAC-SHA256.
 *
 * Produces a hex-encoded signature suitable for the `X-Webhook-Signature`
 * header. Consumers verify this signature using the shared secret.
 *
 * @param payload - JSON string payload to sign
 * @param secret - Shared secret for HMAC computation
 * @returns Hex-encoded HMAC-SHA256 signature
 * @complexity O(n) where n is payload length
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify a webhook signature using timing-safe comparison.
 *
 * Prevents timing attacks by using constant-time comparison.
 * Returns false if signature format is invalid or does not match.
 *
 * @param payload - JSON string payload that was signed
 * @param signature - Hex-encoded signature to verify
 * @param secret - Shared secret for HMAC computation
 * @returns True if the signature is valid
 * @complexity O(n) where n is payload length
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);

  // Both must be valid hex strings of equal length
  if (expected.length !== signature.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate the delay in milliseconds before the next retry attempt.
 *
 * Uses a fixed exponential backoff schedule:
 * - Attempt 1: 1 minute
 * - Attempt 2: 5 minutes
 * - Attempt 3: 30 minutes
 * - Attempt 4: 2 hours
 * - Attempt 5: 12 hours
 *
 * Returns null if attempts exceed the maximum, indicating no more retries.
 *
 * @param attemptNumber - Current attempt number (1-indexed)
 * @returns Delay in milliseconds, or null if no more retries
 * @complexity O(1)
 */
export function calculateRetryDelay(attemptNumber: number): number | null {
  if (attemptNumber < 1 || attemptNumber > MAX_DELIVERY_ATTEMPTS) {
    return null;
  }

  const index = attemptNumber - 1;
  const delayMinutes = RETRY_DELAYS_MINUTES[index];

  if (delayMinutes === undefined) {
    return null;
  }

  return delayMinutes * MS_PER_MINUTE;
}

// ============================================================================
// Event Dispatching
// ============================================================================

/**
 * Dispatch a webhook event to all matching subscriptions for a tenant.
 *
 * Finds all active webhooks subscribed to the given event type,
 * then creates a pending delivery record for each match. The actual
 * HTTP POST is performed by the job queue worker, not here.
 *
 * @param repos - Repository container
 * @param tenantId - Tenant that triggered the event
 * @param eventType - Event type string (e.g., "user.created")
 * @param payload - Event payload to deliver
 * @returns Array of dispatch results (one per matching webhook)
 * @complexity O(n) where n is the number of matching webhooks
 */
export async function dispatchWebhookEvent(
  repos: Repositories,
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<WebhookDispatchResult[]> {
  // Find all active webhooks that subscribe to this event type
  const webhooks = await repos.webhooks.findActiveByEvent(eventType);

  // Filter to only webhooks belonging to this tenant
  const tenantWebhooks = webhooks.filter((w) => w.tenantId === tenantId);

  if (tenantWebhooks.length === 0) {
    return [];
  }

  const results: WebhookDispatchResult[] = [];

  for (const webhook of tenantWebhooks) {
    const delivery = await repos.webhookDeliveries.create({
      webhookId: webhook.id,
      eventType,
      payload,
      status: 'pending',
      attempts: 0,
    });

    results.push({
      webhookId: webhook.id,
      deliveryId: delivery.id,
      eventType,
      status: delivery.status,
    });
  }

  return results;
}

/**
 * Record the result of a delivery attempt.
 *
 * Updates the delivery record with the response status and body.
 * If delivery succeeded (2xx), marks as delivered. If failed,
 * either schedules a retry or marks as dead if max attempts reached.
 *
 * @param repos - Repository container
 * @param deliveryId - Delivery record ID to update
 * @param responseStatus - HTTP response status code from the consumer
 * @param responseBody - HTTP response body from the consumer (truncated)
 * @returns Updated delivery record, or null if not found
 * @complexity O(1)
 */
export async function recordDeliveryResult(
  repos: Repositories,
  deliveryId: string,
  responseStatus: number,
  responseBody: string,
): Promise<WebhookDelivery | null> {
  const delivery = await repos.webhookDeliveries.findById(deliveryId);

  if (delivery === null) {
    return null;
  }

  const newAttempts = delivery.attempts + 1;
  const isSuccess = responseStatus >= 200 && responseStatus < 300;

  if (isSuccess) {
    return repos.webhookDeliveries.update(deliveryId, {
      responseStatus,
      responseBody: responseBody.slice(0, WEBHOOK_RESPONSE_MAX_LENGTH),
      status: 'delivered',
      attempts: newAttempts,
      deliveredAt: new Date(),
      nextRetryAt: null,
    });
  }

  // Delivery failed -- schedule retry or mark as dead
  const retryDelay = calculateRetryDelay(newAttempts);

  if (retryDelay === null || newAttempts >= MAX_DELIVERY_ATTEMPTS) {
    return repos.webhookDeliveries.update(deliveryId, {
      responseStatus,
      responseBody: responseBody.slice(0, WEBHOOK_RESPONSE_MAX_LENGTH),
      status: 'dead',
      attempts: newAttempts,
      nextRetryAt: null,
    });
  }

  const nextRetryAt = new Date(Date.now() + retryDelay);

  return repos.webhookDeliveries.update(deliveryId, {
    responseStatus,
    responseBody: responseBody.slice(0, WEBHOOK_RESPONSE_MAX_LENGTH),
    status: 'failed',
    attempts: newAttempts,
    nextRetryAt,
  });
}
