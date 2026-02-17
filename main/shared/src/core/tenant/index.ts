// main/shared/src/domain/tenant/index.ts

/**
 * @file Tenant Module Barrel
 * @description Re-exports all tenant domain types, schemas, and utilities.
 * @module Core/Tenant
 */

// --- domain-restrictions ---
export { extractEmailDomain, isEmailDomainAllowed } from './domain-restrictions';

// --- tenant.logic ---
export {
  getWorkspaceContext,
  hasRequiredWorkspaceRole,
  isAdmin,
  isOwner,
  WORKSPACE_ID_HEADER,
  WORKSPACE_ROLE_HEADER,
} from './tenant.logic';

// --- tenant.schemas ---
export {
  createTenantSchema,
  tenantSchema,
  transferOwnershipSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type MaybeWorkspaceContext,
  type Tenant,
  type TransferOwnershipInput,
  type UpdateTenantInput,
  type WorkspaceContext,
} from './tenant.schemas';

// --- tenant.workspace ---
export {
  assertWorkspaceScope,
  createWorkspaceContext,
  isWorkspaceScoped,
} from './tenant.workspace';

// --- tenant-settings.schemas ---
export {
  createTenantSettingSchema,
  tenantSettingSchema,
  updateTenantSettingSchema,
  type CreateTenantSetting,
  type TenantSetting,
  type UpdateTenantSetting,
} from './tenant.settings.schemas';
