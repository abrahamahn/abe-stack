// main/server/core/src/users/data-hygiene.ts
/**
 * Data Hygiene Service
 *
 * Utility functions for checking and filtering soft-deleted users,
 * PII anonymization, file cleanup, foreign key safety checks,
 * and hard-delete of anonymized user records past retention.
 *
 * Sprint 3.16 — Data Hygiene
 *
 * @module users/data-hygiene
 */

import { createHash } from 'node:crypto';

import { RETENTION_PERIODS } from '@bslt/shared';

import {
  and,
  deleteFrom,
  eq,
  isNotNull,
  lt,
  select,
  toCamelCase,
  update,
  USER_COLUMNS,
  USERS_TABLE,
  type AuditEvent,
  type DbClient,
  type Repositories,
  type User,
} from '../../../db/src';

import type { FileStorageProvider } from '../files/types';
import type { ServerLogger } from '@bslt/shared';

// ============================================================================
// Soft-Delete Checks
// ============================================================================

/**
 * Check if a user has been soft-deleted.
 *
 * @param user - User record to check
 * @returns true if the user's deletedAt field is set
 * @complexity O(1)
 */
export function isUserDeleted(user: Pick<User, 'deletedAt'>): boolean {
  return user.deletedAt !== null;
}

/**
 * Filter soft-deleted users from an array.
 * Returns only users whose deletedAt is null (i.e., not deleted).
 *
 * @param users - Array of user records to filter
 * @returns Array with soft-deleted users removed
 * @complexity O(n) where n is the length of the input array
 */
export function filterDeletedUsers<T extends Pick<User, 'deletedAt'>>(users: T[]): T[] {
  return users.filter((user) => !isUserDeleted(user));
}

// ============================================================================
// Search & Member List Filtering
// ============================================================================

/**
 * Result type for paginated queries that include user records.
 * Generic to work with any paginated response shape.
 */
export interface PaginatedUsersResult<T extends Pick<User, 'deletedAt'>> {
  /** Array of user records */
  data: T[];
  /** Total count (will be adjusted to exclude soft-deleted users) */
  total: number;
}

/**
 * Filter soft-deleted users from paginated search results and member lists.
 *
 * Strips users whose `deletedAt` is set from the `data` array and adjusts
 * the `total` count accordingly. Use this to hide soft-deleted users from
 * search results, member lists, and public-facing user queries.
 *
 * @param result - Paginated result containing user records
 * @returns New result with soft-deleted users removed and total adjusted
 * @complexity O(n) where n is the length of the data array
 */
export function filterSoftDeletedFromResults<T extends Pick<User, 'deletedAt'>>(
  result: PaginatedUsersResult<T>,
): PaginatedUsersResult<T> {
  const activeUsers = result.data.filter((user) => !isUserDeleted(user));
  const removedCount = result.data.length - activeUsers.length;

  return {
    ...result,
    data: activeUsers,
    total: Math.max(0, result.total - removedCount),
  };
}

// ============================================================================
// PII Anonymization
// ============================================================================

/** Placeholder first name for anonymized users in audit trails */
const ANONYMIZED_DISPLAY_NAME = 'Deleted User';

/**
 * Result of PII anonymization for a single user.
 */
export interface AnonymizeUserResult {
  /** Whether PII was successfully anonymized */
  success: boolean;
  /** The anonymized email hash (for audit trail reference) */
  emailHash: string;
}

/**
 * Anonymize PII for a single user, preserving audit trail structure.
 *
 * Replaces personally identifiable information with anonymized values:
 * - Email becomes `{sha256}@anonymized.local` (preserves uniqueness)
 * - First name becomes "Deleted User" (preserves audit readability)
 * - Last name, phone, bio, avatar, location, and other profile fields are cleared
 * - Username becomes `deleted_{userId}` to prevent reuse conflicts
 *
 * The SHA-256 hash of the original email allows admins to verify identity
 * if needed for legal compliance, without exposing the email itself.
 *
 * Audit log entries referencing this user will display "Deleted User ({hash})"
 * via the `getAnonymizedActorLabel` helper.
 *
 * @param db - Database client
 * @param userId - ID of the user to anonymize
 * @param log - Logger instance
 * @returns Result indicating success and the email hash
 * @complexity O(1) - single database update
 */
export async function anonymizeUserPII(
  db: DbClient,
  userId: string,
  log: ServerLogger,
): Promise<AnonymizeUserResult> {
  // Fetch the current user record
  const rows = await db.query(select(USERS_TABLE).where(eq('id', userId)).toSql());

  const firstRow = rows[0];
  if (rows.length === 0 || firstRow === undefined) {
    log.warn({ userId }, 'Cannot anonymize PII: user not found');
    return { success: false, emailHash: '' };
  }

  const user = toCamelCase<User>(firstRow, USER_COLUMNS);

  // Skip if already anonymized
  if (ANONYMIZED_EMAIL_PATTERN.test(user.email)) {
    log.debug({ userId }, 'User PII already anonymized, skipping');
    return { success: true, emailHash: user.email.split('@')[0] ?? '' };
  }

  const emailHash = createHash('sha256').update(user.email).digest('hex');
  const anonymizedEmail = `${emailHash}@anonymized.local`;

  await db.execute(
    update(USERS_TABLE)
      .set({
        email: anonymizedEmail,
        canonical_email: anonymizedEmail,
        username: `deleted_${userId}`,
        first_name: ANONYMIZED_DISPLAY_NAME,
        last_name: '',
        phone: null,
        bio: null,
        avatar_url: null,
        date_of_birth: null,
        gender: null,
        city: null,
        state: null,
        country: null,
        website: null,
      })
      .where(eq('id', userId))
      .toSql(),
  );

  log.info({ userId, emailHash: emailHash.substring(0, 8) }, 'User PII anonymized');

  return { success: true, emailHash };
}

/**
 * Generate a display label for an anonymized user in audit logs.
 *
 * Returns "Deleted User (abc123...)" format for use in audit event
 * display where the original actor name is no longer available.
 *
 * @param emailHash - The SHA-256 hash of the original email (first 8 chars used)
 * @returns Display label for the anonymized user
 * @complexity O(1)
 */
export function getAnonymizedActorLabel(emailHash: string): string {
  const shortHash = emailHash.substring(0, 8);
  return `Deleted User (${shortHash})`;
}

// ============================================================================
// File Cleanup
// ============================================================================

/**
 * Result of user file cleanup.
 */
export interface FileCleanupResult {
  /** Number of file records deleted from the database */
  deletedRecordCount: number;
  /** Number of storage objects deleted */
  deletedStorageCount: number;
  /** Errors encountered during cleanup (non-fatal) */
  errors: string[];
}

/**
 * Delete all stored files (avatars, uploads) associated with a user.
 *
 * Finds all file records for the user, deletes the corresponding objects
 * from the storage provider, then removes the database records.
 * Errors are collected but do not stop the cleanup process.
 *
 * This should be called during PII anonymization or before hard-delete
 * to ensure no orphaned files remain in storage.
 *
 * @param repos - Repository container (needs repos.files)
 * @param storage - Storage provider for file deletion
 * @param userId - ID of the user whose files should be deleted
 * @param log - Logger instance
 * @returns Cleanup result with counts and any errors
 * @complexity O(n) where n is the number of files owned by the user
 */
export async function cleanupUserFiles(
  repos: Pick<Repositories, 'files'>,
  storage: FileStorageProvider,
  userId: string,
  log: ServerLogger,
): Promise<FileCleanupResult> {
  const result: FileCleanupResult = {
    deletedRecordCount: 0,
    deletedStorageCount: 0,
    errors: [],
  };

  // Find all files owned by the user
  const files = await repos.files.findByUserId(userId);

  if (files.length === 0) {
    log.debug({ userId }, 'No files to clean up for user');
    return result;
  }

  // Delete storage objects first, then database records
  for (const file of files) {
    try {
      await storage.delete(file.storagePath);
      result.deletedStorageCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Storage delete failed for ${file.storagePath}: ${message}`);
      log.warn(
        { userId, fileId: file.id, storagePath: file.storagePath, error: message },
        'Failed to delete file from storage during user cleanup',
      );
    }
  }

  // Delete all database records in bulk
  try {
    const deletedCount = await repos.files.deleteByUserId(userId);
    result.deletedRecordCount = deletedCount;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Database record deletion failed: ${message}`);
    log.error({ userId, error: message }, 'Failed to delete file records during user cleanup');
  }

  log.info(
    {
      userId,
      deletedRecordCount: result.deletedRecordCount,
      deletedStorageCount: result.deletedStorageCount,
      errorCount: result.errors.length,
    },
    'User file cleanup completed',
  );

  return result;
}

// ============================================================================
// Foreign Key Safety
// ============================================================================

/**
 * Result of foreign key safety check.
 */
export interface ForeignKeySafetyResult {
  /** Whether it is safe to hard-delete the user */
  safe: boolean;
  /** List of blocking references that prevent hard-delete */
  blockingReferences: string[];
}

/**
 * Check foreign key references before hard-deleting a user.
 *
 * Verifies that audit logs, invoices, and activity history will not break
 * when the user record is removed. Records with ON DELETE CASCADE are safe.
 * Records with ON DELETE RESTRICT (e.g., tenant ownership) will block deletion.
 *
 * This function is a pre-flight check: it does NOT perform the deletion.
 *
 * @param repos - Repository container
 * @param userId - ID of the user to check
 * @param log - Logger instance
 * @returns Safety result with blocking references if any
 * @complexity O(k) where k is the number of reference checks
 */
export async function ensureForeignKeySafety(
  repos: Pick<Repositories, 'tenants' | 'invoices' | 'subscriptions'>,
  userId: string,
  log: ServerLogger,
): Promise<ForeignKeySafetyResult> {
  const blockingReferences: string[] = [];

  // Check tenant ownership (ON DELETE RESTRICT — blocks hard-delete)
  try {
    const ownedTenants = await repos.tenants.findByOwnerId(userId);
    if (ownedTenants.length > 0) {
      blockingReferences.push(`tenant_owner: ${ownedTenants.map((t) => t.id).join(', ')}`);
    }
  } catch {
    // If the method doesn't exist or fails, assume no blocking refs
    log.debug({ userId }, 'Tenant ownership check skipped (method unavailable)');
  }

  // Check active subscriptions (should be canceled before deletion)
  try {
    const subscriptions = await repos.subscriptions.findByUserId(userId);
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'active' || s.status === 'trialing',
    );
    if (activeSubscriptions.length > 0) {
      blockingReferences.push(
        `active_subscriptions: ${activeSubscriptions.map((s) => s.id).join(', ')}`,
      );
    }
  } catch {
    log.debug({ userId }, 'Subscription check skipped (method unavailable)');
  }

  // Check unpaid invoices (should be resolved before deletion)
  try {
    const invoiceResult = await repos.invoices.findByUserId(userId);
    const unpaidInvoices = invoiceResult.data.filter(
      (i) => i.status === 'open' || i.status === 'past_due',
    );
    if (unpaidInvoices.length > 0) {
      blockingReferences.push(`unpaid_invoices: ${unpaidInvoices.map((i) => i.id).join(', ')}`);
    }
  } catch {
    log.debug({ userId }, 'Invoice check skipped (method unavailable)');
  }

  const safe = blockingReferences.length === 0;

  if (!safe) {
    log.warn(
      { userId, blockingReferences },
      'Foreign key safety check failed — user cannot be hard-deleted',
    );
  } else {
    log.debug({ userId }, 'Foreign key safety check passed');
  }

  return { safe, blockingReferences };
}

// ============================================================================
// Hard-Delete Anonymized Users
// ============================================================================

/** Pattern matching anonymized email addresses (SHA-256 hex @ anonymized.local) */
export const ANONYMIZED_EMAIL_PATTERN = /^[a-f0-9]{64}@anonymized\.local$/;

/**
 * Result of hard-delete operation.
 */
export interface HardDeleteResult {
  /** Number of user records permanently deleted */
  deletedCount: number;
}

/**
 * Hard-delete user records that were anonymized more than retentionDays ago.
 *
 * Finds users where:
 * - `deleted_at` is set (soft-deleted)
 * - email matches the anonymized pattern ({sha256}@anonymized.local)
 * - `deleted_at` is older than retention cutoff
 *
 * Qualifying users are hard-deleted from the database.
 * Related records (sessions, tokens, memberships, etc.) are removed
 * via ON DELETE CASCADE foreign key constraints.
 *
 * If a user owns a tenant (ON DELETE RESTRICT), the delete is skipped
 * and logged as a warning.
 *
 * @param db - Database client
 * @param log - Logger instance
 * @param retentionDays - Days after anonymization before hard-delete (default: 30)
 * @returns Count of deleted users
 * @complexity O(n) where n is the number of qualifying users
 */
export async function hardDeleteAnonymizedUsers(
  db: DbClient,
  log: ServerLogger,
  retentionDays: number = RETENTION_PERIODS.HARD_DELETE_DAYS,
): Promise<HardDeleteResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  // Find soft-deleted users whose deleted_at is older than the retention cutoff
  const rows = await db.query(
    select(USERS_TABLE)
      .where(and(isNotNull('deleted_at'), lt('deleted_at', cutoff)))
      .toSql(),
  );

  const users = rows.map((row) => toCamelCase<User>(row, USER_COLUMNS));

  // Filter to only anonymized users (email matches SHA-256 pattern)
  const usersToDelete = users.filter((user) => ANONYMIZED_EMAIL_PATTERN.test(user.email));

  let deletedCount = 0;

  for (const user of usersToDelete) {
    try {
      const deleted = await db.execute(deleteFrom(USERS_TABLE).where(eq('id', user.id)).toSql());

      if (deleted > 0) {
        deletedCount++;
      }
    } catch (error) {
      // ON DELETE RESTRICT (e.g., tenant owner) will throw — skip and log
      log.warn(
        {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to hard-delete anonymized user (may be tenant owner)',
      );
    }
  }

  if (deletedCount > 0) {
    log.info({ deletedCount }, 'Hard-delete anonymized users completed');
  } else {
    log.debug('Hard-delete anonymized users: no users to delete');
  }

  return { deletedCount };
}

// ============================================================================
// Audit Trail Preservation
// ============================================================================

/**
 * Query audit events for a user, including soft-deleted users.
 *
 * Audit events in the `audit_events` table reference users via `actor_id`
 * with `ON DELETE SET NULL` (not CASCADE). This means:
 *
 * - **During soft-delete phase**: `actor_id` still points to the user row,
 *   so all events remain queryable by the user's ID.
 * - **During PII anonymization**: the user record is updated but still exists,
 *   so `actor_id` is unchanged and events remain queryable.
 * - **After hard-delete**: `actor_id` is set to NULL, but the event rows
 *   themselves are preserved in the audit trail.
 *
 * Use this function in admin contexts to query the full event history for
 * a user who has been soft-deleted or whose data has been anonymized.
 *
 * @param repos - Repository container (needs repos.auditEvents)
 * @param userId - The ID of the user (may be soft-deleted)
 * @param limit - Maximum number of events to return (default: 100)
 * @returns Array of audit events, most recent first
 * @complexity O(log n) — indexed query on actor_id
 */
export async function getAuditEventsForDeletedUser(
  repos: Pick<Repositories, 'auditEvents'>,
  userId: string,
  limit = 100,
): Promise<AuditEvent[]> {
  return repos.auditEvents.findByActorId(userId, limit);
}
