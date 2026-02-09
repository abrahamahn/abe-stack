// src/shared/src/domain/tenant/index.ts

export {
  createTenantSchema,
  tenantSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type Tenant,
  type UpdateTenantInput,
} from './tenant.schemas';

export {
  assertWorkspaceScope,
  createWorkspaceContext,
  isWorkspaceScoped,
  type MaybeWorkspaceContext,
  type WorkspaceContext,
} from './tenant.workspace';
