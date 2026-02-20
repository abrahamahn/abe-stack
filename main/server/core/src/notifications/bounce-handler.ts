// main/server/core/src/notifications/bounce-handler.ts
/**
 * Email Bounce Handler
 *
 * Tracks email delivery status and handles bounce events.
 * Distinguishes between soft bounces (transient, retryable) and
 * hard bounces (permanent, marks address as undeliverable).
 *
 * Bounce categories:
 * - Soft bounce: Temporary failures (mailbox full, server down).
 *   Retry up to `MAX_SOFT_BOUNCES` times before escalating to hard.
 * - Hard bounce: Permanent failures (invalid address, domain not found).
 *   Immediately marks the address as undeliverable.
 * - Complaint: Spam report from recipient.
 *   Treated like a hard bounce — address is suppressed.
 *
 * @module
 */

import type { DbClient } from '../../../db/src';

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of soft bounces before an address is treated as
 * permanently undeliverable (hard-bounce escalation).
 */
export const MAX_SOFT_BOUNCES = 3;

// ============================================================================
// Types
// ============================================================================

/** Email delivery status for tracking purposes. */
export type DeliveryStatus = 'sent' | 'delivered' | 'soft_bounce' | 'hard_bounce' | 'complained';

/** Bounce classification. */
export type BounceType = 'soft' | 'hard' | 'complaint';

/** Structured bounce event data. */
export interface BounceEvent {
  /** Recipient email address that bounced */
  recipient: string;
  /** Type of bounce */
  bounceType: BounceType;
  /** SMTP status code (e.g., "550", "452") */
  statusCode?: string;
  /** Diagnostic message from the receiving server */
  diagnosticMessage?: string;
  /** Provider-specific message ID */
  providerMessageId?: string;
  /** When the bounce occurred */
  bouncedAt: Date;
}

/** Delivery status record for an email address. */
export interface DeliveryRecord {
  /** Recipient email address */
  email: string;
  /** Current delivery status */
  status: DeliveryStatus;
  /** Number of soft bounces recorded */
  softBounceCount: number;
  /** Whether the address has been marked as undeliverable */
  isUndeliverable: boolean;
  /** Timestamp of the last bounce event */
  lastBounceAt: Date | null;
  /** Timestamp of the last successful delivery */
  lastDeliveredAt: Date | null;
  /** Last bounce diagnostic message */
  lastDiagnostic: string | null;
}

// ============================================================================
// Bounce Handler Service
// ============================================================================

/**
 * Process an incoming bounce event and update the delivery record.
 *
 * For soft bounces:
 * - Increments the soft bounce counter.
 * - If counter exceeds `MAX_SOFT_BOUNCES`, escalates to hard bounce.
 *
 * For hard bounces and complaints:
 * - Immediately marks the address as undeliverable.
 *
 * @param db - Database client
 * @param event - The bounce event to process
 * @returns Updated delivery record
 * @complexity O(1) - single read + update
 */
export async function processBounce(db: DbClient, event: BounceEvent): Promise<DeliveryRecord> {
  // Get or create delivery record for this email address
  const existing = await getDeliveryRecord(db, event.recipient);

  const record: DeliveryRecord = existing ?? {
    email: event.recipient,
    status: 'sent',
    softBounceCount: 0,
    isUndeliverable: false,
    lastBounceAt: null,
    lastDeliveredAt: null,
    lastDiagnostic: null,
  };

  switch (event.bounceType) {
    case 'soft': {
      record.softBounceCount += 1;
      record.lastBounceAt = event.bouncedAt;
      record.lastDiagnostic = event.diagnosticMessage ?? null;

      if (record.softBounceCount >= MAX_SOFT_BOUNCES) {
        // Escalate to hard bounce
        record.status = 'hard_bounce';
        record.isUndeliverable = true;
      } else {
        record.status = 'soft_bounce';
      }
      break;
    }

    case 'hard': {
      record.status = 'hard_bounce';
      record.isUndeliverable = true;
      record.lastBounceAt = event.bouncedAt;
      record.lastDiagnostic = event.diagnosticMessage ?? null;
      break;
    }

    case 'complaint': {
      record.status = 'complained';
      record.isUndeliverable = true;
      record.lastBounceAt = event.bouncedAt;
      record.lastDiagnostic = event.diagnosticMessage ?? 'Spam complaint received';
      break;
    }
  }

  // Persist the updated record
  await upsertDeliveryRecord(db, record);

  return record;
}

/**
 * Record a successful email delivery.
 *
 * Resets the soft bounce counter and updates the delivery timestamp.
 * Does NOT clear undeliverable status (requires explicit `resetBounceStatus`).
 *
 * @param db - Database client
 * @param email - Recipient email address
 * @returns Updated delivery record
 * @complexity O(1)
 */
export async function recordDelivery(db: DbClient, email: string): Promise<DeliveryRecord> {
  const existing = await getDeliveryRecord(db, email);

  const record: DeliveryRecord = existing ?? {
    email,
    status: 'sent',
    softBounceCount: 0,
    isUndeliverable: false,
    lastBounceAt: null,
    lastDeliveredAt: null,
    lastDiagnostic: null,
  };

  record.status = 'delivered';
  record.softBounceCount = 0;
  record.lastDeliveredAt = new Date();

  await upsertDeliveryRecord(db, record);
  return record;
}

/**
 * Check if an email address is marked as undeliverable.
 *
 * Use this before sending emails to avoid sending to known-bad addresses.
 *
 * @param db - Database client
 * @param email - Recipient email address to check
 * @returns true if the address is undeliverable
 * @complexity O(1)
 */
export async function isUndeliverable(db: DbClient, email: string): Promise<boolean> {
  const record = await getDeliveryRecord(db, email);
  return record !== null && record.isUndeliverable;
}

/**
 * Reset bounce status for an email address.
 *
 * Clears the undeliverable flag and resets bounce counters.
 * Useful when an admin manually verifies that an address is valid.
 *
 * @param db - Database client
 * @param email - Recipient email address
 * @returns true if a record was found and reset
 * @complexity O(1)
 */
export async function resetBounceStatus(db: DbClient, email: string): Promise<boolean> {
  const existing = await getDeliveryRecord(db, email);
  if (existing === null) return false;

  existing.status = 'sent';
  existing.softBounceCount = 0;
  existing.isUndeliverable = false;
  existing.lastDiagnostic = null;

  await upsertDeliveryRecord(db, existing);
  return true;
}

/**
 * Get the delivery record for an email address.
 *
 * @param db - Database client
 * @param email - Recipient email address
 * @returns Delivery record or null if no record exists
 * @complexity O(1)
 */
export async function getDeliveryRecord(
  db: DbClient,
  email: string,
): Promise<DeliveryRecord | null> {
  const row = await db.queryOne({
    text: `SELECT email, status, soft_bounce_count, is_undeliverable,
                  last_bounce_at, last_delivered_at, last_diagnostic
           FROM email_delivery_status
           WHERE email = $1
           LIMIT 1`,
    values: [email],
  });

  if (row === null) return null;

  return {
    email: row['email'] as string,
    status: row['status'] as DeliveryStatus,
    softBounceCount: Number(row['soft_bounce_count']),
    isUndeliverable: Boolean(row['is_undeliverable']),
    lastBounceAt: row['last_bounce_at'] !== null ? new Date(row['last_bounce_at'] as string) : null,
    lastDeliveredAt:
      row['last_delivered_at'] !== null ? new Date(row['last_delivered_at'] as string) : null,
    lastDiagnostic: (row['last_diagnostic'] as string | null) ?? null,
  };
}

/**
 * Upsert a delivery record into the database.
 *
 * Creates a new record or updates the existing one based on the email address.
 *
 * @param db - Database client
 * @param record - Delivery record to persist
 * @complexity O(1)
 */
async function upsertDeliveryRecord(db: DbClient, record: DeliveryRecord): Promise<void> {
  await db.execute({
    text: `INSERT INTO email_delivery_status
             (email, status, soft_bounce_count, is_undeliverable,
              last_bounce_at, last_delivered_at, last_diagnostic)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (email)
           DO UPDATE SET
             status = EXCLUDED.status,
             soft_bounce_count = EXCLUDED.soft_bounce_count,
             is_undeliverable = EXCLUDED.is_undeliverable,
             last_bounce_at = EXCLUDED.last_bounce_at,
             last_delivered_at = EXCLUDED.last_delivered_at,
             last_diagnostic = EXCLUDED.last_diagnostic,
             updated_at = NOW()`,
    values: [
      record.email,
      record.status,
      record.softBounceCount,
      record.isUndeliverable,
      record.lastBounceAt,
      record.lastDeliveredAt,
      record.lastDiagnostic,
    ],
  });
}
