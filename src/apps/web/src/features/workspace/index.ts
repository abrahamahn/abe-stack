// src/apps/web/src/features/workspace/index.ts

// Components
export { Can, meetsRoleRequirement, RequireWorkspaceRole } from './components';
export type { CanProps, RequireWorkspaceRoleProps } from './components';
export { WorkspaceList, CreateWorkspaceDialog, WorkspaceSettingsForm } from './components';
export { MembersList, InviteMemberDialog, InvitationsList, TenantSwitcher } from './components';
export { MemberDetailPanel, WorkspaceAuditLog } from './components';
export type { MemberDetailPanelProps, MemberDetail, WorkspaceAuditLogProps } from './components';

// Hooks
export { usePermissions } from './hooks';
export type { PermissionsResult, UsePermissionsOptions } from './hooks';
export { useWorkspaces, useWorkspace, useWorkspaceContext } from './hooks';
export { useCreateWorkspace, useUpdateWorkspace, useDeleteWorkspace } from './hooks';
export { useMembers, useUpdateMemberRole, useRemoveMember } from './hooks';
export {
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  useResendInvitation,
  useAcceptInvitation,
} from './hooks';
export { useAuditLog } from './hooks';
export type { UseAuditLogResult, AuditEvent } from './hooks';

// Pages
export { WorkspaceListPage, WorkspaceDetailPage, AcceptInvitationPage } from './pages';
