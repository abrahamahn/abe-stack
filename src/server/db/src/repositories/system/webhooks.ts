// src/server/db/src/repositories/system/webhooks.ts
/**
 * Webhooks Repository (Functional)
 *
 * Data access layer for the webhooks table.
 * Manages webhook registrations for event-driven notifications.
 *
 * @module
 */

import { and, eq, rawCondition, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewWebhook,
  type UpdateWebhook,
  type Webhook,
  WEBHOOK_COLUMNS,
  WEBHOOKS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Webhook Repository Interface
// ============================================================================

/**
 * Functional repository for webhook registration operations
 */
export interface WebhookRepository {
  /**
   * Create a new webhook registration
   * @param data - The webhook data to insert
   * @returns The created webhook
   * @throws Error if insert fails
   */
  create(data: NewWebhook): Promise<Webhook>;

  /**
   * Find a webhook by its ID
   * @param id - The webhook ID
   * @returns The webhook or null if not found
   */
  findById(id: string): Promise<Webhook | null>;

  /**
   * Find all webhooks for a tenant
   * @param tenantId - The tenant ID
   * @returns Array of webhooks
   */
  findByTenantId(tenantId: string): Promise<Webhook[]>;

  /**
   * Find active webhooks subscribed to a specific event
   * @param event - The event type string
   * @returns Array of active webhooks that include this event
   */
  findActiveByEvent(event: string): Promise<Webhook[]>;

  /**
   * Update a webhook registration
   * @param id - The webhook ID to update
   * @param data - The fields to update
   * @returns The updated webhook or null if not found
   */
  update(id: string, data: UpdateWebhook): Promise<Webhook | null>;

  /**
   * Delete a webhook by ID
   * @param id - The webhook ID to delete
   * @returns True if the webhook was deleted
   */
  delete(id: string): Promise<boolean>;
}

// ============================================================================
// Webhook Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Webhook type
 * @param row - Raw database row with snake_case keys
 * @returns Typed Webhook object
 * @complexity O(n) where n is number of columns
 */
function transformWebhook(row: Record<string, unknown>): Webhook {
  return toCamelCase<Webhook>(row, WEBHOOK_COLUMNS);
}

/**
 * Create a webhook repository bound to a database connection
 * @param db - The raw database client
 * @returns WebhookRepository implementation
 */
export function createWebhookRepository(db: RawDb): WebhookRepository {
  return {
    async create(data: NewWebhook): Promise<Webhook> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, WEBHOOK_COLUMNS);
      const result = await db.queryOne(
        insert(WEBHOOKS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create webhook');
      }
      return transformWebhook(result);
    },

    async findById(id: string): Promise<Webhook | null> {
      const result = await db.queryOne(select(WEBHOOKS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformWebhook(result) : null;
    },

    async findByTenantId(tenantId: string): Promise<Webhook[]> {
      const results = await db.query(
        select(WEBHOOKS_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformWebhook);
    },

    async findActiveByEvent(event: string): Promise<Webhook[]> {
      const results = await db.query(
        select(WEBHOOKS_TABLE)
          .where(and(eq('is_active', true), rawCondition('$1 = ANY("events")', [event])))
          .toSql(),
      );
      return results.map(transformWebhook);
    },

    async update(id: string, data: UpdateWebhook): Promise<Webhook | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, WEBHOOK_COLUMNS);
      const result = await db.queryOne(
        update(WEBHOOKS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformWebhook(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(WEBHOOKS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },
  };
}
