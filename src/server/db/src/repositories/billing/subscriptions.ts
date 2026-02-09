// src/server/db/src/repositories/billing/subscriptions.ts
/**
 * Subscriptions Repository
 *
 * Data access layer for billing subscriptions table.
 */

import {
  and,
  eq,
  gt,
  inArray,
  lt,
  or,
  select,
  insert,
  update,
  deleteFrom,
  raw,
} from '../../builder/index';
import {
  type NewSubscription,
  type Subscription,
  type SubscriptionStatus,
  type UpdateSubscription,
  SUBSCRIPTION_COLUMNS,
  SUBSCRIPTIONS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase, parseJsonb } from '../../utils';

import type { RawDb } from '../../client';
import type { PaginatedResult, PaginationOptions } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Subscription filters for queries
 */
export interface SubscriptionFilters {
  userId?: string;
  planId?: string;
  status?: SubscriptionStatus | SubscriptionStatus[];
  provider?: 'stripe' | 'paypal';
  cancelAtPeriodEnd?: boolean;
}

// ============================================================================
// Subscription Repository Interface
// ============================================================================

export interface SubscriptionRepository {
  /** Find subscription by ID */
  findById(id: string): Promise<Subscription | null>;

  /** Find subscription by provider subscription ID */
  findByProviderSubscriptionId(
    provider: 'stripe' | 'paypal',
    providerSubscriptionId: string,
  ): Promise<Subscription | null>;

  /** Find active subscription for user */
  findActiveByUserId(userId: string): Promise<Subscription | null>;

  /** Find all subscriptions for user */
  findByUserId(userId: string): Promise<Subscription[]>;

  /** List subscriptions with filters */
  list(
    filters?: SubscriptionFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Subscription>>;

  /** Create a new subscription */
  create(subscription: NewSubscription): Promise<Subscription>;

  /** Update a subscription */
  update(id: string, data: UpdateSubscription): Promise<Subscription | null>;

  /** Update by provider subscription ID */
  updateByProviderSubscriptionId(
    provider: 'stripe' | 'paypal',
    providerSubscriptionId: string,
    data: UpdateSubscription,
  ): Promise<Subscription | null>;

  /** Delete a subscription */
  delete(id: string): Promise<boolean>;

  /** Get subscriptions expiring soon (for renewal reminders) */
  findExpiringSoon(withinDays: number): Promise<Subscription[]>;

  /** Get subscriptions past due */
  findPastDue(): Promise<Subscription[]>;

  /** Count active subscriptions by plan */
  countActiveByPlanId(planId: string): Promise<number>;
}

// ============================================================================
// Subscription Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Subscription type
 */
function transformSubscription(row: Record<string, unknown>): Subscription {
  const subscription = toCamelCase<Subscription>(row, SUBSCRIPTION_COLUMNS);
  // Parse JSONB metadata
  const parsedMetadata = parseJsonb(row['metadata'] as string | null) as Record<
    string,
    unknown
  > | null;
  subscription.metadata = parsedMetadata ?? {};
  return subscription;
}

/**
 * Active subscription statuses
 */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

/**
 * Create a subscription repository
 */
export function createSubscriptionRepository(db: RawDb): SubscriptionRepository {
  return {
    async findById(id: string): Promise<Subscription | null> {
      const result = await db.queryOne(select(SUBSCRIPTIONS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformSubscription(result) : null;
    },

    async findByProviderSubscriptionId(
      provider: 'stripe' | 'paypal',
      providerSubscriptionId: string,
    ): Promise<Subscription | null> {
      const result = await db.queryOne(
        select(SUBSCRIPTIONS_TABLE)
          .where(
            and(eq('provider', provider), eq('provider_subscription_id', providerSubscriptionId)),
          )
          .toSql(),
      );
      return result !== null ? transformSubscription(result) : null;
    },

    async findActiveByUserId(userId: string): Promise<Subscription | null> {
      const result = await db.queryOne(
        select(SUBSCRIPTIONS_TABLE)
          .where(and(eq('user_id', userId), inArray('status', ACTIVE_STATUSES)))
          .orderBy('created_at', 'desc')
          .limit(1)
          .toSql(),
      );
      return result !== null ? transformSubscription(result) : null;
    },

    async findByUserId(userId: string): Promise<Subscription[]> {
      const results = await db.query(
        select(SUBSCRIPTIONS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformSubscription);
    },

    async list(
      filters: SubscriptionFilters = {},
      options: PaginationOptions = {},
    ): Promise<PaginatedResult<Subscription>> {
      const { limit = 20, cursor, direction = 'desc' } = options;
      const conditions = [];

      // Apply filters
      if (filters.userId !== undefined && filters.userId !== '') {
        conditions.push(eq('user_id', filters.userId));
      }
      if (filters.planId !== undefined && filters.planId !== '') {
        conditions.push(eq('plan_id', filters.planId));
      }
      if (filters.status !== undefined) {
        if (Array.isArray(filters.status)) {
          conditions.push(inArray('status', filters.status));
        } else {
          conditions.push(eq('status', filters.status));
        }
      }
      if (filters.provider !== undefined) {
        conditions.push(eq('provider', filters.provider));
      }
      if (filters.cancelAtPeriodEnd !== undefined) {
        conditions.push(eq('cancel_at_period_end', filters.cancelAtPeriodEnd));
      }

      // Build query
      let query = select(SUBSCRIPTIONS_TABLE);

      if (conditions.length > 0) {
        const [firstCondition, ...restConditions] = conditions;
        if (firstCondition === undefined) {
          throw new Error('Failed to build subscription query conditions');
        }
        const whereCondition =
          restConditions.length === 0 ? firstCondition : and(firstCondition, ...restConditions);
        query = query.where(whereCondition);
      }

      // Cursor pagination
      if (cursor !== undefined && cursor !== '') {
        const parts = cursor.split('_');
        const cursorDateStr = parts[0];
        const cursorId = parts[1];
        if (
          cursorDateStr !== undefined &&
          cursorDateStr !== '' &&
          cursorId !== undefined &&
          cursorId !== ''
        ) {
          const cursorDate = new Date(cursorDateStr);
          if (direction === 'desc') {
            query = query.where(
              or(
                lt('created_at', cursorDate),
                and(eq('created_at', cursorDate), lt('id', cursorId)),
              ),
            );
          } else {
            query = query.where(
              or(
                gt('created_at', cursorDate),
                and(eq('created_at', cursorDate), gt('id', cursorId)),
              ),
            );
          }
        }
      }

      query = query
        .orderBy('created_at', direction)
        .orderBy('id', direction)
        .limit(limit + 1);

      const results = await db.query(query.toSql());
      const items = results.map(transformSubscription);

      const hasMore = items.length > limit;
      if (hasMore) {
        items.pop();
      }

      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem !== undefined
          ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
          : null;

      return { items, nextCursor };
    },

    async create(subscription: NewSubscription): Promise<Subscription> {
      const snakeData = toSnakeCase(
        subscription as unknown as Record<string, unknown>,
        SUBSCRIPTION_COLUMNS,
      );
      // Ensure metadata is JSON stringified
      if (subscription.metadata !== undefined) {
        snakeData['metadata'] = JSON.stringify(subscription.metadata);
      }
      const result = await db.queryOne(
        insert(SUBSCRIPTIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create subscription');
      }
      return transformSubscription(result);
    },

    async update(id: string, data: UpdateSubscription): Promise<Subscription | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        SUBSCRIPTION_COLUMNS,
      );
      // Ensure metadata is JSON stringified
      if (data.metadata !== undefined) {
        snakeData['metadata'] = JSON.stringify(data.metadata);
      }
      const result = await db.queryOne(
        update(SUBSCRIPTIONS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformSubscription(result) : null;
    },

    async updateByProviderSubscriptionId(
      provider: 'stripe' | 'paypal',
      providerSubscriptionId: string,
      data: UpdateSubscription,
    ): Promise<Subscription | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        SUBSCRIPTION_COLUMNS,
      );
      if (data.metadata !== undefined) {
        snakeData['metadata'] = JSON.stringify(data.metadata);
      }
      const result = await db.queryOne(
        update(SUBSCRIPTIONS_TABLE)
          .set(snakeData)
          .where(
            and(eq('provider', provider), eq('provider_subscription_id', providerSubscriptionId)),
          )
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformSubscription(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(SUBSCRIPTIONS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async findExpiringSoon(withinDays: number): Promise<Subscription[]> {
      const now = new Date();
      const futureDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

      const results = await db.query(
        select(SUBSCRIPTIONS_TABLE)
          .where(
            and(
              inArray('status', ACTIVE_STATUSES),
              gt('current_period_end', now),
              lt('current_period_end', futureDate),
              eq('cancel_at_period_end', false),
            ),
          )
          .orderBy('current_period_end', 'asc')
          .toSql(),
      );
      return results.map(transformSubscription);
    },

    async findPastDue(): Promise<Subscription[]> {
      const results = await db.query(
        select(SUBSCRIPTIONS_TABLE)
          .where(eq('status', 'past_due'))
          .orderBy('updated_at', 'desc')
          .toSql(),
      );
      return results.map(transformSubscription);
    },

    async countActiveByPlanId(planId: string): Promise<number> {
      const result = await db.queryOne<{ count: string | number }>(
        select(SUBSCRIPTIONS_TABLE)
          .columns()
          .column(raw('COUNT(*)'), 'count')
          .where(and(eq('plan_id', planId), inArray('status', ACTIVE_STATUSES)))
          .toSql(),
      );
      return result !== null ? Number(result.count) : 0;
    },
  };
}
