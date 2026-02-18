// main/server/core/src/billing/subscription-lifecycle.ts
/**
 * Subscription Lifecycle State Machine
 *
 * Pure functions for subscription state transitions, trial handling,
 * and upgrade/downgrade plan changes. No database or provider access
 * -- all functions take data in and return results out.
 *
 * @module billing/subscription-lifecycle
 */

import { MS_PER_DAY } from '@bslt/shared';

import type { SubscriptionStatus } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

/** Events that drive subscription state transitions */
export type SubscriptionEvent =
  | 'payment_success'
  | 'payment_failure'
  | 'cancel_request'
  | 'cancel_immediate'
  | 'grace_period_expire'
  | 'trial_end_payment_success'
  | 'trial_end_payment_failure'
  | 'resume';

/** Subscription states that participate in the state machine */
export type LifecycleState = Extract<
  SubscriptionStatus,
  'trialing' | 'active' | 'past_due' | 'canceled'
>;

/** A single allowed transition edge */
interface TransitionEdge {
  readonly from: LifecycleState;
  readonly event: SubscriptionEvent;
  readonly to: LifecycleState;
}

/** Result of a state transition attempt */
export interface TransitionResult {
  /** Whether the transition succeeded */
  readonly valid: boolean;
  /** The resulting state (unchanged if invalid) */
  readonly state: LifecycleState;
}

/** Input for trial expiry checks */
export interface TrialSubscription {
  readonly status: SubscriptionStatus;
  readonly trialEnd: Date | string | null;
}

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * All allowed state transitions.
 *
 * Each edge maps (from, event) -> to.
 * Any combination not listed is an invalid transition.
 */
const TRANSITIONS: readonly TransitionEdge[] = [
  // trialing transitions
  { from: 'trialing', event: 'trial_end_payment_success', to: 'active' },
  { from: 'trialing', event: 'payment_success', to: 'active' },
  { from: 'trialing', event: 'cancel_request', to: 'canceled' },
  { from: 'trialing', event: 'cancel_immediate', to: 'canceled' },
  { from: 'trialing', event: 'trial_end_payment_failure', to: 'past_due' },

  // active transitions
  { from: 'active', event: 'payment_failure', to: 'past_due' },
  { from: 'active', event: 'cancel_request', to: 'canceled' },
  { from: 'active', event: 'cancel_immediate', to: 'canceled' },

  // past_due transitions
  { from: 'past_due', event: 'payment_success', to: 'active' },
  { from: 'past_due', event: 'grace_period_expire', to: 'canceled' },
  { from: 'past_due', event: 'cancel_immediate', to: 'canceled' },
];

/**
 * Pre-computed lookup for O(1) transition checks.
 * Key format: `${from}:${event}`
 */
const TRANSITION_MAP = new Map<string, LifecycleState>(
  TRANSITIONS.map((t) => [`${t.from}:${t.event}`, t.to]),
);

// ============================================================================
// State Machine Functions
// ============================================================================

/**
 * Transition a subscription from one state to another based on an event.
 *
 * Pure function -- no side effects. Returns a result indicating whether
 * the transition is valid and what the new state is.
 *
 * @param currentState - Current subscription state
 * @param event - The event triggering the transition
 * @returns TransitionResult with validity flag and resulting state
 * @complexity O(1) - map lookup
 */
export function transitionSubscriptionState(
  currentState: LifecycleState,
  event: SubscriptionEvent,
): TransitionResult {
  const key = `${currentState}:${event}`;
  const nextState = TRANSITION_MAP.get(key);

  if (nextState === undefined) {
    return { valid: false, state: currentState };
  }

  return { valid: true, state: nextState };
}

/**
 * Check whether a transition from one state to another is valid
 * via any event.
 *
 * @param from - Source state
 * @param to - Target state
 * @returns Whether any event can cause this transition
 * @complexity O(n) where n = number of transitions (small constant)
 */
export function isValidTransition(from: LifecycleState, to: LifecycleState): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/**
 * Get all valid events for a given state.
 *
 * @param state - Current subscription state
 * @returns Array of valid events
 * @complexity O(n) where n = number of transitions (small constant)
 */
export function getValidEvents(state: LifecycleState): SubscriptionEvent[] {
  return TRANSITIONS.filter((t) => t.from === state).map((t) => t.event);
}

// ============================================================================
// Trial Expiry Functions
// ============================================================================

/**
 * Check whether a subscription's trial has expired.
 *
 * A trial is expired when the subscription is in trialing state
 * and the trial end date is in the past (or now).
 *
 * @param subscription - Subscription with status and trialEnd
 * @param now - Current time (defaults to Date.now() for testability)
 * @returns Whether the trial has expired
 * @complexity O(1)
 */
export function checkTrialExpiry(subscription: TrialSubscription, now?: Date): boolean {
  if (subscription.status !== 'trialing') {
    return false;
  }

  if (subscription.trialEnd === null) {
    return false;
  }

  const trialEndDate =
    typeof subscription.trialEnd === 'string'
      ? new Date(subscription.trialEnd)
      : subscription.trialEnd;

  const currentTime = now ?? new Date();
  return trialEndDate.getTime() <= currentTime.getTime();
}

/**
 * Get the number of days remaining in a trial.
 *
 * Returns 0 if the trial has expired or the subscription is not trialing.
 * Returns the fractional days remaining, floored to whole days.
 *
 * @param subscription - Subscription with status and trialEnd
 * @param now - Current time (defaults to Date.now() for testability)
 * @returns Number of whole days remaining (0 if expired or not trialing)
 * @complexity O(1)
 */
export function getTrialDaysRemaining(subscription: TrialSubscription, now?: Date): number {
  if (subscription.status !== 'trialing') {
    return 0;
  }

  if (subscription.trialEnd === null) {
    return 0;
  }

  const trialEndDate =
    typeof subscription.trialEnd === 'string'
      ? new Date(subscription.trialEnd)
      : subscription.trialEnd;

  const currentTime = now ?? new Date();
  const diffMs = trialEndDate.getTime() - currentTime.getTime();

  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / MS_PER_DAY);
}
