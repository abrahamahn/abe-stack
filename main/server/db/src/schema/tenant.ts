// main/server/db/src/schema/tenant.ts
/**
 * Tenant Schema Types
 *
 * TypeScript interfaces for tenants, memberships, and invitations tables.
 * Maps to migration 0100_tenants.sql.
 */

import { INVITATION_STATUSES, type InvitationStatus, type TenantRole } from '@bslt/shared';

// Re-export shared constants for consumers that import from schema
export { INVITATION_STATUSES };
export type { InvitationStatus, TenantRole };

// Flat array form for SQL value checks (shared TENANT_ROLES is a keyed object)
export const TENANT_ROLES = [
  'owner',
  'admin',
  'member',
  'viewer',
] as const satisfies readonly TenantRole[];

// ============================================================================
// Table Names
// ============================================================================

export const TENANTS_TABLE = 'tenants';
export const MEMBERSHIPS_TABLE = 'memberships';
export const INVITATIONS_TABLE = 'invitations';

// ============================================================================
// Tenant Types
// ============================================================================

/**
 * Tenant record (SELECT result).
 * Represents a workspace / organization.
 *
 * @see 0100_tenants.sql
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  allowedEmailDomains: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new tenant.
 * Auto-generated fields (id, createdAt, updatedAt) are optional.
 */
export interface NewTenant {
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  ownerId: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  allowedEmailDomains?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing tenant.
 * Excludes immutable fields (id, ownerId, createdAt).
 */
export interface UpdateTenant {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  allowedEmailDomains?: string[];
  updatedAt?: Date;
}

// ============================================================================
// Membership Types
// ============================================================================

/**
 * Membership record (SELECT result).
 * Represents a user's role within a tenant.
 *
 * @see 0100_tenants.sql — UNIQUE(tenant_id, user_id)
 */
export interface Membership {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new membership.
 */
export interface NewMembership {
  id?: string;
  tenantId: string;
  userId: string;
  role?: TenantRole;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing membership.
 * Only role can be changed; tenantId + userId form the unique relationship.
 */
export interface UpdateMembership {
  role?: TenantRole;
  updatedAt?: Date;
}

// ============================================================================
// Invitation Types
// ============================================================================

/**
 * Invitation record (SELECT result).
 * Represents an email invite to join a tenant.
 *
 * @see 0100_tenants.sql — UNIQUE(tenant_id, email) for pending invites
 */
export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  status: InvitationStatus;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new invitation.
 */
export interface NewInvitation {
  id?: string;
  tenantId: string;
  email: string;
  role?: TenantRole;
  status?: InvitationStatus;
  invitedById: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdAt?: Date;
}

/**
 * Fields for updating an existing invitation.
 * Typically only status and acceptedAt change.
 */
export interface UpdateInvitation {
  status?: InvitationStatus;
  acceptedAt?: Date | null;
  expiresAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const TENANT_COLUMNS = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  logoUrl: 'logo_url',
  ownerId: 'owner_id',
  isActive: 'is_active',
  metadata: 'metadata',
  allowedEmailDomains: 'allowed_email_domains',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const MEMBERSHIP_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  userId: 'user_id',
  role: 'role',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const INVITATION_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  email: 'email',
  role: 'role',
  status: 'status',
  invitedById: 'invited_by_id',
  expiresAt: 'expires_at',
  acceptedAt: 'accepted_at',
  createdAt: 'created_at',
} as const;
