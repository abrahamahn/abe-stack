// shared/src/domain/notifications/notifications.logic.ts

/**
 * @file Notification Logic
 * @description Pure functions for notification routing and preferences validation.
 * @module Domain/Notifications
 */

import type { NotificationPreferences } from './notifications.schemas';

/**
 * Determines if a notification should be sent based on user preferences.
 *
 * @param prefs - User notification preferences
 * @param category - The category of the notification (e.g., 'security', 'marketing')
 * @param channel - The delivery channel ('email' | 'push')
 * @returns boolean
 */
export function shouldSendNotification(
  prefs: NotificationPreferences,
  category: string,
  channel: 'email' | 'push',
): boolean {
  // 1. Check global channel toggle
  if (channel === 'email' && !prefs.emailEnabled) return false;
  if (channel === 'push' && !prefs.pushEnabled) return false;

  // 2. Check category-specific override if it exists
  const categoryEnabled = prefs.categories[category];

  // If explicitly set to false, don't send. If true or undefined, we assume send (opt-out by default for others)
  // Real implementation might have an 'opt-in' default for marketing.
  return categoryEnabled !== false;
}
