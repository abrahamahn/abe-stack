// src/server/core/src/tenants/handlers/index.ts
/**
 * Tenants Handlers
 *
 * Re-exports all handler functions from the tenants module.
 *
 * @module handlers
 */

export {
  handleCreateTenant,
  handleDeleteTenant,
  handleGetTenant,
  handleListTenants,
  handleUpdateTenant,
} from './tenant-crud';

export {
  handleAddMember,
  handleListMembers,
  handleRemoveMember,
  handleUpdateMemberRole,
} from './members';

export { handleTransferOwnership } from './ownership';

export {
  handleAcceptInvitation,
  handleCreateInvitation,
  handleListInvitations,
  handleResendInvitation,
  handleRevokeInvitation,
} from './invitations';
