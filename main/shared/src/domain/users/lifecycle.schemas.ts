// main/shared/src/domain/users/lifecycle.schemas.ts
/**
 * Account Lifecycle Schemas
 *
 * Types and validation for account deactivation, deletion, and reactivation.
 * @module Domain/Users
 */

import { createSchema, parseOptional, parseString } from '../../core/schema.utils';

import type { Schema } from '../../core/api';

// ============================================================================
// Constants
// ============================================================================

/** Default grace period in days before permanent account deletion */
export const ACCOUNT_DELETION_GRACE_PERIOD_DAYS = 30;

// ============================================================================
// Types
// ============================================================================

/** Account status derived from lifecycle columns */
export type AccountStatus = 'active' | 'deactivated' | 'pending_deletion';

/** Fields needed to derive account status */
export interface AccountLifecycleFields {
  deactivatedAt: Date | null;
  deletedAt: Date | null;
  deletionGracePeriodEnds: Date | null;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/** Request to deactivate an account */
export interface DeactivateAccountRequest {
  reason?: string | undefined;
}

/** Request to delete an account (initiates grace period) */
export interface DeleteAccountRequest {
  reason?: string | undefined;
}

/** Response for account lifecycle operations */
export interface AccountLifecycleResponse {
  message: string;
  status: AccountStatus;
  deletionGracePeriodEnds?: string | undefined;
}

// ============================================================================
// Schemas
// ============================================================================

export const deactivateAccountRequestSchema: Schema<DeactivateAccountRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      reason: parseOptional(obj['reason'], (v) => parseString(v, 'reason')),
    };
  },
);

export const deleteAccountRequestSchema: Schema<DeleteAccountRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      reason: parseOptional(obj['reason'], (v) => parseString(v, 'reason')),
    };
  },
);

export const accountLifecycleResponseSchema: Schema<AccountLifecycleResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const status = parseString(obj['status'], 'status') as AccountStatus;

    return {
      message: parseString(obj['message'], 'message'),
      status,
      deletionGracePeriodEnds: parseOptional(obj['deletionGracePeriodEnds'], (v) =>
        parseString(v, 'deletionGracePeriodEnds'),
      ),
    };
  },
);
