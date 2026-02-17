// main/shared/src/engine/webhooks/webhooks.logic.test.ts
import { describe, expect, it } from 'vitest';

import {
  calculateRetryDelay,
  isDeliveryTerminal,
  matchesEventFilter,
  shouldRetryDelivery,
} from './webhooks.logic';

import type { WebhookDeliveryStatus } from './webhooks.schemas';

describe('webhooks.logic', () => {
  // ==========================================================================
  // matchesEventFilter
  // ==========================================================================
  describe('matchesEventFilter', () => {
    it('matches exact event type', () => {
      expect(matchesEventFilter('user.created', { events: ['user.created'] })).toBe(true);
    });

    it('does not match different event type', () => {
      expect(matchesEventFilter('user.deleted', { events: ['user.created'] })).toBe(false);
    });

    it('matches wildcard "*" to any event', () => {
      expect(matchesEventFilter('user.created', { events: ['*'] })).toBe(true);
      expect(matchesEventFilter('billing.invoice.paid', { events: ['*'] })).toBe(true);
    });

    it('matches prefix wildcard "billing.*" to billing events', () => {
      expect(matchesEventFilter('billing.invoice.created', { events: ['billing.*'] })).toBe(true);
      expect(matchesEventFilter('billing.payment.failed', { events: ['billing.*'] })).toBe(true);
    });

    it('does not match prefix wildcard to unrelated events', () => {
      expect(matchesEventFilter('user.created', { events: ['billing.*'] })).toBe(false);
    });

    it('matches if any filter in the array matches', () => {
      expect(
        matchesEventFilter('user.created', {
          events: ['billing.invoice.paid', 'user.created'],
        }),
      ).toBe(true);
    });

    it('returns false for empty events array', () => {
      expect(matchesEventFilter('user.created', { events: [] })).toBe(false);
    });

    it('handles nested event types with prefix wildcard', () => {
      expect(matchesEventFilter('billing.subscription.renewed', { events: ['billing.*'] })).toBe(
        true,
      );
    });

    it('does not treat non-trailing wildcard as glob', () => {
      // "*.created" should not be treated as a wildcard prefix pattern
      expect(matchesEventFilter('user.created', { events: ['*.created'] })).toBe(false);
    });

    it('matches exact string even if it contains a dot', () => {
      expect(
        matchesEventFilter('billing.invoice.paid', {
          events: ['billing.invoice.paid'],
        }),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // isDeliveryTerminal
  // ==========================================================================
  describe('isDeliveryTerminal', () => {
    it('returns true for "delivered"', () => {
      expect(isDeliveryTerminal({ status: 'delivered' })).toBe(true);
    });

    it('returns true for "dead"', () => {
      expect(isDeliveryTerminal({ status: 'dead' })).toBe(true);
    });

    it('returns false for "pending"', () => {
      expect(isDeliveryTerminal({ status: 'pending' })).toBe(false);
    });

    it('returns false for "failed"', () => {
      expect(isDeliveryTerminal({ status: 'failed' })).toBe(false);
    });

    it('identifies all terminal statuses correctly', () => {
      const allStatuses: WebhookDeliveryStatus[] = ['pending', 'delivered', 'failed', 'dead'];
      const terminal = allStatuses.filter((s) => isDeliveryTerminal({ status: s }));
      expect(terminal).toEqual(['delivered', 'dead']);
    });
  });

  // ==========================================================================
  // shouldRetryDelivery
  // ==========================================================================
  describe('shouldRetryDelivery', () => {
    it('returns true when not terminal and under max attempts', () => {
      expect(shouldRetryDelivery({ status: 'pending', attempts: 1 }, 5)).toBe(true);
    });

    it('returns true for failed delivery under max attempts', () => {
      expect(shouldRetryDelivery({ status: 'failed', attempts: 3 }, 5)).toBe(true);
    });

    it('returns false for terminal delivery even under max attempts', () => {
      expect(shouldRetryDelivery({ status: 'delivered', attempts: 1 }, 5)).toBe(false);
      expect(shouldRetryDelivery({ status: 'dead', attempts: 1 }, 5)).toBe(false);
    });

    it('returns false when attempts >= maxAttempts', () => {
      expect(shouldRetryDelivery({ status: 'failed', attempts: 5 }, 5)).toBe(false);
    });

    it('returns false when attempts exceed maxAttempts', () => {
      expect(shouldRetryDelivery({ status: 'failed', attempts: 10 }, 5)).toBe(false);
    });

    it('uses default maxAttempts of 5', () => {
      expect(shouldRetryDelivery({ status: 'failed', attempts: 4 })).toBe(true);
      expect(shouldRetryDelivery({ status: 'failed', attempts: 5 })).toBe(false);
    });
  });

  // ==========================================================================
  // calculateRetryDelay
  // ==========================================================================
  describe('calculateRetryDelay', () => {
    it('returns baseDelayMs for first attempt', () => {
      expect(calculateRetryDelay(1, 5000)).toBe(5000);
    });

    it('doubles delay for each subsequent attempt', () => {
      expect(calculateRetryDelay(1, 5000)).toBe(5000);
      expect(calculateRetryDelay(2, 5000)).toBe(10_000);
      expect(calculateRetryDelay(3, 5000)).toBe(20_000);
      expect(calculateRetryDelay(4, 5000)).toBe(40_000);
    });

    it('uses default base delay of 5000ms', () => {
      expect(calculateRetryDelay(1)).toBe(5000);
      expect(calculateRetryDelay(2)).toBe(10_000);
    });

    it('throws RangeError for attempts < 1', () => {
      expect(() => calculateRetryDelay(0)).toThrow(RangeError);
      expect(() => calculateRetryDelay(-1)).toThrow(RangeError);
    });

    it('handles large attempt counts', () => {
      expect(calculateRetryDelay(10, 5000)).toBe(5000 * Math.pow(2, 9));
    });
  });
});
