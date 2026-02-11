// src/server/core/src/billing/subscription-lifecycle.test.ts
/**
 * Subscription Lifecycle State Machine Tests
 *
 * Validates all state transitions, trial expiry logic,
 * and edge cases in the subscription lifecycle.
 */

import { describe, expect, it } from 'vitest';

import {
  checkTrialExpiry,
  getTrialDaysRemaining,
  getValidEvents,
  isValidTransition,
  transitionSubscriptionState,
} from './subscription-lifecycle';

import type {
  LifecycleState,
  SubscriptionEvent,
  TrialSubscription,
} from './subscription-lifecycle';

// ============================================================================
// transitionSubscriptionState
// ============================================================================

describe('transitionSubscriptionState', () => {
  // --------------------------------------------------------------------------
  // Trialing transitions
  // --------------------------------------------------------------------------
  describe('from trialing', () => {
    it('should transition to active on trial_end_payment_success', () => {
      const result = transitionSubscriptionState('trialing', 'trial_end_payment_success');
      expect(result).toEqual({ valid: true, state: 'active' });
    });

    it('should transition to active on payment_success', () => {
      const result = transitionSubscriptionState('trialing', 'payment_success');
      expect(result).toEqual({ valid: true, state: 'active' });
    });

    it('should transition to canceled on cancel_request', () => {
      const result = transitionSubscriptionState('trialing', 'cancel_request');
      expect(result).toEqual({ valid: true, state: 'canceled' });
    });

    it('should transition to canceled on cancel_immediate', () => {
      const result = transitionSubscriptionState('trialing', 'cancel_immediate');
      expect(result).toEqual({ valid: true, state: 'canceled' });
    });

    it('should transition to past_due on trial_end_payment_failure', () => {
      const result = transitionSubscriptionState('trialing', 'trial_end_payment_failure');
      expect(result).toEqual({ valid: true, state: 'past_due' });
    });

    it('should reject invalid event payment_failure from trialing', () => {
      const result = transitionSubscriptionState('trialing', 'payment_failure');
      expect(result).toEqual({ valid: false, state: 'trialing' });
    });

    it('should reject resume from trialing', () => {
      const result = transitionSubscriptionState('trialing', 'resume');
      expect(result).toEqual({ valid: false, state: 'trialing' });
    });
  });

  // --------------------------------------------------------------------------
  // Active transitions
  // --------------------------------------------------------------------------
  describe('from active', () => {
    it('should transition to past_due on payment_failure', () => {
      const result = transitionSubscriptionState('active', 'payment_failure');
      expect(result).toEqual({ valid: true, state: 'past_due' });
    });

    it('should transition to canceled on cancel_request (at period end)', () => {
      const result = transitionSubscriptionState('active', 'cancel_request');
      expect(result).toEqual({ valid: true, state: 'canceled' });
    });

    it('should transition to canceled on cancel_immediate', () => {
      const result = transitionSubscriptionState('active', 'cancel_immediate');
      expect(result).toEqual({ valid: true, state: 'canceled' });
    });

    it('should reject payment_success from active (already active)', () => {
      const result = transitionSubscriptionState('active', 'payment_success');
      expect(result).toEqual({ valid: false, state: 'active' });
    });

    it('should reject grace_period_expire from active', () => {
      const result = transitionSubscriptionState('active', 'grace_period_expire');
      expect(result).toEqual({ valid: false, state: 'active' });
    });
  });

  // --------------------------------------------------------------------------
  // Past due transitions
  // --------------------------------------------------------------------------
  describe('from past_due', () => {
    it('should transition to active on payment_success', () => {
      const result = transitionSubscriptionState('past_due', 'payment_success');
      expect(result).toEqual({ valid: true, state: 'active' });
    });

    it('should transition to canceled on grace_period_expire', () => {
      const result = transitionSubscriptionState('past_due', 'grace_period_expire');
      expect(result).toEqual({ valid: true, state: 'canceled' });
    });

    it('should transition to canceled on cancel_immediate', () => {
      const result = transitionSubscriptionState('past_due', 'cancel_immediate');
      expect(result).toEqual({ valid: true, state: 'canceled' });
    });

    it('should reject cancel_request from past_due', () => {
      const result = transitionSubscriptionState('past_due', 'cancel_request');
      expect(result).toEqual({ valid: false, state: 'past_due' });
    });
  });

  // --------------------------------------------------------------------------
  // Canceled transitions (terminal state)
  // --------------------------------------------------------------------------
  describe('from canceled', () => {
    it('should reject all events from canceled state', () => {
      const events: SubscriptionEvent[] = [
        'payment_success',
        'payment_failure',
        'cancel_request',
        'cancel_immediate',
        'grace_period_expire',
        'trial_end_payment_success',
        'trial_end_payment_failure',
        'resume',
      ];

      for (const event of events) {
        const result = transitionSubscriptionState('canceled', event);
        expect(result).toEqual({ valid: false, state: 'canceled' });
      }
    });
  });
});

// ============================================================================
// isValidTransition
// ============================================================================

describe('isValidTransition', () => {
  it('should return true for trialing -> active', () => {
    expect(isValidTransition('trialing', 'active')).toBe(true);
  });

  it('should return true for trialing -> canceled', () => {
    expect(isValidTransition('trialing', 'canceled')).toBe(true);
  });

  it('should return true for trialing -> past_due', () => {
    expect(isValidTransition('trialing', 'past_due')).toBe(true);
  });

  it('should return true for active -> past_due', () => {
    expect(isValidTransition('active', 'past_due')).toBe(true);
  });

  it('should return true for active -> canceled', () => {
    expect(isValidTransition('active', 'canceled')).toBe(true);
  });

  it('should return true for past_due -> active', () => {
    expect(isValidTransition('past_due', 'active')).toBe(true);
  });

  it('should return true for past_due -> canceled', () => {
    expect(isValidTransition('past_due', 'canceled')).toBe(true);
  });

  it('should return false for canceled -> active (terminal state)', () => {
    expect(isValidTransition('canceled', 'active')).toBe(false);
  });

  it('should return false for active -> trialing (invalid)', () => {
    expect(isValidTransition('active', 'trialing')).toBe(false);
  });

  it('should return false for same state transitions', () => {
    const states: LifecycleState[] = ['trialing', 'active', 'past_due', 'canceled'];
    for (const state of states) {
      expect(isValidTransition(state, state)).toBe(false);
    }
  });
});

// ============================================================================
// getValidEvents
// ============================================================================

describe('getValidEvents', () => {
  it('should return all valid events for trialing state', () => {
    const events = getValidEvents('trialing');
    expect(events).toContain('trial_end_payment_success');
    expect(events).toContain('payment_success');
    expect(events).toContain('cancel_request');
    expect(events).toContain('cancel_immediate');
    expect(events).toContain('trial_end_payment_failure');
    expect(events).toHaveLength(5);
  });

  it('should return all valid events for active state', () => {
    const events = getValidEvents('active');
    expect(events).toContain('payment_failure');
    expect(events).toContain('cancel_request');
    expect(events).toContain('cancel_immediate');
    expect(events).toHaveLength(3);
  });

  it('should return all valid events for past_due state', () => {
    const events = getValidEvents('past_due');
    expect(events).toContain('payment_success');
    expect(events).toContain('grace_period_expire');
    expect(events).toContain('cancel_immediate');
    expect(events).toHaveLength(3);
  });

  it('should return empty array for canceled state', () => {
    const events = getValidEvents('canceled');
    expect(events).toEqual([]);
  });
});

// ============================================================================
// checkTrialExpiry
// ============================================================================

describe('checkTrialExpiry', () => {
  it('should return true when trial has expired (Date object)', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sub: TrialSubscription = { status: 'trialing', trialEnd: pastDate };
    expect(checkTrialExpiry(sub)).toBe(true);
  });

  it('should return true when trial has expired (ISO string)', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sub: TrialSubscription = { status: 'trialing', trialEnd: pastDate.toISOString() };
    expect(checkTrialExpiry(sub)).toBe(true);
  });

  it('should return true when trial end is exactly now', () => {
    const now = new Date('2026-02-01T12:00:00Z');
    const sub: TrialSubscription = { status: 'trialing', trialEnd: now };
    expect(checkTrialExpiry(sub, now)).toBe(true);
  });

  it('should return false when trial has not expired', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sub: TrialSubscription = { status: 'trialing', trialEnd: futureDate };
    expect(checkTrialExpiry(sub)).toBe(false);
  });

  it('should return false when subscription is not trialing', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sub: TrialSubscription = { status: 'active', trialEnd: pastDate };
    expect(checkTrialExpiry(sub)).toBe(false);
  });

  it('should return false when trialEnd is null', () => {
    const sub: TrialSubscription = { status: 'trialing', trialEnd: null };
    expect(checkTrialExpiry(sub)).toBe(false);
  });

  it('should use injected now parameter for deterministic testing', () => {
    const trialEnd = new Date('2026-03-01T00:00:00Z');
    const sub: TrialSubscription = { status: 'trialing', trialEnd };

    const before = new Date('2026-02-28T00:00:00Z');
    expect(checkTrialExpiry(sub, before)).toBe(false);

    const after = new Date('2026-03-02T00:00:00Z');
    expect(checkTrialExpiry(sub, after)).toBe(true);
  });
});

// ============================================================================
// getTrialDaysRemaining
// ============================================================================

describe('getTrialDaysRemaining', () => {
  it('should return correct days when trial is active', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    const trialEnd = new Date('2026-02-15T00:00:00Z');
    const sub: TrialSubscription = { status: 'trialing', trialEnd };

    expect(getTrialDaysRemaining(sub, now)).toBe(14);
  });

  it('should floor partial days', () => {
    const now = new Date('2026-02-01T12:00:00Z');
    const trialEnd = new Date('2026-02-15T00:00:00Z');
    const sub: TrialSubscription = { status: 'trialing', trialEnd };

    // 13.5 days -> floors to 13
    expect(getTrialDaysRemaining(sub, now)).toBe(13);
  });

  it('should return 0 when trial has expired', () => {
    const now = new Date('2026-03-01T00:00:00Z');
    const trialEnd = new Date('2026-02-15T00:00:00Z');
    const sub: TrialSubscription = { status: 'trialing', trialEnd };

    expect(getTrialDaysRemaining(sub, now)).toBe(0);
  });

  it('should return 0 when trial ends exactly now', () => {
    const now = new Date('2026-02-15T00:00:00Z');
    const sub: TrialSubscription = { status: 'trialing', trialEnd: now };

    expect(getTrialDaysRemaining(sub, now)).toBe(0);
  });

  it('should return 0 when subscription is not trialing', () => {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sub: TrialSubscription = { status: 'active', trialEnd };

    expect(getTrialDaysRemaining(sub)).toBe(0);
  });

  it('should return 0 when trialEnd is null', () => {
    const sub: TrialSubscription = { status: 'trialing', trialEnd: null };
    expect(getTrialDaysRemaining(sub)).toBe(0);
  });

  it('should handle ISO string trialEnd', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    const sub: TrialSubscription = { status: 'trialing', trialEnd: '2026-02-08T00:00:00Z' };

    expect(getTrialDaysRemaining(sub, now)).toBe(7);
  });

  it('should return 0 for canceled subscription even with future trialEnd', () => {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sub: TrialSubscription = { status: 'canceled', trialEnd };

    expect(getTrialDaysRemaining(sub)).toBe(0);
  });
});
