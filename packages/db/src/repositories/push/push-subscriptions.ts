// packages/db/src/repositories/push/push-subscriptions.ts
/**
 * Push Subscriptions Repository (Functional)
 *
 * Data access layer for the push_subscriptions table.
 * Manages Web Push subscription records for notification delivery.
 *
 * @module
 */

import { eq, select, insert, deleteFrom } from '../../builder/index';
import {
  type NewPushSubscription,
  type PushSubscription,
  PUSH_SUBSCRIPTION_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Push Subscription Repository Interface
// ============================================================================

/**
 * Functional repository for push subscription operations
 */
export interface PushSubscriptionRepository {
  /**
   * Create a new push subscription
   * @param data - The subscription data to insert
   * @returns The created subscription
   * @throws Error if insert fails
   */
  create(data: NewPushSubscription): Promise<PushSubscription>;

  /**
   * Find all subscriptions for a user
   * @param userId - The user ID to search for
   * @returns Array of push subscriptions
   */
  findByUserId(userId: string): Promise<PushSubscription[]>;

  /**
   * Find a subscription by its endpoint URL
   * @param endpoint - The push endpoint URL
   * @returns The subscription or null if not found
   */
  findByEndpoint(endpoint: string): Promise<PushSubscription | null>;

  /**
   * Delete a push subscription by its endpoint
   * @param endpoint - The push endpoint URL to delete
   * @returns True if a subscription was deleted
   */
  deleteByEndpoint(endpoint: string): Promise<boolean>;
}

// ============================================================================
// Push Subscription Repository Implementation
// ============================================================================

/**
 * Transform raw database row to PushSubscription type
 * @param row - Raw database row with snake_case keys
 * @returns Typed PushSubscription object
 * @complexity O(n) where n is number of columns
 */
function transformSubscription(row: Record<string, unknown>): PushSubscription {
  return toCamelCase<PushSubscription>(row, PUSH_SUBSCRIPTION_COLUMNS);
}

/**
 * Create a push subscription repository bound to a database connection
 * @param db - The raw database client
 * @returns PushSubscriptionRepository implementation
 */
export function createPushSubscriptionRepository(db: RawDb): PushSubscriptionRepository {
  return {
    async create(data: NewPushSubscription): Promise<PushSubscription> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        PUSH_SUBSCRIPTION_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(PUSH_SUBSCRIPTIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create push subscription');
      }
      return transformSubscription(result);
    },

    async findByUserId(userId: string): Promise<PushSubscription[]> {
      const results = await db.query<Record<string, unknown>>(
        select(PUSH_SUBSCRIPTIONS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformSubscription);
    },

    async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(PUSH_SUBSCRIPTIONS_TABLE).where(eq('endpoint', endpoint)).toSql(),
      );
      return result !== null ? transformSubscription(result) : null;
    },

    async deleteByEndpoint(endpoint: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(PUSH_SUBSCRIPTIONS_TABLE).where(eq('endpoint', endpoint)).toSql(),
      );
      return count > 0;
    },
  };
}
