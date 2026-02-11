// src/server/core/src/tenants/invitation-cleanup.ts
/**
 * Invitation Cleanup
 *
 * Finds pending invitations past their expires_at date and marks them as expired.
 * Designed to be called by a scheduled job or cron.
 *
 * @module invitation-cleanup
 */

import type { Repositories } from '@abe-stack/db';

// ============================================================================
// Types
// ============================================================================

/** Logger interface matching the tenants module pattern */
interface CleanupLogger {
  info(data: Record<string, unknown>, msg: string): void;
  error(data: unknown, msg?: string): void;
}

/** Result of a cleanup run */
export interface InvitationCleanupResult {
  /** Number of invitations transitioned to expired */
  expiredCount: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum invitations to process per cleanup run to limit DB pressure */
const CLEANUP_BATCH_SIZE = 200;

// ============================================================================
// Service Function
// ============================================================================

/**
 * Find pending invitations past their expires_at date and update their status to expired.
 *
 * @param repos - Repository container (needs repos.invitations)
 * @param log - Logger instance
 * @returns Count of newly expired invitations
 */
export async function expireStaleInvitations(
  repos: Pick<Repositories, 'invitations'>,
  log: CleanupLogger,
): Promise<InvitationCleanupResult> {
  const stale = await repos.invitations.findExpiredPending(CLEANUP_BATCH_SIZE);

  if (stale.length === 0) {
    log.info({ batch: CLEANUP_BATCH_SIZE }, 'No stale invitations found');
    return { expiredCount: 0 };
  }

  let expiredCount = 0;

  for (const invitation of stale) {
    try {
      await repos.invitations.update(invitation.id, { status: 'expired' });
      expiredCount++;
    } catch (error) {
      log.error(
        {
          invitationId: invitation.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to expire invitation',
      );
    }
  }

  log.info({ expiredCount, totalFound: stale.length }, 'Invitation cleanup completed');

  return { expiredCount };
}
