// src/shared/src/domain/notifications/notifications.display.test.ts

import { describe, expect, it } from 'vitest';

import { getNotificationLevelTone } from './notifications.display';
import { NOTIFICATION_LEVELS } from './notifications.schemas';

import type { NotificationLevel } from './notifications.schemas';

describe('notifications.display', () => {
  describe('getNotificationLevelTone', () => {
    const expectedTones: Record<NotificationLevel, string> = {
      info: 'primary',
      success: 'success',
      warning: 'warning',
      error: 'danger',
    };

    it('returns a tone for every notification level', () => {
      for (const level of NOTIFICATION_LEVELS) {
        expect(getNotificationLevelTone(level)).toBe(expectedTones[level]);
      }
    });
  });
});
