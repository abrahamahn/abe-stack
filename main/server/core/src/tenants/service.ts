// main/server/core/src/tenants/service.ts
/**
 * Tenants Service
 *
 * Business logic for tenant/workspace CRUD operations.
 * Creates tenants with owner memberships in a single transaction.
 *
 * @module service
 */

import {
    BadRequestError,
    ForbiddenError,
    generateSecureId,
    NotFoundError,
    slugify,
} from '@abe-stack/shared';

import {
    deleteFrom,
    eq,
    insert,
    MEMBERSHIP_COLUMNS,
    MEMBERSHIPS_TABLE,
    select,
    TENANT_COLUMNS,
    TENANTS_TABLE,
    toCamelCase,
    update,
    withTransaction,
} from '../../../db/src';

import type { DbClient, Repositories } from '../../../db/src';

// ============================================================================
// Types
// ============================================================================

/** Input for creating a new tenant */
export interface CreateTenantData {
  name: string;
  slug?: string | undefined;
}

/** Input for updating a tenant */
export interface UpdateTenantData {
  name?: string | undefined;
  logoUrl?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/** Tenant role within a workspace */
type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';

/** Tenant with the user's membership role */
export interface TenantWithRole {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  role: TenantRole;
}

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Ensure slug uniqueness by appending a short random suffix if taken.
 */
async function ensureUniqueSlug(repos: Repositories, slug: string): Promise<string> {
  const existing = await repos.tenants.findBySlug(slug);
  if (existing === null) {
    return slug;
  }

  // Append random suffix
  const suffix = generateSecureId(6);
  const uniqueSlug = `${slug}-${suffix}`.slice(0, 100);

  // Verify the suffixed slug is also unique (extremely unlikely collision)
  const existing2 = await repos.tenants.findBySlug(uniqueSlug);
  if (existing2 !== null) {
    // Final fallback with timestamp
    return `${slug}-${Date.now().toString(36)}`.slice(0, 100);
  }

  return uniqueSlug;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new tenant with the creator as owner.
 * Uses a transaction to atomically create tenant + owner membership.
 *
 * @param db - Database client for transaction
 * @param repos - Repository container
 * @param userId - ID of the user creating the tenant
 * @param data - Tenant creation data
 * @returns Created tenant with owner role
 */
export async function createTenant(
  db: DbClient,
  repos: Repositories,
  userId: string,
  data: CreateTenantData,
): Promise<TenantWithRole> {
  const slug =
    data.slug !== undefined && data.slug.length > 0 ? data.slug : slugify(data.name).slice(0, 100);

  const uniqueSlug = await ensureUniqueSlug(repos, slug);

  // Create tenant + owner membership atomically in a transaction
  const result = await withTransaction(db, async (tx) => {
    // Insert tenant
    const tenantRows = await tx.query(
      insert(TENANTS_TABLE)
        .values({
          name: data.name,
          slug: uniqueSlug,
          owner_id: userId,
        })
        .returningAll()
        .toSql(),
    );

    if (tenantRows[0] === undefined) {
      throw new Error('Failed to create workspace');
    }

    const tenant = toCamelCase<{
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      ownerId: string;
      isActive: boolean;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
    }>(tenantRows[0], TENANT_COLUMNS);

    // Insert owner membership
    const membershipRows = await tx.query(
      insert(MEMBERSHIPS_TABLE)
        .values({
          tenant_id: tenant.id,
          user_id: userId,
          role: 'owner',
        })
        .returningAll()
        .toSql(),
    );

    if (membershipRows[0] === undefined) {
      throw new Error('Failed to create workspace membership');
    }

    const membership = toCamelCase<{
      id: string;
      tenantId: string;
      userId: string;
      role: TenantRole;
      createdAt: Date;
      updatedAt: Date;
    }>(membershipRows[0], MEMBERSHIP_COLUMNS);

    return { tenant, membership };
  });

  return {
    id: result.tenant.id,
    name: result.tenant.name,
    slug: result.tenant.slug,
    logoUrl: result.tenant.logoUrl,
    ownerId: result.tenant.ownerId,
    isActive: result.tenant.isActive,
    metadata: result.tenant.metadata,
    createdAt: result.tenant.createdAt,
    updatedAt: result.tenant.updatedAt,
    role: result.membership.role,
  };
}

/**
 * Get all tenants for a user with their role in each.
 * Uses a single JOIN query to avoid N+1 performance issues.
 *
 * @param db - Database client for direct query
 * @param userId - ID of the user
 * @returns Array of tenants with the user's role
 */
export async function getUserTenants(db: DbClient, userId: string): Promise<TenantWithRole[]> {
  const query = select(TENANTS_TABLE)
    .columns(
      'tenants.id',
      'tenants.name',
      'tenants.slug',
      'tenants.logo_url',
      'tenants.owner_id',
      'tenants.is_active',
      'tenants.metadata',
      'tenants.created_at',
      'tenants.updated_at',
      'memberships.role',
    )
    .innerJoin(MEMBERSHIPS_TABLE, { text: 'memberships.tenant_id = tenants.id', values: [] })
    .where(eq('memberships.user_id', userId))
    .toSql();

  const rows = await db.query(query);

  return rows.map((row) => ({
    id: row['id'] as string,
    name: row['name'] as string,
    slug: row['slug'] as string,
    logoUrl: (row['logo_url'] as string | null) ?? null,
    ownerId: row['owner_id'] as string,
    isActive: row['is_active'] as boolean,
    metadata: row['metadata'] as Record<string, unknown>,
    createdAt: row['created_at'] as Date,
    updatedAt: row['updated_at'] as Date,
    role: row['role'] as TenantRole,
  }));
}

/**
 * Get a tenant by ID with membership validation.
 *
 * @param repos - Repository container
 * @param tenantId - Tenant ID to look up
 * @param userId - ID of the requesting user (for membership check)
 * @returns Tenant with the user's role
 * @throws NotFoundError if tenant not found
 * @throws ForbiddenError if user is not a member
 */
export async function getTenantById(
  repos: Repositories,
  tenantId: string,
  userId: string,
): Promise<TenantWithRole> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  if (!tenant.isActive) {
    throw new ForbiddenError('This workspace has been suspended', 'WORKSPACE_SUSPENDED');
  }

  const membership = await repos.memberships.findByTenantAndUser(tenantId, userId);
  if (membership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    ownerId: tenant.ownerId,
    isActive: tenant.isActive,
    metadata: tenant.metadata,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    role: membership.role,
  };
}

/**
 * Update a tenant. Only owners and admins can update.
 *
 * @param repos - Repository container
 * @param tenantId - Tenant ID to update
 * @param userId - ID of the requesting user
 * @param data - Fields to update
 * @returns Updated tenant with role
 * @throws NotFoundError if tenant not found
 * @throws ForbiddenError if user lacks permission
 * @throws BadRequestError if slug is taken
 */
export async function updateTenant(
  repos: Repositories,
  tenantId: string,
  userId: string,
  data: UpdateTenantData,
): Promise<TenantWithRole> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const membership = await repos.memberships.findByTenantAndUser(tenantId, userId);
  if (membership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new ForbiddenError(
      'Only owners and admins can update workspace settings',
      'INSUFFICIENT_ROLE',
    );
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload['name'] = data.name;
  if ('logoUrl' in data) updatePayload['logoUrl'] = data.logoUrl;
  if (data.metadata !== undefined) updatePayload['metadata'] = data.metadata;

  if (Object.keys(updatePayload).length === 0) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      ownerId: tenant.ownerId,
      isActive: tenant.isActive,
      metadata: tenant.metadata,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      role: membership.role,
    };
  }

  const updated = await repos.tenants.update(tenantId, updatePayload);
  if (updated === null) {
    throw new Error('Failed to update workspace');
  }

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    logoUrl: updated.logoUrl,
    ownerId: updated.ownerId,
    isActive: updated.isActive,
    metadata: updated.metadata,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    role: membership.role,
  };
}

/**
 * Delete a tenant. Only owners can delete.
 * Deletes all memberships and the tenant in a transaction.
 *
 * @param db - Database client for transaction
 * @param repos - Repository container
 * @param tenantId - Tenant ID to delete
 * @param userId - ID of the requesting user
 * @throws NotFoundError if tenant not found
 * @throws ForbiddenError if user is not the owner
 */
export async function deleteTenant(
  db: DbClient,
  repos: Repositories,
  tenantId: string,
  userId: string,
): Promise<void> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const membership = await repos.memberships.findByTenantAndUser(tenantId, userId);
  if (membership?.role !== 'owner') {
    throw new ForbiddenError('Only the workspace owner can delete it', 'OWNER_REQUIRED');
  }

  await withTransaction(db, async (tx) => {
    // Delete all memberships for this tenant
    await tx.execute(deleteFrom(MEMBERSHIPS_TABLE).where(eq('tenant_id', tenantId)).toSql());

    // Delete the tenant
    await tx.execute(deleteFrom(TENANTS_TABLE).where(eq('id', tenantId)).toSql());
  });
}

// ============================================================================
// Ownership Transfer
// ============================================================================

/**
 * Transfer workspace ownership to another member.
 * Updates both the tenant's owner_id and the membership roles atomically.
 *
 * @param db - Database client for transaction
 * @param repos - Repository container
 * @param tenantId - Tenant ID
 * @param currentOwnerId - Current owner's user ID
 * @param newOwnerId - New owner's user ID
 * @throws NotFoundError if tenant not found
 * @throws ForbiddenError if caller is not the owner
 * @throws BadRequestError if new owner is not a member or is already the owner
 */
export async function transferOwnership(
  db: DbClient,
  repos: Repositories,
  tenantId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<void> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  // Verify current user is the owner
  const ownerMembership = await repos.memberships.findByTenantAndUser(tenantId, currentOwnerId);
  if (ownerMembership?.role !== 'owner') {
    throw new ForbiddenError('Only the workspace owner can transfer ownership', 'OWNER_REQUIRED');
  }

  if (currentOwnerId === newOwnerId) {
    throw new BadRequestError('Cannot transfer ownership to yourself');
  }

  // Verify new owner is a member
  const newOwnerMembership = await repos.memberships.findByTenantAndUser(tenantId, newOwnerId);
  if (newOwnerMembership === null) {
    throw new BadRequestError('The target user is not a member of this workspace');
  }

  await withTransaction(db, async (tx) => {
    // Promote new owner
    await tx.execute(
      update(MEMBERSHIPS_TABLE)
        .set({ role: 'owner' })
        .where(eq('id', newOwnerMembership.id))
        .toSql(),
    );

    // Demote current owner to admin
    await tx.execute(
      update(MEMBERSHIPS_TABLE).set({ role: 'admin' }).where(eq('id', ownerMembership.id)).toSql(),
    );

    // Update tenant's owner_id
    await tx.execute(
      update(TENANTS_TABLE).set({ owner_id: newOwnerId }).where(eq('id', tenantId)).toSql(),
    );
  });
}
