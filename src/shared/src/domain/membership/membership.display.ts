// src/shared/src/domain/membership/membership.display.ts

import type { InvitationStatus } from './membership.schemas';

// ============================================================================
// Tenant Role Display
// ============================================================================

const TENANT_ROLE_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  owner: 'danger',
  admin: 'warning',
  member: 'info',
  viewer: 'success',
};

/**
 * Get the badge tone for a tenant role.
 */
export function getTenantRoleTone(role: string): 'info' | 'success' | 'warning' | 'danger' {
  return TENANT_ROLE_TONES[role] ?? 'info';
}

// ============================================================================
// Invitation Status Display
// ============================================================================

const INVITATION_STATUS_TONES: Record<InvitationStatus, 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'info',
  accepted: 'success',
  revoked: 'danger',
  expired: 'warning',
};

/**
 * Get the badge tone for an invitation status.
 */
export function getInvitationStatusTone(status: InvitationStatus): 'info' | 'success' | 'warning' | 'danger' {
  return INVITATION_STATUS_TONES[status];
}
