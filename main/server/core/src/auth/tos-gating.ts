// main/server/core/src/auth/tos-gating.ts
/**
 * Terms of Service (ToS) Version Gating
 *
 * Middleware and service functions for requiring users to accept
 * the latest Terms of Service before accessing protected resources.
 *
 * Uses the existing `legal_documents` and `user_agreements` tables
 * for an append-only, GDPR-compliant audit trail.
 *
 * @module tos-gating
 */

import { HTTP_STATUS } from '@bslt/shared';

import type { Repositories } from '../../../db/src';
import type { AppRole } from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Constants
// ============================================================================

/** Legal document type identifier for Terms of Service */
const TOS_DOCUMENT_TYPE = 'terms_of_service';

/** HTTP status code for ToS acceptance required */
const TOS_REQUIRED_STATUS = HTTP_STATUS.FORBIDDEN;

/** Error code sent to clients when ToS acceptance is needed */
const TOS_REQUIRED_CODE = 'TOS_ACCEPTANCE_REQUIRED';

// ============================================================================
// Types
// ============================================================================

/**
 * Request with an authenticated user attached by auth middleware.
 * ToS gating runs AFTER auth, so `user` is guaranteed to exist.
 */
interface AuthenticatedRequest extends FastifyRequest {
  user?: { userId: string; email: string; role: AppRole };
}

/**
 * Result of checking a user's ToS acceptance status.
 *
 * @complexity O(1) per field access
 */
export interface TosAcceptanceStatus {
  /** Whether the user has accepted the required ToS version */
  readonly accepted: boolean;
  /** The required ToS version (null if no ToS document exists) */
  readonly requiredVersion: number | null;
  /** The ToS document ID (null if no ToS document exists) */
  readonly documentId: string | null;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Check whether a user has accepted the latest Terms of Service.
 *
 * Queries the `legal_documents` table for the latest ToS version,
 * then checks `user_agreements` for an acceptance record.
 *
 * @param repos - Repository layer with legalDocuments and userAgreements
 * @param userId - The authenticated user's ID
 * @returns ToS acceptance status
 * @complexity O(1) — two indexed lookups
 */
export async function checkTosAcceptance(
  repos: Repositories,
  userId: string,
): Promise<TosAcceptanceStatus> {
  // Find the latest ToS document
  const latestTos = await repos.legalDocuments.findLatestByType(TOS_DOCUMENT_TYPE);

  if (latestTos === null) {
    // No ToS document exists — nothing to enforce
    return { accepted: true, requiredVersion: null, documentId: null };
  }

  // Check if the user has agreed to this specific document
  const agreement = await repos.consentRecords.findAgreementByUserAndDocument(userId, latestTos.id);

  return {
    accepted: agreement !== null,
    requiredVersion: latestTos.version,
    documentId: latestTos.id,
  };
}

/**
 * Record a user's acceptance of a Terms of Service document.
 *
 * Creates an append-only record in `user_agreements` for audit compliance.
 *
 * @param repos - Repository layer with userAgreements
 * @param userId - The authenticated user's ID
 * @param documentId - The legal document ID being accepted
 * @param ipAddress - Client IP address for audit trail
 * @returns The created agreement record
 * @throws When the database insert fails
 * @complexity O(1)
 */
export async function acceptTos(
  repos: Repositories,
  userId: string,
  documentId: string,
  ipAddress?: string,
): Promise<{ agreedAt: Date }> {
  const agreement = await repos.consentRecords.recordAgreement({
    userId,
    documentId,
    ipAddress: ipAddress ?? null,
  });

  return { agreedAt: agreement.createdAt };
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create a Fastify preHandler hook that gates access behind ToS acceptance.
 *
 * This middleware runs AFTER authentication (it requires `request.user`).
 * If the user has not accepted the latest ToS, it returns a 403 response
 * with a structured error body indicating which version must be accepted.
 *
 * @param repos - Repository layer with legalDocuments and userAgreements
 * @returns Async Fastify preHandler hook
 * @complexity O(1) per request — two indexed DB lookups
 *
 * @example
 * ```typescript
 * const tosHook = createRequireTosAcceptance(repos);
 * fastify.addHook('preHandler', tosHook);
 * ```
 */
export function createRequireTosAcceptance(repos: Repositories) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;
    const user = authRequest.user;

    // If no user is attached, auth middleware should have already rejected.
    // This is a safety guard — should never happen in practice.
    if (user === undefined) {
      void reply.status(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Unauthorized' });
      return;
    }

    const status = await checkTosAcceptance(repos, user.userId);

    if (!status.accepted) {
      void reply.status(TOS_REQUIRED_STATUS).send({
        code: TOS_REQUIRED_CODE,
        message: 'You must accept the latest Terms of Service to continue.',
        requiredVersion: status.requiredVersion,
        documentId: status.documentId,
      });
    }
  };
}
