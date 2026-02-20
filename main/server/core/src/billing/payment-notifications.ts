// main/server/core/src/billing/payment-notifications.ts
/**
 * Payment Failure Notifications
 *
 * Sends email and in-app notifications for payment lifecycle events:
 * failed payments, successful retries, and account suspensions due
 * to prolonged non-payment. Designed to be called from webhook
 * handlers and the dunning cron job.
 *
 * @module billing/payment-notifications
 */

import type { NotificationRepository } from '../../../db/src';
import type { EmailService } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

/** Dependencies for payment notification operations */
export interface PaymentNotificationDeps {
  /** Email service for sending transactional emails */
  readonly email: EmailService;
  /** In-app notification repository for persistent alerts */
  readonly notifications: NotificationRepository;
}

/** Result of a notification send attempt */
export interface NotificationResult {
  /** Whether the email was sent successfully */
  readonly emailSent: boolean;
  /** Whether the in-app notification was created successfully */
  readonly inAppCreated: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Cents per dollar for formatting currency amounts */
const CENTS_PER_DOLLAR = 100;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a cents amount as a dollar string for display.
 *
 * @param amountInCents - Amount in cents (e.g. 2999)
 * @returns Formatted dollar string (e.g. "$29.99")
 * @complexity O(1)
 */
function formatAmount(amountInCents: number): string {
  const dollars = (amountInCents / CENTS_PER_DOLLAR).toFixed(2);
  return `$${dollars}`;
}

// ============================================================================
// Notification Functions
// ============================================================================

/**
 * Notify a user that their payment has failed.
 *
 * Sends both an email and an in-app notification alerting the user
 * that their most recent payment could not be processed. The email
 * includes the invoice amount and a prompt to update their payment
 * method.
 *
 * @param deps - Email service and notification repository
 * @param userId - User to notify
 * @param userEmail - User's email address for the transactional email
 * @param invoiceAmountCents - Failed invoice amount in cents
 * @returns Result indicating which notifications were sent
 * @complexity O(1) - one email send and one database insert
 */
export async function notifyPaymentFailed(
  deps: PaymentNotificationDeps,
  userId: string,
  userEmail: string,
  invoiceAmountCents: number,
): Promise<NotificationResult> {
  const amount = formatAmount(invoiceAmountCents);

  let emailSent = false;
  let inAppCreated = false;

  // Send email notification
  try {
    const emailResult = await deps.email.send({
      to: userEmail,
      subject: 'Payment failed - action required',
      text: [
        'We were unable to process your payment.',
        '',
        `Amount: ${amount}`,
        '',
        'Please update your payment method to avoid service interruption.',
        'Your account will remain active during a 14-day grace period.',
        '',
        'If you need help, please contact our support team.',
      ].join('\n'),
      html: [
        '<h2>Payment Failed</h2>',
        '<p>We were unable to process your payment.</p>',
        `<p><strong>Amount:</strong> ${amount}</p>`,
        '<p>Please update your payment method to avoid service interruption.</p>',
        '<p>Your account will remain active during a <strong>14-day grace period</strong>.</p>',
        '<p>If you need help, please contact our support team.</p>',
      ].join('\n'),
    });
    emailSent = emailResult.success;
  } catch {
    emailSent = false;
  }

  // Create in-app notification
  try {
    await deps.notifications.create({
      userId,
      type: 'warning',
      title: 'Payment failed',
      message: `We were unable to process your payment of ${amount}. Please update your payment method to avoid service interruption.`,
      data: {
        category: 'billing',
        action: 'payment_failed',
        invoiceAmountCents,
      },
    });
    inAppCreated = true;
  } catch {
    inAppCreated = false;
  }

  return { emailSent, inAppCreated };
}

/**
 * Notify a user that their payment retry was successful.
 *
 * Sends both an email and an in-app notification confirming that
 * the previously failed payment has been processed and their
 * subscription is restored to active status.
 *
 * @param deps - Email service and notification repository
 * @param userId - User to notify
 * @param userEmail - User's email address for the transactional email
 * @returns Result indicating which notifications were sent
 * @complexity O(1) - one email send and one database insert
 */
export async function notifyPaymentRetrySuccess(
  deps: PaymentNotificationDeps,
  userId: string,
  userEmail: string,
): Promise<NotificationResult> {
  let emailSent = false;
  let inAppCreated = false;

  // Send email notification
  try {
    const emailResult = await deps.email.send({
      to: userEmail,
      subject: 'Payment successful - subscription restored',
      text: [
        'Great news! Your payment has been processed successfully.',
        '',
        'Your subscription has been restored to active status.',
        'All features are now fully available again.',
        '',
        'Thank you for your continued support.',
      ].join('\n'),
      html: [
        '<h2>Payment Successful</h2>',
        '<p>Great news! Your payment has been processed successfully.</p>',
        '<p>Your subscription has been <strong>restored to active status</strong>.</p>',
        '<p>All features are now fully available again.</p>',
        '<p>Thank you for your continued support.</p>',
      ].join('\n'),
    });
    emailSent = emailResult.success;
  } catch {
    emailSent = false;
  }

  // Create in-app notification
  try {
    await deps.notifications.create({
      userId,
      type: 'success',
      title: 'Payment successful',
      message: 'Your payment has been processed and your subscription is now active.',
      data: {
        category: 'billing',
        action: 'payment_retry_success',
      },
    });
    inAppCreated = true;
  } catch {
    inAppCreated = false;
  }

  return { emailSent, inAppCreated };
}

/**
 * Notify a user that their account has been suspended due to non-payment.
 *
 * Sends both an email and an in-app notification informing the user
 * that their subscription has been canceled after the grace period
 * expired. The notification includes the reason and guidance for
 * re-subscribing.
 *
 * @param deps - Email service and notification repository
 * @param userId - User to notify
 * @param userEmail - User's email address for the transactional email
 * @param reason - Reason for the suspension (e.g. 'grace_period_expired')
 * @returns Result indicating which notifications were sent
 * @complexity O(1) - one email send and one database insert
 */
export async function notifyAccountSuspended(
  deps: PaymentNotificationDeps,
  userId: string,
  userEmail: string,
  reason: string,
): Promise<NotificationResult> {
  let emailSent = false;
  let inAppCreated = false;

  // Send email notification
  try {
    const emailResult = await deps.email.send({
      to: userEmail,
      subject: 'Account suspended - subscription canceled',
      text: [
        'Your subscription has been canceled due to non-payment.',
        '',
        `Reason: ${reason}`,
        '',
        'Your account has been downgraded to the free tier.',
        'To restore your subscription, please update your payment method and re-subscribe.',
        '',
        'If you believe this is an error, please contact our support team.',
      ].join('\n'),
      html: [
        '<h2>Account Suspended</h2>',
        '<p>Your subscription has been <strong>canceled</strong> due to non-payment.</p>',
        `<p><strong>Reason:</strong> ${reason}</p>`,
        '<p>Your account has been downgraded to the free tier.</p>',
        '<p>To restore your subscription, please update your payment method and re-subscribe.</p>',
        '<p>If you believe this is an error, please contact our support team.</p>',
      ].join('\n'),
    });
    emailSent = emailResult.success;
  } catch {
    emailSent = false;
  }

  // Create in-app notification
  try {
    await deps.notifications.create({
      userId,
      type: 'error',
      title: 'Account suspended',
      message: `Your subscription has been canceled due to non-payment. Reason: ${reason}. Please update your payment method to re-subscribe.`,
      data: {
        category: 'billing',
        action: 'account_suspended',
        reason,
      },
    });
    inAppCreated = true;
  } catch {
    inAppCreated = false;
  }

  return { emailSent, inAppCreated };
}
