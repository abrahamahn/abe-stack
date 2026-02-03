import {
  NOTIFICATION_PREFERENCES_TABLE,
  PUSH_SUBSCRIPTIONS_TABLE,
  type NewNotificationPreference,
  type NewPushSubscription,
  type NotificationPreference,
  type PushSubscription
} from '../schema';
import { BaseRepository } from './base';

export class PushRepository extends BaseRepository {
  // ===================================
  // Push Subscriptions
  // ===================================

  /**
   * Create a new push subscription.
   */
  async createSubscription(data: NewPushSubscription): Promise<PushSubscription> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${PUSH_SUBSCRIPTIONS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const rows = await this.db.query<PushSubscription>(this.db.raw(sql, values));
    if (!rows[0]) throw new Error('Failed to create push subscription');
    return rows[0];
  }

  /**
   * Find subscriptions by user ID.
   */
  async findSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
    const sql = `
      SELECT * FROM ${PUSH_SUBSCRIPTIONS_TABLE}
      WHERE user_id = $1 AND is_active = true
    `;
    return this.db.query<PushSubscription>(this.db.raw(sql, [userId]));
  }

  /**
   * Delete specific subscription by endpoint (e.g., when 410 Gone).
   */
  async deleteSubscription(endpoint: string): Promise<void> {
    const sql = `
      DELETE FROM ${PUSH_SUBSCRIPTIONS_TABLE}
      WHERE endpoint = $1
    `;
    await this.db.execute(this.db.raw(sql, [endpoint]));
  }

  // ===================================
  // Notification Preferences
  // ===================================

  /**
   * Get preferences for a user, or null if defaults should be used.
   */
  async findPreferencesByUserId(userId: string): Promise<NotificationPreference | null> {
    const sql = `
      SELECT * FROM ${NOTIFICATION_PREFERENCES_TABLE}
      WHERE user_id = $1
      LIMIT 1
    `;
    return this.db.queryOne<NotificationPreference>(this.db.raw(sql, [userId]));
  }

  /**
   * Upsert preferences (PostgreSQL specific ON CONFLICT).
   */
  async upsertPreferences(data: NewNotificationPreference): Promise<NotificationPreference> {
      // Logic: If row exists for user_id, update simple fields. Else insert.
      // Since this is "Raw", we can use ON CONFLICT if we are sure user_id is unique/PK safe.
      // Assuming user_id is unique in this table? schema says "pk" is usually id, but user_id might be unique constraint?
      // Let's check schema/push.ts or just Assume insert-update logic safe for now.

      // Checking if preference exists first is safer for generic SQL
      const existing = await this.findPreferencesByUserId(data.userId);

      if (existing) {
          // Update
          const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'userId'); // don't update ID/UserId
           if (keys.length === 0) return existing;

          const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
          const values = keys.map(k => (data as any)[k]);

          const sql = `
            UPDATE ${NOTIFICATION_PREFERENCES_TABLE}
            SET ${setClause}
            WHERE id = $1
            RETURNING *
          `;

          const rows = await this.db.query<NotificationPreference>(this.db.raw(sql, [existing.id, ...values]));
          if (!rows[0]) throw new Error('Failed to update preferences');
          return rows[0];
      } else {
          // Create
          const columns = Object.keys(data).join(', ');
          const values = Object.values(data);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

          const sql = `
            INSERT INTO ${NOTIFICATION_PREFERENCES_TABLE} (${columns})
            VALUES (${placeholders})
            RETURNING *
          `;
           const rows = await this.db.query<NotificationPreference>(this.db.raw(sql, values));
           if (!rows[0]) throw new Error('Failed to create preferences');
           return rows[0];
      }
  }
}
