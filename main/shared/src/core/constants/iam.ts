// main/shared/src/core/constants/iam.ts

/**
 * @file IAM & Tenancy Constants
 * @description Roles, permissions, user statuses, actor types, and reserved usernames.
 * @module Core/Constants/IAM
 */

// ============================================================================
// Actor & User
// ============================================================================

export const ACTOR_TYPES = ['user', 'system', 'api_key'] as const;
export const USER_STATUSES = ['active', 'locked', 'unverified'] as const;

// ============================================================================
// Tenant Roles & Permissions
// ============================================================================

export const TENANT_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export const PERMISSIONS = [
  'billing:manage',
  'billing:read',
  'membership:invite',
  'membership:manage',
  'membership:read',
  'settings:manage',
  'audit-log:read',
  'data:read',
  'data:write',
  'data:delete',
] as const;

// ============================================================================
// Invitations
// ============================================================================

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;

// ============================================================================
// Reserved Usernames
// ============================================================================

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'support',
  'system',
  'help',
  'root',
  'mod',
  'moderator',
  'staff',
  'team',
  'official',
  'info',
  'security',
  'abuse',
  'postmaster',
  'webmaster',
  'noreply',
  'null',
  'undefined',
  'api',
  'www',
  'mail',
  'ftp',
] as const;
