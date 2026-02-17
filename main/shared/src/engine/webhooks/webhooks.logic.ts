// main/shared/src/engine/webhooks/webhooks.logic.ts

/**
 * @file Webhook Domain Logic
 * @description Pure functions for webhook event matching and delivery retry logic.
 * @module Domain/Webhooks
 */

import type { Webhook, WebhookDelivery, WebhookDeliveryStatus } from './webhooks.schemas';

// ============================================================================
// Event Matching
// ============================================================================

/**
 * Checks whether a webhook subscribes to a given event type.
 * Supports exact matches and wildcard patterns (e.g. "billing.*").
 *
 * Matching rules:
 * - `"*"` matches all events
 * - `"billing.*"` matches `"billing.invoice.created"`, `"billing.payment.failed"`, etc.
 * - `"user.created"` matches only `"user.created"` exactly
 *
 * @param eventType - The event to check (e.g. "user.created")
 * @param webhook - The webhook with its event filter list
 * @returns `true` if the webhook should receive this event
 * @complexity O(n) where n = number of event filters
 */
export function matchesEventFilter(eventType: string, webhook: Pick<Webhook, 'events'>): boolean {
  for (const filter of webhook.events) {
    if (filter === '*') {
      return true;
    }
    if (filter === eventType) {
      return true;
    }
    // Wildcard prefix match: "billing.*" matches "billing.anything"
    if (filter.endsWith('.*')) {
      const prefix = filter.slice(0, -1); // "billing."
      if (eventType.startsWith(prefix)) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// Delivery State
// ============================================================================

/** Set of delivery statuses that represent a finished delivery */
const TERMINAL_DELIVERY_STATUSES: ReadonlySet<WebhookDeliveryStatus> = new Set([
  'delivered',
  'dead',
]);

/**
 * Checks whether a delivery is in a terminal state (no further retries).
 *
 * @param delivery - The delivery to evaluate
 * @returns `true` if `delivered` or `dead`
 * @complexity O(1) — Set lookup
 */
export function isDeliveryTerminal(delivery: Pick<WebhookDelivery, 'status'>): boolean {
  return TERMINAL_DELIVERY_STATUSES.has(delivery.status);
}

/**
 * Determines whether a failed delivery should be retried.
 * A delivery is retryable when it is not in a terminal state
 * and has not exceeded the maximum attempt count.
 *
 * @param delivery - The delivery to evaluate
 * @param maxAttempts - Maximum allowed attempts (default: 5)
 * @returns `true` if the delivery should be retried
 * @complexity O(1)
 */
export function shouldRetryDelivery(
  delivery: Pick<WebhookDelivery, 'status' | 'attempts'>,
  maxAttempts: number = 5,
): boolean {
  return !isDeliveryTerminal(delivery) && delivery.attempts < maxAttempts;
}

/**
 * Calculates exponential backoff delay for delivery retries.
 * Uses the formula: `baseDelayMs * 2^(attempts - 1)`.
 *
 * @param attempts - Number of attempts completed (must be >= 1)
 * @param baseDelayMs - Base delay in milliseconds (default: 5000)
 * @returns Delay in milliseconds before next retry
 * @throws {RangeError} If attempts < 1
 * @complexity O(1)
 */
export function calculateRetryDelay(attempts: number, baseDelayMs: number = 5000): number {
  if (attempts < 1) {
    throw new RangeError('attempts must be >= 1');
  }
  return baseDelayMs * Math.pow(2, attempts - 1);
}
