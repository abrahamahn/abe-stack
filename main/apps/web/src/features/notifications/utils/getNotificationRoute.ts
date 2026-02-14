// main/apps/web/src/features/notifications/utils/getNotificationRoute.ts
/**
 * Maps notification data to a navigation route.
 *
 * Inspects the notification's `data.notificationType` field
 * to determine which page the user should navigate to.
 */

import type { Notification } from '@abe-stack/shared';

/**
 * Returns the route path for a given notification, or null if no
 * specific navigation target applies (just mark as read).
 */
export function getNotificationRoute(notification: Notification): string | null {
  const notificationType = notification.data?.['notificationType'];

  if (typeof notificationType !== 'string') {
    return null;
  }

  if (notificationType === 'invite_received') {
    return '/settings?tab=notifications';
  }

  if (notificationType === 'security_alert') {
    return '/settings?tab=security';
  }

  if (notificationType.startsWith('billing_')) {
    return '/billing';
  }

  return null;
}
