// src/server/db/src/repositories/billing/plans.ts
/**
 * Plans Repository
 *
 * Data access layer for billing plans table.
 */

import { and, eq, ne, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewPlan,
  type Plan,
  type PlanFeature,
  type UpdatePlan,
  PLAN_COLUMNS,
  PLANS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase, parseJsonb } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Plan Repository Interface
// ============================================================================

export interface PlanRepository {
  /** Find plan by ID */
  findById(id: string): Promise<Plan | null>;

  /** Find plan by Stripe price ID */
  findByStripePriceId(stripePriceId: string): Promise<Plan | null>;

  /** Find plan by PayPal plan ID */
  findByPaypalPlanId(paypalPlanId: string): Promise<Plan | null>;

  /** List all active plans */
  listActive(): Promise<Plan[]>;

  /** List all plans (including inactive) */
  listAll(): Promise<Plan[]>;

  /** Create a new plan */
  create(plan: NewPlan): Promise<Plan>;

  /** Update a plan */
  update(id: string, data: UpdatePlan): Promise<Plan | null>;

  /** Delete a plan (hard delete - use deactivate for soft delete) */
  delete(id: string): Promise<boolean>;

  /** Deactivate a plan (soft delete) */
  deactivate(id: string): Promise<Plan | null>;

  /** Activate a plan */
  activate(id: string): Promise<Plan | null>;

  /** Check if plan exists by name */
  existsByName(name: string, excludeId?: string): Promise<boolean>;
}

// ============================================================================
// Plan Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Plan type
 */
function transformPlan(row: Record<string, unknown>): Plan {
  const plan = toCamelCase<Plan>(row, PLAN_COLUMNS);
  // Parse JSONB features
  const parsedFeatures = parseJsonb(row['features'] as string | null) as PlanFeature[] | null;
  plan.features = parsedFeatures ?? [];
  return plan;
}

/**
 * Create a plan repository
 */
export function createPlanRepository(db: RawDb): PlanRepository {
  return {
    async findById(id: string): Promise<Plan | null> {
      const result = await db.queryOne(select(PLANS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformPlan(result) : null;
    },

    async findByStripePriceId(stripePriceId: string): Promise<Plan | null> {
      const result = await db.queryOne(
        select(PLANS_TABLE).where(eq('stripe_price_id', stripePriceId)).toSql(),
      );
      return result !== null ? transformPlan(result) : null;
    },

    async findByPaypalPlanId(paypalPlanId: string): Promise<Plan | null> {
      const result = await db.queryOne(
        select(PLANS_TABLE).where(eq('paypal_plan_id', paypalPlanId)).toSql(),
      );
      return result !== null ? transformPlan(result) : null;
    },

    async listActive(): Promise<Plan[]> {
      const results = await db.query(
        select(PLANS_TABLE)
          .where(eq('is_active', true))
          .orderBy('sort_order', 'asc')
          .orderBy('price_in_cents', 'asc')
          .toSql(),
      );
      return results.map(transformPlan);
    },

    async listAll(): Promise<Plan[]> {
      const results = await db.query(
        select(PLANS_TABLE).orderBy('sort_order', 'asc').orderBy('price_in_cents', 'asc').toSql(),
      );
      return results.map(transformPlan);
    },

    async create(plan: NewPlan): Promise<Plan> {
      const snakeData = toSnakeCase(plan as unknown as Record<string, unknown>, PLAN_COLUMNS);
      // Ensure features is JSON stringified
      if (plan.features !== undefined) {
        snakeData['features'] = JSON.stringify(plan.features);
      }
      const result = await db.queryOne(
        insert(PLANS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create plan');
      }
      return transformPlan(result);
    },

    async update(id: string, data: UpdatePlan): Promise<Plan | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, PLAN_COLUMNS);
      // Ensure features is JSON stringified
      if (data.features !== undefined) {
        snakeData['features'] = JSON.stringify(data.features);
      }
      const result = await db.queryOne(
        update(PLANS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformPlan(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(PLANS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async deactivate(id: string): Promise<Plan | null> {
      const result = await db.queryOne(
        update(PLANS_TABLE)
          .set({ ['is_active']: false })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformPlan(result) : null;
    },

    async activate(id: string): Promise<Plan | null> {
      const result = await db.queryOne(
        update(PLANS_TABLE)
          .set({ ['is_active']: true })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformPlan(result) : null;
    },

    async existsByName(name: string, excludeId?: string): Promise<boolean> {
      let query = select(PLANS_TABLE).columns('1 as exists').where(eq('name', name)).limit(1);
      if (excludeId !== undefined && excludeId !== '') {
        query = select(PLANS_TABLE)
          .columns('1 as exists')
          .where(and(eq('name', name), ne('id', excludeId)))
          .limit(1);
      }
      const result = await db.queryOne(query.toSql());
      return result !== null;
    },
  };
}
