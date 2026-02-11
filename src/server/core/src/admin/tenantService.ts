// src/server/core/src/admin/tenantService.ts
/**
 * Admin Tenant Service
 *
 * Business logic for administrative tenant/workspace operations.
 * All operations require admin privileges (enforced at route level).
 */

import {
  ilike,
  or,
  select,
  selectCount,
  toCamelCase,
  type DbClient,
  type Repositories,
} from '@abe-stack/db';
import { NotFoundError } from '@abe-stack/shared';

// ============================================================================
// Constants
// ============================================================================

const TENANTS_TABLE = 'tenants';

const TENANT_COLUMNS = {
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

// ============================================================================
// Types
// ============================================================================

/** Tenant row from DB query */
interface DbTenant {
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

/** Admin view of a tenant */
export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Admin tenant detail with additional info */
export interface AdminTenantDetail extends AdminTenant {
  metadata: Record<string, unknown>;
  allowedEmailDomains: string[];
}

/** Paginated tenant list response */
export interface AdminTenantListResponse {
  tenants: AdminTenant[];
  total: number;
  limit: number;
  offset: number;
}

/** Options for listing tenants */
export interface ListTenantsOptions {
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
}

/** Result of a suspend/unsuspend operation */
export interface TenantSuspendResult {
  message: string;
  tenant: AdminTenant;
}

// ============================================================================
// Error
// ============================================================================

/** Error thrown when a tenant is not found */
export class TenantNotFoundError extends NotFoundError {
  constructor(tenantId: string) {
    super(`Tenant not found: ${tenantId}`);
  }
}

// ============================================================================
// Helpers
// ============================================================================

/** Repos needed for admin tenant operations */
type TenantRepos = Pick<Repositories, 'tenants' | 'memberships'>;

/**
 * Get member count for a tenant.
 */
async function getMemberCount(repos: TenantRepos, tenantId: string): Promise<number> {
  const members = await repos.memberships.findByTenantId(tenantId);
  return members.length;
}

/**
 * Convert a tenant to AdminTenant format with member count.
 */
function toAdminTenant(tenant: DbTenant, memberCount: number): AdminTenant {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    ownerId: tenant.ownerId,
    isActive: tenant.isActive,
    memberCount,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * List all tenants with optional search and pagination.
 *
 * Queries the database directly since TenantRepository does not
 * provide a list-all method. Supports searching by name or slug.
 *
 * @param db - Database client for direct queries
 * @param repos - Tenant and membership repositories (for member counts)
 * @param options - Pagination and search options
 * @returns Paginated list of tenants with member counts
 */
export async function listAllTenants(
  db: DbClient,
  repos: TenantRepos,
  options: ListTenantsOptions = {},
): Promise<AdminTenantListResponse> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  // Build query with optional search filter
  let dataQuery = select(TENANTS_TABLE);
  let countQuery = selectCount(TENANTS_TABLE);

  if (options.search !== undefined && options.search !== '') {
    const escapedSearch = options.search
      .replace(/\\/g, '\\\\')
      .replaceAll('%', '\\%')
      .replaceAll('_', '\\_');
    const pattern = `%${escapedSearch}%`;
    const searchCondition = or(ilike('name', pattern), ilike('slug', pattern));
    dataQuery = dataQuery.where(searchCondition);
    countQuery = countQuery.where(searchCondition);
  }

  dataQuery = dataQuery.orderBy('created_at', 'desc').limit(limit).offset(offset);

  // Execute queries
  const rows = await db.query(dataQuery.toSql());
  const countRow = await db.queryOne(countQuery.toSql());
  const total = countRow !== null ? Number(countRow['count']) : 0;

  // Transform rows and get member counts
  const tenants: AdminTenant[] = [];
  for (const row of rows) {
    const tenant = toCamelCase<DbTenant>(row, TENANT_COLUMNS);
    const memberCount = await getMemberCount(repos, tenant.id);
    tenants.push(toAdminTenant(tenant, memberCount));
  }

  return { tenants, total, limit, offset };
}

/**
 * Get tenant detail by ID.
 *
 * @param repos - Tenant and membership repositories
 * @param tenantId - Tenant ID to look up
 * @returns Tenant detail with member count
 * @throws {TenantNotFoundError} If tenant not found
 */
export async function getTenantDetail(
  repos: TenantRepos,
  tenantId: string,
): Promise<AdminTenantDetail> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new TenantNotFoundError(tenantId);
  }

  const memberCount = await getMemberCount(repos, tenantId);

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    ownerId: tenant.ownerId,
    isActive: tenant.isActive,
    memberCount,
    metadata: tenant.metadata,
    allowedEmailDomains: tenant.allowedEmailDomains,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

/**
 * Suspend a tenant by setting isActive to false.
 *
 * @param repos - Tenant and membership repositories
 * @param tenantId - Tenant ID to suspend
 * @param _reason - Reason for suspension (logged at handler level, not stored in tenant record)
 * @returns Suspend result with updated tenant
 * @throws {TenantNotFoundError} If tenant not found
 */
export async function suspendTenant(
  repos: TenantRepos,
  tenantId: string,
  _reason: string,
): Promise<TenantSuspendResult> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new TenantNotFoundError(tenantId);
  }

  const memberCount = await getMemberCount(repos, tenantId);

  if (!tenant.isActive) {
    return {
      message: 'Tenant is already suspended',
      tenant: toAdminTenant(tenant, memberCount),
    };
  }

  const updated = await repos.tenants.update(tenantId, { isActive: false });
  if (updated === null) {
    throw new Error('Failed to suspend tenant');
  }

  return {
    message: 'Tenant suspended successfully',
    tenant: toAdminTenant(updated, memberCount),
  };
}

/**
 * Unsuspend a tenant by setting isActive to true.
 *
 * @param repos - Tenant and membership repositories
 * @param tenantId - Tenant ID to unsuspend
 * @returns Unsuspend result with updated tenant
 * @throws {TenantNotFoundError} If tenant not found
 */
export async function unsuspendTenant(
  repos: TenantRepos,
  tenantId: string,
): Promise<TenantSuspendResult> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new TenantNotFoundError(tenantId);
  }

  const memberCount = await getMemberCount(repos, tenantId);

  if (tenant.isActive) {
    return {
      message: 'Tenant is already active',
      tenant: toAdminTenant(tenant, memberCount),
    };
  }

  const updated = await repos.tenants.update(tenantId, { isActive: true });
  if (updated === null) {
    throw new Error('Failed to unsuspend tenant');
  }

  return {
    message: 'Tenant unsuspended successfully',
    tenant: toAdminTenant(updated, memberCount),
  };
}
