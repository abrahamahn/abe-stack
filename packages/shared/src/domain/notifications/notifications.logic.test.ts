// shared/src/domain/notifications/notifications.logic.test.ts
import { describe, expect, it } from 'vitest';

import type { NotificationPreferences } from './notifications.schemas';
import { shouldSendNotification } from './notifications.logic';

describe('notifications.logic', () => {
  // ==========================================================================
  // Test Data
  // ==========================================================================
  function createPrefs(overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
    return {
      userId: 'user-1' as NotificationPreferences['userId'],
      emailEnabled: true,
      pushEnabled: true,
      categories: {},
      ...overrides,
    };
  }

  // ==========================================================================
  // Global Channel Toggles
  // ==========================================================================
  describe('global channel toggles', () => {
    it('blocks email when emailEnabled is false', () => {
      const prefs = createPrefs({ emailEnabled: false });
      expect(shouldSendNotification(prefs, 'security', 'email')).toBe(false);
    });

    it('blocks push when pushEnabled is false', () => {
      const prefs = createPrefs({ pushEnabled: false });
      expect(shouldSendNotification(prefs, 'security', 'push')).toBe(false);
    });

    it('allows email when emailEnabled is true', () => {
      const prefs = createPrefs({ emailEnabled: true });
      expect(shouldSendNotification(prefs, 'security', 'email')).toBe(true);
    });

    it('allows push when pushEnabled is true', () => {
      const prefs = createPrefs({ pushEnabled: true });
      expect(shouldSendNotification(prefs, 'security', 'push')).toBe(true);
    });
  });

  // ==========================================================================
  // Category Overrides
  // ==========================================================================
  describe('category overrides', () => {
    it('blocks when category is explicitly set to false', () => {
      const prefs = createPrefs({
        categories: { marketing: false },
      });
      expect(shouldSendNotification(prefs, 'marketing', 'email')).toBe(false);
    });

    it('allows when category is explicitly set to true', () => {
      const prefs = createPrefs({
        categories: { security: true },
      });
      expect(shouldSendNotification(prefs, 'security', 'email')).toBe(true);
    });

    it('allows when category is not set (opt-out by default)', () => {
      const prefs = createPrefs({ categories: {} });
      expect(shouldSendNotification(prefs, 'unknown-category', 'email')).toBe(true);
    });
  });

  // ==========================================================================
  // Combined Checks
  // ==========================================================================
  describe('combined checks', () => {
    it('global channel toggle takes precedence over category', () => {
      const prefs = createPrefs({
        emailEnabled: false,
        categories: { security: true },
      });
      // Even though security is enabled, email channel is globally off
      expect(shouldSendNotification(prefs, 'security', 'email')).toBe(false);
    });
  });
});
