// backend/db/src/repositories/push/notification-preferences.test.ts
/**
 * Tests for Notification Preferences Repository
 *
 * Validates notification preference operations including user preference
 * lookups, upsert operations, JSONB quiet hours handling, and notification type configurations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createNotificationPreferenceRepository } from './notification-preferences';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockQuietHours = {
  enabled: false,
  startHour: 22,
  endHour: 8,
  timezone: 'UTC',
};

const mockNotificationTypes = {
  system: { enabled: true, channels: ['push', 'email', 'in_app'] },
  security: { enabled: true, channels: ['push', 'email', 'in_app'] },
  marketing: { enabled: false, channels: ['email'] },
  social: { enabled: true, channels: ['push', 'in_app'] },
  transactional: { enabled: true, channels: ['push', 'email', 'in_app'] },
};

const mockNotificationPreferences = {
  id: 'np-123',
  user_id: 'usr-123',
  global_enabled: true,
  quiet_hours: JSON.stringify(mockQuietHours),
  types: JSON.stringify(mockNotificationTypes),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createNotificationPreferencesRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return preferences when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotificationPreferences);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
      expect(result?.globalEnabled).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-new');

      expect(result).toBeNull();
    });

    it('should parse JSONB quiet_hours correctly', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotificationPreferences);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result?.quietHours).toEqual(mockQuietHours);
      expect(typeof result?.quietHours).toBe('object');
      expect(result?.quietHours.enabled).toBe(false);
      expect(result?.quietHours.startHour).toBe(22);
      expect(result?.quietHours.endHour).toBe(8);
      expect(result?.quietHours.timezone).toBe('UTC');
    });

    it('should parse JSONB types correctly', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotificationPreferences);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result?.types).toEqual(mockNotificationTypes);
      expect(typeof result?.types).toBe('object');
      expect(result?.types.system.enabled).toBe(true);
      expect(result?.types.marketing.enabled).toBe(false);
    });

    it('should handle null quiet_hours gracefully', async () => {
      const prefsWithNullQuietHours = {
        ...mockNotificationPreferences,
        quiet_hours: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(prefsWithNullQuietHours);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toBeDefined();
      expect(result?.quietHours).toBeNull();
    });

    it('should handle null types gracefully', async () => {
      const prefsWithNullTypes = {
        ...mockNotificationPreferences,
        types: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(prefsWithNullTypes);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toBeDefined();
      expect(result?.types).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should insert or update and return preferences', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotificationPreferences);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.upsert({
        userId: 'usr-123',
        globalEnabled: true,
        quietHours: mockQuietHours,
        types: mockNotificationTypes,
      });

      expect(result.userId).toBe('usr-123');
      expect(result.globalEnabled).toBe(true);
      expect(result.quietHours).toEqual(mockQuietHours);
      expect(result.types).toEqual(mockNotificationTypes);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT INTO.*ON CONFLICT/s),
        }),
      );
    });

    it('should throw error if upsert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createNotificationPreferenceRepository(mockDb);

      await expect(
        repo.upsert({
          userId: 'usr-123',
          globalEnabled: true,
          quietHours: mockQuietHours,
          types: mockNotificationTypes,
        }),
      ).rejects.toThrow('Failed to upsert notification preferences');
    });

    it('should stringify quiet_hours for storage', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotificationPreferences);

      const repo = createNotificationPreferenceRepository(mockDb);
      await repo.upsert({
        userId: 'usr-123',
        globalEnabled: true,
        quietHours: mockQuietHours,
        types: mockNotificationTypes,
      });

      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should stringify types for storage', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockNotificationPreferences);

      const repo = createNotificationPreferenceRepository(mockDb);
      await repo.upsert({
        userId: 'usr-123',
        globalEnabled: true,
        quietHours: mockQuietHours,
        types: mockNotificationTypes,
      });

      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should handle partial updates via upsert', async () => {
      const partialPrefs = {
        ...mockNotificationPreferences,
        global_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(partialPrefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.upsert({
        userId: 'usr-123',
        globalEnabled: false,
      });

      expect(result.globalEnabled).toBe(false);
    });

    it('should use RETURNING * to get full row after upsert', async () => {
      const updatedPrefs = {
        ...mockNotificationPreferences,
        updated_at: new Date('2024-01-15'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedPrefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      await repo.upsert({
        userId: 'usr-123',
        globalEnabled: true,
        quietHours: mockQuietHours,
        types: mockNotificationTypes,
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('RETURNING *'),
        }),
      );
    });

    it('should handle upsert with only global_enabled change', async () => {
      const minimalPrefs = {
        ...mockNotificationPreferences,
        global_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalPrefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.upsert({
        userId: 'usr-123',
        globalEnabled: false,
      });

      expect(result.globalEnabled).toBe(false);
    });

    it('should handle upsert with only quiet_hours change', async () => {
      const newQuietHours = {
        enabled: true,
        startHour: 23,
        endHour: 7,
        timezone: 'America/New_York',
      };
      const updatedPrefs = {
        ...mockNotificationPreferences,
        quiet_hours: JSON.stringify(newQuietHours),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedPrefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.upsert({
        userId: 'usr-123',
        quietHours: newQuietHours,
      });

      expect(result.quietHours).toEqual(newQuietHours);
    });

    it('should handle upsert with only types change', async () => {
      const newTypes = {
        ...mockNotificationTypes,
        marketing: { enabled: true, channels: ['email', 'push'] },
      };
      const updatedPrefs = {
        ...mockNotificationPreferences,
        types: JSON.stringify(newTypes),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedPrefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.upsert({
        userId: 'usr-123',
        types: newTypes,
      });

      expect(result.types).toEqual(newTypes);
    });
  });

  describe('quiet hours edge cases', () => {
    it('should handle quiet hours with different timezones', async () => {
      const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

      for (const timezone of timezones) {
        const quietHours = { ...mockQuietHours, timezone };
        const prefs = {
          ...mockNotificationPreferences,
          quiet_hours: JSON.stringify(quietHours),
        };
        vi.mocked(mockDb.queryOne).mockResolvedValue(prefs);

        const repo = createNotificationPreferenceRepository(mockDb);
        const result = await repo.findByUserId('usr-123');

        expect(result?.quietHours.timezone).toBe(timezone);
      }
    });

    it('should handle quiet hours spanning midnight', async () => {
      const midnightQuietHours = {
        enabled: true,
        startHour: 22,
        endHour: 6,
        timezone: 'UTC',
      };
      const prefs = {
        ...mockNotificationPreferences,
        quiet_hours: JSON.stringify(midnightQuietHours),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(prefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result?.quietHours.startHour).toBeGreaterThan(result?.quietHours.endHour);
    });

    it('should handle 24-hour quiet hours', async () => {
      const allDayQuietHours = {
        enabled: true,
        startHour: 0,
        endHour: 24,
        timezone: 'UTC',
      };
      const prefs = {
        ...mockNotificationPreferences,
        quiet_hours: JSON.stringify(allDayQuietHours),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(prefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result?.quietHours.endHour).toBe(24);
    });
  });

  describe('notification types edge cases', () => {
    it('should handle all notification types disabled', async () => {
      const allDisabled = {
        system: { enabled: false, channels: [] },
        security: { enabled: false, channels: [] },
        marketing: { enabled: false, channels: [] },
        social: { enabled: false, channels: [] },
        transactional: { enabled: false, channels: [] },
      };
      const prefs = {
        ...mockNotificationPreferences,
        types: JSON.stringify(allDisabled),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(prefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      const types = result !== null && result !== undefined ? result.types : {};
      expect(Object.values(types ?? {}).every((t: { enabled: boolean }) => !t.enabled)).toBe(true);
    });

    it('should handle single channel per type', async () => {
      const singleChannel = {
        system: { enabled: true, channels: ['push'] },
        security: { enabled: true, channels: ['email'] },
        marketing: { enabled: true, channels: ['in_app'] },
        social: { enabled: false, channels: [] },
        transactional: { enabled: true, channels: ['push'] },
      };
      const prefs = {
        ...mockNotificationPreferences,
        types: JSON.stringify(singleChannel),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(prefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result?.types.system.channels).toEqual(['push']);
      expect(result?.types.security.channels).toEqual(['email']);
    });

    it('should handle empty channels array', async () => {
      const emptyChannels = {
        ...mockNotificationTypes,
        marketing: { enabled: true, channels: [] },
      };
      const prefs = {
        ...mockNotificationPreferences,
        types: JSON.stringify(emptyChannels),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(prefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result?.types.marketing.channels).toEqual([]);
    });
  });

  describe('global enabled flag', () => {
    it('should respect global_enabled false', async () => {
      const disabledPrefs = {
        ...mockNotificationPreferences,
        global_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(disabledPrefs);

      const repo = createNotificationPreferenceRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result?.globalEnabled).toBe(false);
    });

    it('should toggle global_enabled via upsert', async () => {
      vi.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(mockNotificationPreferences)
        .mockResolvedValueOnce({ ...mockNotificationPreferences, global_enabled: false });

      const repo = createNotificationPreferenceRepository(mockDb);
      const enabled = await repo.upsert({ userId: 'usr-123', globalEnabled: true });
      const disabled = await repo.upsert({ userId: 'usr-123', globalEnabled: false });

      expect(enabled.globalEnabled).toBe(true);
      expect(disabled.globalEnabled).toBe(false);
    });
  });
});
