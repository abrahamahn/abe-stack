import {
  CUSTOMER_MAPPINGS_TABLE,
  PLANS_TABLE,
  SUBSCRIPTIONS_TABLE,
  type BillingProvider,
  type CustomerMapping,
  type NewCustomerMapping,
  type NewSubscription,
  type Plan,
  type Subscription,
  type UpdateSubscription
} from '../schema';
import { BaseRepository } from './base';

export class BillingRepository extends BaseRepository {
  // ===================================
  // Plans
  // ===================================

  async findAllActivePlans(): Promise<Plan[]> {
    const sql = `
      SELECT * FROM ${PLANS_TABLE}
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;
    return this.db.query<Plan>(this.db.raw(sql));
  }

  async findPlanById(id: string): Promise<Plan | null> {
    const sql = `SELECT * FROM ${PLANS_TABLE} WHERE id = $1 LIMIT 1`;
    return this.db.queryOne<Plan>(this.db.raw(sql, [id]));
  }

  // ===================================
  // Subscriptions
  // ===================================

  async findSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    // Return the latest active or relevant subscription? Or list?
    // Usually one active sub per user for simple SaaS.
    const sql = `
      SELECT * FROM ${SUBSCRIPTIONS_TABLE}
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return this.db.queryOne<Subscription>(this.db.raw(sql, [userId]));
  }

  async createSubscription(data: NewSubscription): Promise<Subscription> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${SUBSCRIPTIONS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;
    const rows = await this.db.query<Subscription>(this.db.raw(sql, values));
    if (!rows[0]) throw new Error('Failed to create subscription');
    return rows[0];
  }

  async updateSubscription(id: string, data: UpdateSubscription): Promise<Subscription> {
    const keys = Object.keys(data);
    if (keys.length === 0) {
        const sub = await this.db.queryOne<Subscription>(this.db.raw(`SELECT * FROM ${SUBSCRIPTIONS_TABLE} WHERE id = $1`, [id]));
        if (!sub) throw new Error('Subscription not found');
        return sub;
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = Object.values(data);

    const sql = `
      UPDATE ${SUBSCRIPTIONS_TABLE}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    const rows = await this.db.query<Subscription>(this.db.raw(sql, [id, ...values]));
    if (!rows[0]) throw new Error('Failed to update subscription');
    return rows[0];
  }

  // ===================================
  // Customer Mappings
  // ===================================

  async findCustomerMapping(userId: string, provider: BillingProvider): Promise<CustomerMapping | null> {
    const sql = `
      SELECT * FROM ${CUSTOMER_MAPPINGS_TABLE}
      WHERE user_id = $1 AND provider = $2
      LIMIT 1
    `;
    return this.db.queryOne<CustomerMapping>(this.db.raw(sql, [userId, provider]));
  }

   async createCustomerMapping(data: NewCustomerMapping): Promise<CustomerMapping> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${CUSTOMER_MAPPINGS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;
    const rows = await this.db.query<CustomerMapping>(this.db.raw(sql, values));
    if (!rows[0]) throw new Error('Failed to create customer mapping');
    return rows[0];
  }
}
