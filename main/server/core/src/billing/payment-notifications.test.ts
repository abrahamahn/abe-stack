// main/server/core/src/billing/payment-notifications.test.ts
/**
 * Payment Failure Notification Tests
 *
 * Validates email and in-app notifications for payment failures,
 * successful retries, and account suspensions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  notifyAccountSuspended,
  notifyPaymentFailed,
  notifyPaymentRetrySuccess,
} from './payment-notifications';

import type { PaymentNotificationDeps } from './payment-notifications';
import type { NotificationRepository } from '../../../db/src';
import type { EmailService } from '@bslt/shared';

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockEmailService(): EmailService {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
    healthCheck: vi.fn().mockResolvedValue(true),
  } as unknown as EmailService;
}

function createMockNotifications(): NotificationRepository {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      type: 'info',
      title: '',
      message: '',
      data: null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    }),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    countUnread: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    delete: vi.fn(),
  } as unknown as NotificationRepository;
}

function createMockDeps(): PaymentNotificationDeps {
  return {
    email: createMockEmailService(),
    notifications: createMockNotifications(),
  };
}

// ============================================================================
// notifyPaymentFailed
// ============================================================================

describe('notifyPaymentFailed', () => {
  let deps: PaymentNotificationDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should send both email and in-app notification', async () => {
    const result = await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 2999);

    expect(result.emailSent).toBe(true);
    expect(result.inAppCreated).toBe(true);
    expect(deps.email.send).toHaveBeenCalledTimes(1);
    expect(deps.notifications.create).toHaveBeenCalledTimes(1);
  });

  it('should send email with correct subject and formatted amount', async () => {
    await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 2999);

    expect(deps.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Payment failed - action required',
        text: expect.stringContaining('$29.99'),
        html: expect.stringContaining('$29.99'),
      }),
    );
  });

  it('should create in-app notification with warning type', async () => {
    await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 2999);

    expect(deps.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'warning',
        title: 'Payment failed',
        message: expect.stringContaining('$29.99'),
        data: expect.objectContaining({
          category: 'billing',
          action: 'payment_failed',
          invoiceAmountCents: 2999,
        }),
      }),
    );
  });

  it('should return emailSent=false when email service fails', async () => {
    vi.mocked(deps.email.send).mockRejectedValue(new Error('SMTP error'));

    const result = await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 2999);

    expect(result.emailSent).toBe(false);
    expect(result.inAppCreated).toBe(true);
  });

  it('should return emailSent=false when email returns success=false', async () => {
    vi.mocked(deps.email.send).mockResolvedValue({ success: false, error: 'Bounced' });

    const result = await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 2999);

    expect(result.emailSent).toBe(false);
    expect(result.inAppCreated).toBe(true);
  });

  it('should return inAppCreated=false when notification creation fails', async () => {
    vi.mocked(deps.notifications.create).mockRejectedValue(new Error('DB error'));

    const result = await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 2999);

    expect(result.emailSent).toBe(true);
    expect(result.inAppCreated).toBe(false);
  });

  it('should handle both email and notification failures gracefully', async () => {
    vi.mocked(deps.email.send).mockRejectedValue(new Error('SMTP error'));
    vi.mocked(deps.notifications.create).mockRejectedValue(new Error('DB error'));

    const result = await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 2999);

    expect(result.emailSent).toBe(false);
    expect(result.inAppCreated).toBe(false);
  });

  it('should format whole dollar amounts correctly', async () => {
    await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 10000);

    expect(deps.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('$100.00'),
      }),
    );
  });

  it('should format small amounts correctly', async () => {
    await notifyPaymentFailed(deps, 'user-1', 'user@example.com', 99);

    expect(deps.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('$0.99'),
      }),
    );
  });
});

// ============================================================================
// notifyPaymentRetrySuccess
// ============================================================================

describe('notifyPaymentRetrySuccess', () => {
  let deps: PaymentNotificationDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should send both email and in-app notification', async () => {
    const result = await notifyPaymentRetrySuccess(deps, 'user-1', 'user@example.com');

    expect(result.emailSent).toBe(true);
    expect(result.inAppCreated).toBe(true);
  });

  it('should send email with success subject', async () => {
    await notifyPaymentRetrySuccess(deps, 'user-1', 'user@example.com');

    expect(deps.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Payment successful - subscription restored',
        text: expect.stringContaining('restored to active status'),
      }),
    );
  });

  it('should create in-app notification with success type', async () => {
    await notifyPaymentRetrySuccess(deps, 'user-1', 'user@example.com');

    expect(deps.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'success',
        title: 'Payment successful',
        data: expect.objectContaining({
          category: 'billing',
          action: 'payment_retry_success',
        }),
      }),
    );
  });

  it('should return emailSent=false when email service fails', async () => {
    vi.mocked(deps.email.send).mockRejectedValue(new Error('SMTP error'));

    const result = await notifyPaymentRetrySuccess(deps, 'user-1', 'user@example.com');

    expect(result.emailSent).toBe(false);
    expect(result.inAppCreated).toBe(true);
  });

  it('should return inAppCreated=false when notification creation fails', async () => {
    vi.mocked(deps.notifications.create).mockRejectedValue(new Error('DB error'));

    const result = await notifyPaymentRetrySuccess(deps, 'user-1', 'user@example.com');

    expect(result.emailSent).toBe(true);
    expect(result.inAppCreated).toBe(false);
  });
});

// ============================================================================
// notifyAccountSuspended
// ============================================================================

describe('notifyAccountSuspended', () => {
  let deps: PaymentNotificationDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should send both email and in-app notification', async () => {
    const result = await notifyAccountSuspended(
      deps,
      'user-1',
      'user@example.com',
      'grace_period_expired',
    );

    expect(result.emailSent).toBe(true);
    expect(result.inAppCreated).toBe(true);
  });

  it('should send email with suspension details and reason', async () => {
    await notifyAccountSuspended(deps, 'user-1', 'user@example.com', 'grace_period_expired');

    expect(deps.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Account suspended - subscription canceled',
        text: expect.stringContaining('grace_period_expired'),
        html: expect.stringContaining('grace_period_expired'),
      }),
    );
  });

  it('should create in-app notification with error type', async () => {
    await notifyAccountSuspended(deps, 'user-1', 'user@example.com', 'grace_period_expired');

    expect(deps.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'error',
        title: 'Account suspended',
        message: expect.stringContaining('grace_period_expired'),
        data: expect.objectContaining({
          category: 'billing',
          action: 'account_suspended',
          reason: 'grace_period_expired',
        }),
      }),
    );
  });

  it('should mention downgrade to free tier in email', async () => {
    await notifyAccountSuspended(deps, 'user-1', 'user@example.com', 'non_payment');

    expect(deps.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('free tier'),
      }),
    );
  });

  it('should return emailSent=false when email service fails', async () => {
    vi.mocked(deps.email.send).mockRejectedValue(new Error('SMTP error'));

    const result = await notifyAccountSuspended(
      deps,
      'user-1',
      'user@example.com',
      'grace_period_expired',
    );

    expect(result.emailSent).toBe(false);
    expect(result.inAppCreated).toBe(true);
  });

  it('should return inAppCreated=false when notification creation fails', async () => {
    vi.mocked(deps.notifications.create).mockRejectedValue(new Error('DB error'));

    const result = await notifyAccountSuspended(
      deps,
      'user-1',
      'user@example.com',
      'grace_period_expired',
    );

    expect(result.emailSent).toBe(true);
    expect(result.inAppCreated).toBe(false);
  });

  it('should handle arbitrary reason strings', async () => {
    await notifyAccountSuspended(deps, 'user-1', 'user@example.com', 'custom reason');

    expect(deps.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: 'custom reason',
        }),
      }),
    );
  });
});
