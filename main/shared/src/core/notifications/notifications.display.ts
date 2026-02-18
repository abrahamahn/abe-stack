// main/shared/src/core/notifications/notifications.display.ts

import type { NotificationLevel } from './notifications.schemas';

// ============================================================================
// Notification Level Display
// ============================================================================

const LEVEL_TONES: Record<NotificationLevel, 'primary' | 'success' | 'warning' | 'danger'> = {
  info: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

/**
 * Get the semantic tone for a notification level.
 * Maps to a semantic color name (e.g. 'primary', 'danger') for UI styling.
 */
export function getNotificationLevelTone(
  level: NotificationLevel,
): 'primary' | 'success' | 'warning' | 'danger' {
  return LEVEL_TONES[level];
}
