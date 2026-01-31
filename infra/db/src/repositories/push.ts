// infra/db/src/repositories/push.ts
/**
 * Push Repository
 *
 * Data access layer for push subscriptions and notification preferences.
 */

import { and, eq, lt, select, insert, update, deleteFrom } from '../builder/index';
import {
  DEFAULT_QUIET_HOURS,
  DEFAULT_TYPE_PREFERENCES,
  type NewNotificationPreference,
  type NewPushSubscription,
  NOTIFICATION_PREFERENCE_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  type NotificationPreference,
  PUSH_SUBSCRIPTION_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  type PushSubscription,
} from '../schema/index';
import { formatJsonb, parseJsonb, toCamelCase, toCamelCaseArray, toSnakeCase } from '../utils';

import type { RawDb } from '../client';

// ============================================================================
// Push Subscription Repository
// ============================================================================

export interface PushSubscriptionRepository {
  findById(id: string): Promise<PushSubscription | null>;
  findByEndpoint(endpoint: string): Promise<PushSubscription | null>;
  findByUserId(userId: string): Promise<PushSubscription[]>;
  findActiveByUserId(userId: string): Promise<PushSubscription[]>;
  findByDeviceId(userId: string, deviceId: string): Promise<PushSubscription | null>;
  create(subscription: NewPushSubscription): Promise<PushSubscription>;
  updateLastUsed(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  activate(id: string): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  deleteByEndpoint(endpoint: string): Promise<boolean>;
  deleteInactive(olderThan: Date): Promise<number>;
}

/**
 * Create a push subscription repository
 */
export function createPushSubscriptionRepository(db: RawDb): PushSubscriptionRepository {
  return {
    async findById(id: string): Promise<PushSubscription | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(PUSH_SUBSCRIPTIONS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null
        ? toCamelCase<PushSubscription>(result, PUSH_SUBSCRIPTION_COLUMNS)
        : null;
    },

    async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(PUSH_SUBSCRIPTIONS_TABLE).where(eq('endpoint', endpoint)).toSql(),
      );
      return result !== null
        ? toCamelCase<PushSubscription>(result, PUSH_SUBSCRIPTION_COLUMNS)
        : null;
    },

    async findByUserId(userId: string): Promise<PushSubscription[]> {
      const results = await db.query<Record<string, unknown>>(
        select(PUSH_SUBSCRIPTIONS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return toCamelCaseArray<PushSubscription>(results, PUSH_SUBSCRIPTION_COLUMNS);
    },

    async findActiveByUserId(userId: string): Promise<PushSubscription[]> {
      const results = await db.query<Record<string, unknown>>(
        select(PUSH_SUBSCRIPTIONS_TABLE)
          .where(and(eq('user_id', userId), eq('is_active', true)))
          .orderBy('last_used_at', 'desc')
          .toSql(),
      );
      return toCamelCaseArray<PushSubscription>(results, PUSH_SUBSCRIPTION_COLUMNS);
    },

    async findByDeviceId(userId: string, deviceId: string): Promise<PushSubscription | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(PUSH_SUBSCRIPTIONS_TABLE)
          .where(and(eq('user_id', userId), eq('device_id', deviceId)))
          .toSql(),
      );
      return result !== null
        ? toCamelCase<PushSubscription>(result, PUSH_SUBSCRIPTION_COLUMNS)
        : null;
    },

    async create(subscription: NewPushSubscription): Promise<PushSubscription> {
      const snakeData = toSnakeCase(
        subscription as unknown as Record<string, unknown>,
        PUSH_SUBSCRIPTION_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(PUSH_SUBSCRIPTIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create push subscription');
      }
      return toCamelCase<PushSubscription>(result, PUSH_SUBSCRIPTION_COLUMNS);
    },

    async updateLastUsed(id: string): Promise<void> {
      await db.execute(
        update(PUSH_SUBSCRIPTIONS_TABLE)
          .set({ ['last_used_at']: new Date() })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async deactivate(id: string): Promise<void> {
      await db.execute(
        update(PUSH_SUBSCRIPTIONS_TABLE)
          .set({ ['is_active']: false })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async activate(id: string): Promise<void> {
      await db.execute(
        update(PUSH_SUBSCRIPTIONS_TABLE)
          .set({ ['is_active']: true })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(PUSH_SUBSCRIPTIONS_TABLE).where(eq('id', id)).toSql(),
      );
      return count > 0;
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(PUSH_SUBSCRIPTIONS_TABLE).where(eq('user_id', userId)).toSql());
    },

    async deleteByEndpoint(endpoint: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(PUSH_SUBSCRIPTIONS_TABLE).where(eq('endpoint', endpoint)).toSql(),
      );
      return count > 0;
    },

    async deleteInactive(olderThan: Date): Promise<number> {
      return db.execute(
        deleteFrom(PUSH_SUBSCRIPTIONS_TABLE)
          .where(and(eq('is_active', false), lt('last_used_at', olderThan)))
          .toSql(),
      );
    },
  };
}

// ============================================================================
// Notification Preference Repository
// ============================================================================

export interface NotificationPreferenceRepository {
  findById(id: string): Promise<NotificationPreference | null>;
  findByUserId(userId: string): Promise<NotificationPreference | null>;
  create(preference: NewNotificationPreference): Promise<NotificationPreference>;
  update(
    userId: string,
    data: Partial<NotificationPreference>,
  ): Promise<NotificationPreference | null>;
  upsert(userId: string, data: Partial<NotificationPreference>): Promise<NotificationPreference>;
  delete(id: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<boolean>;
}

/**
 * Create a notification preference repository
 */
export function createNotificationPreferenceRepository(
  db: RawDb,
): NotificationPreferenceRepository {
  // Helper to parse JSONB fields
  const parseResult = (result: Record<string, unknown>): NotificationPreference => {
    const camelResult = toCamelCase<Record<string, unknown>>(
      result,
      NOTIFICATION_PREFERENCE_COLUMNS,
    );
    return {
      ...camelResult,
      quietHours: parseJsonb(camelResult['quietHours'] as string) ?? DEFAULT_QUIET_HOURS,
      types: parseJsonb(camelResult['types'] as string) ?? DEFAULT_TYPE_PREFERENCES,
    } as NotificationPreference;
  };

  // Helper to prepare data for insert/update
  const prepareData = (data: Partial<NotificationPreference>): Record<string, unknown> => {
    const snakeData = toSnakeCase(
      data as unknown as Record<string, unknown>,
      NOTIFICATION_PREFERENCE_COLUMNS,
    );
    if ('quiet_hours' in snakeData && snakeData['quiet_hours'] !== undefined) {
      snakeData['quiet_hours'] = formatJsonb(snakeData['quiet_hours']);
    }
    if ('types' in snakeData && snakeData['types'] !== undefined) {
      snakeData['types'] = formatJsonb(snakeData['types']);
    }
    return snakeData;
  };

  return {
    async findById(id: string): Promise<NotificationPreference | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(NOTIFICATION_PREFERENCES_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null ? parseResult(result) : null;
    },

    async findByUserId(userId: string): Promise<NotificationPreference | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(NOTIFICATION_PREFERENCES_TABLE).where(eq('user_id', userId)).toSql(),
      );
      return result !== null ? parseResult(result) : null;
    },

    async create(preference: NewNotificationPreference): Promise<NotificationPreference> {
      const snakeData = prepareData(preference);
      const result = await db.queryOne<Record<string, unknown>>(
        insert(NOTIFICATION_PREFERENCES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create notification preference');
      }
      return parseResult(result);
    },

    async update(
      userId: string,
      data: Partial<NotificationPreference>,
    ): Promise<NotificationPreference | null> {
      const snakeData = prepareData({ ...data, updatedAt: new Date() });
      const result = await db.queryOne<Record<string, unknown>>(
        update(NOTIFICATION_PREFERENCES_TABLE)
          .set(snakeData)
          .where(eq('user_id', userId))
          .returningAll()
          .toSql(),
      );
      return result !== null ? parseResult(result) : null;
    },

    async upsert(
      userId: string,
      data: Partial<NotificationPreference>,
    ): Promise<NotificationPreference> {
      // Try to update first
      const updated = await this.update(userId, data);
      if (updated !== null) {
        return updated;
      }

      // Create if not exists
      return this.create({
        userId,
        globalEnabled: data.globalEnabled ?? true,
        quietHours: data.quietHours ?? DEFAULT_QUIET_HOURS,
        types: data.types ?? DEFAULT_TYPE_PREFERENCES,
      });
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(NOTIFICATION_PREFERENCES_TABLE).where(eq('id', id)).toSql(),
      );
      return count > 0;
    },

    async deleteByUserId(userId: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(NOTIFICATION_PREFERENCES_TABLE).where(eq('user_id', userId)).toSql(),
      );
      return count > 0;
    },
  };
}
