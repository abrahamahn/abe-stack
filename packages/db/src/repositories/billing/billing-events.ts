// packages/db/src/repositories/billing/billing-events.ts
/**
 * Billing Events Repository
 *
 * Data access layer for webhook idempotency tracking.
 */

import { and, eq, lt, select, insert, deleteFrom } from '../../builder';
import {
  type BillingEvent,
  type BillingEventType,
  type NewBillingEvent,
  BILLING_EVENT_COLUMNS,
  BILLING_EVENTS_TABLE,
} from '../../schema';
import { toCamelCase, toSnakeCase, parseJsonb } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Billing Event Repository Interface
// ============================================================================

export interface BillingEventRepository {
  /** Find event by ID */
  findById(id: string): Promise<BillingEvent | null>;

  /** Find event by provider event ID (for idempotency check) */
  findByProviderEventId(
    provider: 'stripe' | 'paypal',
    providerEventId: string,
  ): Promise<BillingEvent | null>;

  /** Check if event was already processed */
  wasProcessed(provider: 'stripe' | 'paypal', providerEventId: string): Promise<boolean>;

  /** Record a processed event */
  recordEvent(event: NewBillingEvent): Promise<BillingEvent>;

  /** Delete old events (for cleanup) */
  deleteOlderThan(date: Date): Promise<number>;

  /** List recent events by type */
  listByType(eventType: BillingEventType, limit?: number): Promise<BillingEvent[]>;
}

// ============================================================================
// Billing Event Repository Implementation
// ============================================================================

/**
 * Transform raw database row to BillingEvent type
 */
function transformBillingEvent(row: Record<string, unknown>): BillingEvent {
  const event = toCamelCase<BillingEvent>(row, BILLING_EVENT_COLUMNS);
  // Parse JSONB payload
  event.payload = parseJsonb(row.payload as string | null) || {};
  return event;
}

/**
 * Create a billing event repository
 */
export function createBillingEventRepository(db: RawDb): BillingEventRepository {
  return {
    async findById(id: string): Promise<BillingEvent | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(BILLING_EVENTS_TABLE).where(eq('id', id)).toSql(),
      );
      return result ? transformBillingEvent(result) : null;
    },

    async findByProviderEventId(
      provider: 'stripe' | 'paypal',
      providerEventId: string,
    ): Promise<BillingEvent | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(BILLING_EVENTS_TABLE)
          .where(and(eq('provider', provider), eq('provider_event_id', providerEventId)))
          .toSql(),
      );
      return result ? transformBillingEvent(result) : null;
    },

    async wasProcessed(provider: 'stripe' | 'paypal', providerEventId: string): Promise<boolean> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(BILLING_EVENTS_TABLE)
          .columns('1 as exists')
          .where(and(eq('provider', provider), eq('provider_event_id', providerEventId)))
          .limit(1)
          .toSql(),
      );
      return result !== null;
    },

    async recordEvent(event: NewBillingEvent): Promise<BillingEvent> {
      const snakeData = toSnakeCase(
        event as unknown as Record<string, unknown>,
        BILLING_EVENT_COLUMNS,
      );
      // Ensure payload is JSON stringified
      if (event.payload) {
        snakeData.payload = JSON.stringify(event.payload);
      }
      // Set processedAt if not provided
      if (!snakeData.processed_at) {
        snakeData.processed_at = new Date();
      }
      const result = await db.queryOne<Record<string, unknown>>(
        insert(BILLING_EVENTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (!result) {
        throw new Error('Failed to record billing event');
      }
      return transformBillingEvent(result);
    },

    async deleteOlderThan(date: Date): Promise<number> {
      return db.execute(deleteFrom(BILLING_EVENTS_TABLE).where(lt('created_at', date)).toSql());
    },

    async listByType(eventType: BillingEventType, limit = 100): Promise<BillingEvent[]> {
      const results = await db.query<Record<string, unknown>>(
        select(BILLING_EVENTS_TABLE)
          .where(eq('event_type', eventType))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformBillingEvent);
    },
  };
}
