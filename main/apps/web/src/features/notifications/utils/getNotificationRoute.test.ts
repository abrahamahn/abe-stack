// main/apps/web/src/features/notifications/utils/getNotificationRoute.test.ts
import { describe, expect, it } from 'vitest';

import { getNotificationRoute } from './getNotificationRoute';

import type { Notification } from '@bslt/shared';

function makeNotification(data?: Record<string, unknown>): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'info',
    title: 'Test',
    message: 'Test message',
    data,
    isRead: false,
    createdAt: new Date().toISOString(),
  } as unknown as Notification;
}

describe('getNotificationRoute', () => {
  it('should return /settings?tab=notifications for invite_received', () => {
    const notification = makeNotification({ notificationType: 'invite_received' });
    expect(getNotificationRoute(notification)).toBe('/settings?tab=notifications');
  });

  it('should return /settings?tab=security for security_alert', () => {
    const notification = makeNotification({ notificationType: 'security_alert' });
    expect(getNotificationRoute(notification)).toBe('/settings?tab=security');
  });

  it('should return /billing for billing_ prefixed types', () => {
    const notification = makeNotification({ notificationType: 'billing_payment_failed' });
    expect(getNotificationRoute(notification)).toBe('/billing');
  });

  it('should return /billing for billing_subscription_renewed', () => {
    const notification = makeNotification({ notificationType: 'billing_subscription_renewed' });
    expect(getNotificationRoute(notification)).toBe('/billing');
  });

  it('should return null when no data is present', () => {
    const notification = makeNotification(undefined);
    expect(getNotificationRoute(notification)).toBeNull();
  });

  it('should return null when data has no notificationType', () => {
    const notification = makeNotification({ foo: 'bar' });
    expect(getNotificationRoute(notification)).toBeNull();
  });

  it('should return null for unknown notification types', () => {
    const notification = makeNotification({ notificationType: 'unknown_type' });
    expect(getNotificationRoute(notification)).toBeNull();
  });

  it('should return null when notificationType is not a string', () => {
    const notification = makeNotification({ notificationType: 42 });
    expect(getNotificationRoute(notification)).toBeNull();
  });
});
