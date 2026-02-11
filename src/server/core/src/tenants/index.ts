// src/server/core/src/tenants/index.ts
/**
 * Tenants Package
 *
 * Provides workspace/tenant CRUD and management functionality.
 *
 * @module @abe-stack/tenants
 */

// Routes (for auto-registration)
export { tenantRoutes } from './routes';

// Handlers
export {
  handleAcceptInvitation,
  handleAddMember,
  handleCreateInvitation,
  handleCreateTenant,
  handleDeleteTenant,
  handleGetTenant,
  handleListInvitations,
  handleListMembers,
  handleListTenants,
  handleRemoveMember,
  handleResendInvitation,
  handleRevokeInvitation,
  handleTransferOwnership,
  handleUpdateMemberRole,
  handleUpdateTenant,
} from './handlers';

// Service (business logic)
export {
  createTenant,
  deleteTenant,
  getTenantById,
  getUserTenants,
  transferOwnership,
  updateTenant,
  type CreateTenantData,
  type TenantWithRole,
  type UpdateTenantData,
} from './service';

// Membership Service
export {
  addMember,
  listMembers,
  removeMember,
  updateMemberRole,
  type MemberInfo,
} from './membership-service';

// Invitation Service
export {
  acceptInvitation,
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  type InvitationInfo,
} from './invitation-service';

// Invitation Cleanup
export { expireStaleInvitations, type InvitationCleanupResult } from './invitation-cleanup';

// Middleware
export {
  buildAuthContext,
  createPermissionGuard,
  createWorkspaceRoleGuard,
  createWorkspaceScopeMiddleware,
  getRequestWorkspaceContext,
  requireRequestWorkspaceContext,
  type WorkspaceScopedRequest,
} from './middleware';

// Types (module dependency types)
export type {
  TenantsEmailOptions,
  TenantsEmailTemplates,
  TenantsLogger,
  TenantsModuleDeps,
  TenantsRequest,
} from './types';

export { ERROR_MESSAGES } from './types';
