// infra/db/src/repositories/push.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  DEFAULT_QUIET_HOURS,
  DEFAULT_TYPE_PREFERENCES,
} from '../schema/index';

import {
  createNotificationPreferenceRepository,
  createPushSubscriptionRepository,
} from './push';

import type { RawDb } from '../client';
import type {
  NewNotificationPreference,
  NewPushSubscription,
  NotificationPreference,
} from '../schema/index';


// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  raw: vi.fn(),
  healthCheck: vi.fn(),
  getClient: vi.fn(),
});

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockPushSubscription = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: 'sub-123',
  ['user_id']: 'user-456',
  endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-123',
  ['expiration_time']: null,
  ['keys_p256dh']: 'p256dh-key',
  ['keys_auth']: 'auth-key',
  ['device_id']: 'device-789',
  ['user_agent']: 'Mozilla/5.0',
  ['is_active']: true,
  ['created_at']: new Date('2024-01-01'),
  ['last_used_at']: new Date('2024-01-15'),
  ...overrides,
});

const createMockNotificationPreference = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: 'pref-123',
  ['user_id']: 'user-456',
  ['global_enabled']: true,
  ['quiet_hours']: JSON.stringify(DEFAULT_QUIET_HOURS),
  types: JSON.stringify(DEFAULT_TYPE_PREFERENCES),
  ['updated_at']: new Date('2024-01-01'),
  ...overrides,
});

// ============================================================================
// Push Subscription Repository Tests
// ============================================================================

describe('PushSubscriptionRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createPushSubscriptionRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createPushSubscriptionRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return push subscription when found', async () => {
      const mockSubscription = createMockPushSubscription();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockSubscription);

      const result = await repository.findById('sub-123');

      expect(result).toEqual({
        id: 'sub-123',
        userId: 'user-456',
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-123',
        expirationTime: null,
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
        deviceId: 'device-789',
        userAgent: 'Mozilla/5.0',
        isActive: true,
        createdAt: mockSubscription['created_at'],
        lastUsedAt: mockSubscription['last_used_at'],
      });
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when subscription not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should handle expiration time as Date object', async () => {
      const expirationDate = new Date('2024-12-31');
      const mockSubscription = createMockPushSubscription({
        ['expiration_time']: expirationDate,
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockSubscription);

      const result = await repository.findById('sub-123');

      expect(result?.expirationTime).toEqual(expirationDate);
    });
  });

  describe('findByEndpoint', () => {
    test('should return subscription when endpoint found', async () => {
      const mockSubscription = createMockPushSubscription();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockSubscription);

      const result = await repository.findByEndpoint(
        'https://fcm.googleapis.com/fcm/send/endpoint-123',
      );

      expect(result).toEqual(
        expect.objectContaining({
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-123',
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when endpoint not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findByEndpoint('https://unknown.com/endpoint');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    test('should return all subscriptions for user', async () => {
      const mockSubscriptions = [
        createMockPushSubscription({ id: 'sub-1', ['created_at']: new Date('2024-01-02') }),
        createMockPushSubscription({ id: 'sub-2', ['created_at']: new Date('2024-01-01') }),
      ];
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockSubscriptions);

      const result = await repository.findByUserId('user-456');

      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe('user-456');
      expect(result[1]?.userId).toBe('user-456');
      expect(mockedQuery).toHaveBeenCalledOnce();
    });

    test('should return empty array when user has no subscriptions', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const result = await repository.findByUserId('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('findActiveByUserId', () => {
    test('should return only active subscriptions for user', async () => {
      const mockSubscriptions = [
        createMockPushSubscription({
          id: 'sub-1',
          ['is_active']: true,
          ['last_used_at']: new Date('2024-01-15'),
        }),
        createMockPushSubscription({
          id: 'sub-2',
          ['is_active']: true,
          ['last_used_at']: new Date('2024-01-14'),
        }),
      ];
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockSubscriptions);

      const result = await repository.findActiveByUserId('user-456');

      expect(result).toHaveLength(2);
      expect(result.every((sub) => sub.isActive)).toBe(true);
      expect(mockedQuery).toHaveBeenCalledOnce();
    });

    test('should return empty array when user has no active subscriptions', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const result = await repository.findActiveByUserId('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('findByDeviceId', () => {
    test('should return subscription for user and device', async () => {
      const mockSubscription = createMockPushSubscription();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockSubscription);

      const result = await repository.findByDeviceId('user-456', 'device-789');

      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user-456',
          deviceId: 'device-789',
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when device subscription not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findByDeviceId('user-456', 'unknown-device');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    test('should create new push subscription with required fields', async () => {
      const newSubscription: NewPushSubscription = {
        userId: 'user-456',
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-123',
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
        deviceId: 'device-789',
      };

      const mockCreated = createMockPushSubscription();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newSubscription);

      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user-456',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-123',
          keysP256dh: 'p256dh-key',
          keysAuth: 'auth-key',
          deviceId: 'device-789',
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should create subscription with optional fields', async () => {
      const newSubscription: NewPushSubscription = {
        userId: 'user-456',
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-123',
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
        deviceId: 'device-789',
        expirationTime: new Date('2024-12-31'),
        userAgent: 'Chrome/120',
        isActive: false,
      };

      const mockCreated = createMockPushSubscription({
        ['expiration_time']: new Date('2024-12-31'),
        ['user_agent']: 'Chrome/120',
        ['is_active']: false,
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newSubscription);

      expect(result.expirationTime).toEqual(new Date('2024-12-31'));
      expect(result.userAgent).toBe('Chrome/120');
      expect(result.isActive).toBe(false);
    });

    test('should throw error when creation fails', async () => {
      const newSubscription: NewPushSubscription = {
        userId: 'user-456',
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-123',
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
        deviceId: 'device-789',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newSubscription)).rejects.toThrow(
        'Failed to create push subscription',
      );
    });
  });

  describe('updateLastUsed', () => {
    test('should update last used timestamp', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.updateLastUsed('sub-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('deactivate', () => {
    test('should deactivate subscription', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.deactivate('sub-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('activate', () => {
    test('should activate subscription', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.activate('sub-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('delete', () => {
    test('should return true when subscription deleted', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.delete('sub-123');

      expect(result).toBe(true);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return false when subscription not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    test('should delete all subscriptions for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(3);

      const result = await repository.deleteByUserId('user-456');

      expect(result).toBe(3);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return 0 when user has no subscriptions', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.deleteByUserId('user-456');

      expect(result).toBe(0);
    });
  });

  describe('deleteByEndpoint', () => {
    test('should return true when subscription deleted by endpoint', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.deleteByEndpoint(
        'https://fcm.googleapis.com/fcm/send/endpoint-123',
      );

      expect(result).toBe(true);
    });

    test('should return false when endpoint not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.deleteByEndpoint('https://unknown.com/endpoint');

      expect(result).toBe(false);
    });
  });

  describe('deleteInactive', () => {
    test('should delete inactive subscriptions older than date', async () => {
      const olderThan = new Date('2024-01-01');
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(5);

      const result = await repository.deleteInactive(olderThan);

      expect(result).toBe(5);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return 0 when no inactive subscriptions to delete', async () => {
      const olderThan = new Date('2024-01-01');
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.deleteInactive(olderThan);

      expect(result).toBe(0);
    });
  });
});

// ============================================================================
// Notification Preference Repository Tests
// ============================================================================

describe('NotificationPreferenceRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createNotificationPreferenceRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createNotificationPreferenceRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return notification preference when found', async () => {
      const mockPreference = createMockNotificationPreference();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockPreference);

      const result = await repository.findById('pref-123');

      expect(result).toEqual({
        id: 'pref-123',
        userId: 'user-456',
        globalEnabled: true,
        quietHours: DEFAULT_QUIET_HOURS,
        types: DEFAULT_TYPE_PREFERENCES,
        updatedAt: mockPreference['updated_at'],
      });
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when preference not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should parse JSONB fields correctly', async () => {
      const customQuietHours = { enabled: true, startHour: 23, endHour: 7, timezone: 'America/New_York' };
      const customTypes = {
        ...DEFAULT_TYPE_PREFERENCES,
        marketing: { enabled: true, channels: ['email' as const] },
      };
      const mockPreference = createMockNotificationPreference({
        ['quiet_hours']: JSON.stringify(customQuietHours),
        types: JSON.stringify(customTypes),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockPreference);

      const result = await repository.findById('pref-123');

      expect(result?.quietHours).toEqual(customQuietHours);
      expect(result?.types).toEqual(customTypes);
    });

    test('should use default values when JSONB fields are null or invalid', async () => {
      const mockPreference = createMockNotificationPreference({
        ['quiet_hours']: null,
        types: 'invalid-json',
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockPreference);

      const result = await repository.findById('pref-123');

      expect(result?.quietHours).toEqual(DEFAULT_QUIET_HOURS);
      expect(result?.types).toEqual(DEFAULT_TYPE_PREFERENCES);
    });
  });

  describe('findByUserId', () => {
    test('should return preference for user', async () => {
      const mockPreference = createMockNotificationPreference();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockPreference);

      const result = await repository.findByUserId('user-456');

      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user-456',
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when user has no preference', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findByUserId('user-456');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    test('should create preference with required fields', async () => {
      const newPreference: NewNotificationPreference = {
        userId: 'user-456',
      };

      const mockCreated = createMockNotificationPreference();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newPreference);

      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user-456',
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should create preference with custom quiet hours', async () => {
      const customQuietHours = {
        enabled: true,
        startHour: 23,
        endHour: 7,
        timezone: 'America/New_York',
      };
      const newPreference: NewNotificationPreference = {
        userId: 'user-456',
        quietHours: customQuietHours,
      };

      const mockCreated = createMockNotificationPreference({
        ['quiet_hours']: JSON.stringify(customQuietHours),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newPreference);

      expect(result.quietHours).toEqual(customQuietHours);
    });

    test('should create preference with custom type preferences', async () => {
      const customTypes = {
        ...DEFAULT_TYPE_PREFERENCES,
        marketing: { enabled: true, channels: ['email' as const, 'push' as const] },
      };
      const newPreference: NewNotificationPreference = {
        userId: 'user-456',
        types: customTypes,
      };

      const mockCreated = createMockNotificationPreference({
        types: JSON.stringify(customTypes),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newPreference);

      expect(result.types).toEqual(customTypes);
    });

    test('should throw error when creation fails', async () => {
      const newPreference: NewNotificationPreference = {
        userId: 'user-456',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newPreference)).rejects.toThrow(
        'Failed to create notification preference',
      );
    });
  });

  describe('update', () => {
    test('should update preference and return updated result', async () => {
      const updateData: Partial<NotificationPreference> = {
        globalEnabled: false,
      };

      const mockUpdated = createMockNotificationPreference({
        ['global_enabled']: false,
        ['updated_at']: new Date(),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('user-456', updateData);

      expect(result).toEqual(
        expect.objectContaining({
          globalEnabled: false,
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should update quiet hours', async () => {
      const customQuietHours = {
        enabled: true,
        startHour: 22,
        endHour: 6,
        timezone: 'Europe/London',
      };
      const updateData: Partial<NotificationPreference> = {
        quietHours: customQuietHours,
      };

      const mockUpdated = createMockNotificationPreference({
        ['quiet_hours']: JSON.stringify(customQuietHours),
        ['updated_at']: new Date(),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('user-456', updateData);

      expect(result?.quietHours).toEqual(customQuietHours);
    });

    test('should update type preferences', async () => {
      const customTypes = {
        ...DEFAULT_TYPE_PREFERENCES,
        social: { enabled: false, channels: [] },
      };
      const updateData: Partial<NotificationPreference> = {
        types: customTypes,
      };

      const mockUpdated = createMockNotificationPreference({
        types: JSON.stringify(customTypes),
        ['updated_at']: new Date(),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('user-456', updateData);

      expect(result?.types).toEqual(customTypes);
    });

    test('should return null when preference not found', async () => {
      const updateData: Partial<NotificationPreference> = {
        globalEnabled: false,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.update('nonexistent', updateData);

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    test('should update existing preference', async () => {
      const updateData: Partial<NotificationPreference> = {
        globalEnabled: false,
      };

      const mockUpdated = createMockNotificationPreference({
        ['global_enabled']: false,
        ['updated_at']: new Date(),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.upsert('user-456', updateData);

      expect(result).toEqual(
        expect.objectContaining({
          globalEnabled: false,
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should create new preference when not exists', async () => {
      const updateData: Partial<NotificationPreference> = {
        globalEnabled: false,
      };

      const mockCreated = createMockNotificationPreference({
        ['global_enabled']: false,
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockCreated);

      const result = await repository.upsert('user-456', updateData);

      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user-456',
          globalEnabled: false,
        }),
      );
      expect(mockedQueryOne).toHaveBeenCalledTimes(2);
    });

    test('should use default values when creating without optional fields', async () => {
      const updateData: Partial<NotificationPreference> = {};

      const mockCreated = createMockNotificationPreference();
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockCreated);

      const result = await repository.upsert('user-456', updateData);

      expect(result).toEqual(
        expect.objectContaining({
          globalEnabled: true,
          quietHours: DEFAULT_QUIET_HOURS,
          types: DEFAULT_TYPE_PREFERENCES,
        }),
      );
    });
  });

  describe('delete', () => {
    test('should return true when preference deleted', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.delete('pref-123');

      expect(result).toBe(true);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return false when preference not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    test('should return true when user preference deleted', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.deleteByUserId('user-456');

      expect(result).toBe(true);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return false when user has no preference', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.deleteByUserId('user-456');

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle null user agent in subscription', async () => {
      const mockSubscription = createMockPushSubscription({
        ['user_agent']: null,
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockSubscription);

      const result = await repository.findById('sub-123');

      expect(result).not.toBeNull();
      expect(result?.userAgent).toBeNull();
    });

    test('should handle empty type preferences object', async () => {
      const mockPreference = createMockNotificationPreference({
        types: JSON.stringify({}),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockPreference);

      const result = await repository.findById('pref-123');

      expect(result?.types).toBeDefined();
    });

    test('should handle boundary hour values in quiet hours', async () => {
      const boundaryQuietHours = {
        enabled: true,
        startHour: 0,
        endHour: 23,
        timezone: 'UTC',
      };
      const mockPreference = createMockNotificationPreference({
        ['quiet_hours']: JSON.stringify(boundaryQuietHours),
      });
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockPreference);

      const result = await repository.findById('pref-123');

      expect(result?.quietHours.startHour).toBe(0);
      expect(result?.quietHours.endHour).toBe(23);
    });
  });
});
