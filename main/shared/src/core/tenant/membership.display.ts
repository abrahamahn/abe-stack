// main/shared/src/core/tenant/membership.display.ts
/**
 * @file Membership Display
 * @description Badge tones for tenant roles and invitation statuses.
 * @module Core/Tenant
 */

import type { InvitationStatus } from './membership.schemas';

// ============================================================================
// Constants
// ============================================================================

const TENANT_ROLE_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  owner: 'danger',
  admin: 'warning',
  member: 'info',
  viewer: 'success',
};

const INVITATION_STATUS_TONES: Record<InvitationStatus, 'info' | 'success' | 'warning' | 'danger'> =
  {
    pending: 'info',
    accepted: 'success',
    revoked: 'danger',
    expired: 'warning',
  };

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the badge tone for a tenant role.
 */
export function getTenantRoleTone(role: string): 'info' | 'success' | 'warning' | 'danger' {
  return TENANT_ROLE_TONES[role] ?? 'info';
}

/**
 * Get the badge tone for an invitation status.
 */
export function getInvitationStatusTone(
  status: InvitationStatus,
): 'info' | 'success' | 'warning' | 'danger' {
  return INVITATION_STATUS_TONES[status];
}
