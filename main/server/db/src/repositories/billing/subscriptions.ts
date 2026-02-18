// main/server/db/src/repositories/billing/subscriptions.ts
/**
 * Subscriptions Repository
 *
 * Data access layer for billing subscriptions table.
 */

import { MS_PER_DAY } from '@bslt/shared';

import {
  and,
  deleteFrom,
  eq,
  gt,
  inArray,
  insert,
  lt,
  raw,
  select,
  update,
} from '../../builder/index';
import {
  type NewSubscription,
  type Subscription,
  SUBSCRIPTION_COLUMNS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTIONS_TABLE,
  type SubscriptionStatus,
  type UpdateSubscription,
} from '../../schema/index';
import { parseJsonb, toCamelCase, toSnakeCase } from '../../utils';
import { buildCursorCondition, buildCursorResult, combineConditions } from '../../utils/pagination';

import type { RawDb } from '../../client';
import type { CursorPaginatedResult, CursorPaginationOptions } from '../types';

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
    options?: Partial<CursorPaginationOptions>,
  ): Promise<CursorPaginatedResult<Subscription>>;

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

  /** Get subscriptions with expired trials */
  findExpiredTrials(now?: Date): Promise<Subscription[]>;

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

/** Frequently-referenced subscription statuses, sourced from shared constants */
const STATUS_ACTIVE = SUBSCRIPTION_STATUSES[0]; // 'active'
const STATUS_PAST_DUE = SUBSCRIPTION_STATUSES[4]; // 'past_due'
const STATUS_TRIALING = SUBSCRIPTION_STATUSES[6]; // 'trialing'

/**
 * Active subscription statuses
 */
const ACTIVE_STATUSES: SubscriptionStatus[] = [STATUS_ACTIVE, STATUS_TRIALING];

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
      options: Partial<CursorPaginationOptions> = {},
    ): Promise<CursorPaginatedResult<Subscription>> {
      const { limit = 20, cursor, sortOrder = 'desc' } = options;
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

      // Cursor condition
      const cursorCondition = buildCursorCondition(cursor, sortOrder);
      if (cursorCondition !== null) {
        conditions.push(cursorCondition);
      }

      // Build query
      let query = select(SUBSCRIPTIONS_TABLE);
      const where = combineConditions(conditions);
      if (where !== null) {
        query = query.where(where);
      }

      query = query
        .orderBy('created_at', sortOrder)
        .orderBy('id', sortOrder)
        .limit(limit + 1);

      const results = await db.query(query.toSql());
      const data = results.map(transformSubscription);

      return buildCursorResult(data, limit, sortOrder);
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
      const futureDate = new Date(now.getTime() + withinDays * MS_PER_DAY);

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
          .where(eq('status', STATUS_PAST_DUE))
          .orderBy('updated_at', 'desc')
          .toSql(),
      );
      return results.map(transformSubscription);
    },

    async findExpiredTrials(now?: Date): Promise<Subscription[]> {
      const currentTime = now ?? new Date();
      const results = await db.query(
        select(SUBSCRIPTIONS_TABLE)
          .where(and(eq('status', STATUS_TRIALING), lt('trial_end', currentTime)))
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
