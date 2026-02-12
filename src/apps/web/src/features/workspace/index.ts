// src/apps/web/src/features/workspace/index.ts

// Components
export {
  AuditEventDetailModal,
  type AuditEventDetailModalProps,
} from './components/AuditEventDetailModal';
export { Can, type CanProps } from './components/Can';
export {
  CreateWorkspaceDialog,
  type CreateWorkspaceDialogProps,
} from './components/CreateWorkspaceDialog';
export {
  DomainAllowlistEditor,
  type DomainAllowlistEditorProps,
} from './components/DomainAllowlistEditor';
export { InvitationsList, type InvitationsListProps } from './components/InvitationsList';
export { InviteMemberDialog, type InviteMemberDialogProps } from './components/InviteMemberDialog';
export {
  MemberDetailPanel,
  type MemberDetail,
  type MemberDetailPanelProps,
} from './components/MemberDetailPanel';
export { MembersList, type MembersListProps } from './components/MembersList';
export {
  RequireWorkspaceRole,
  meetsRoleRequirement,
  type RequireWorkspaceRoleProps,
} from './components/RequireWorkspaceRole';
export { TenantSwitcher, type TenantSwitcherProps } from './components/TenantSwitcher';
export { WebhookDetailView, type WebhookDetailViewProps } from './components/WebhookDetailView';
export { WebhookManagement, type WebhookManagementProps } from './components/WebhookManagement';
export { WorkspaceAuditLog, type WorkspaceAuditLogProps } from './components/WorkspaceAuditLog';
export { WorkspaceBilling, type WorkspaceBillingProps } from './components/WorkspaceBilling';
export {
  WorkspaceDangerZone,
  type WorkspaceDangerZoneProps,
} from './components/WorkspaceDangerZone';
export {
  WorkspaceFeatureOverrides,
  type WorkspaceFeatureOverridesProps,
} from './components/WorkspaceFeatureOverrides';
export { WorkspaceList, type WorkspaceListProps } from './components/WorkspaceList';
export {
  WorkspaceLogoUpload,
  type WorkspaceLogoUploadProps,
} from './components/WorkspaceLogoUpload';
export {
  WorkspaceSettingsForm,
  type WorkspaceSettingsFormProps,
} from './components/WorkspaceSettingsForm';
export {
  WorkspaceWelcomeBanner,
  type WorkspaceWelcomeBannerProps,
} from './components/WorkspaceWelcomeBanner';

// Hooks
export {
  useAuditLog,
  type AuditEvent,
  type AuditEventsResponse,
  type UseAuditLogResult,
} from './hooks/useAuditLog';
export {
  useAcceptInvitation,
  useCreateInvitation,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
  type UseAcceptInvitationResult,
  type UseCreateInvitationResult,
  type UseInvitationsResult,
  type UseResendInvitationResult,
  type UseRevokeInvitationResult,
} from './hooks/useInvitations';
export {
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
  type UseMembersResult,
  type UseRemoveMemberResult,
  type UseUpdateMemberRoleResult,
} from './hooks/useMembers';
export {
  usePermissions,
  type PermissionsResult,
  type UsePermissionsOptions,
} from './hooks/usePermissions';
export { useWorkspace, type UseWorkspaceResult } from './hooks/useWorkspace';
export {
  useWorkspaceBilling,
  type Plan,
  type Subscription,
  type SubscriptionResponse,
  type UseWorkspaceBillingOptions,
  type UseWorkspaceBillingResult,
} from './hooks/useWorkspaceBilling';
export { useWorkspaceContext, type UseWorkspaceContextResult } from './hooks/useWorkspaceContext';
export {
  useSetFeatureOverride,
  useWorkspaceFeatureOverrides,
  type FlagWithOverride,
  type SetOverrideRequest,
  type TenantOverride,
  type TenantOverridesResponse,
  type UseSetFeatureOverrideOptions,
  type UseSetFeatureOverrideResult,
  type UseWorkspaceFeatureOverridesOptions,
  type UseWorkspaceFeatureOverridesResult,
} from './hooks/useWorkspaceFeatureOverrides';
export {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
  type UseCreateWorkspaceOptions,
  type UseCreateWorkspaceResult,
  type UseDeleteWorkspaceOptions,
  type UseDeleteWorkspaceResult,
  type UseUpdateWorkspaceOptions,
  type UseUpdateWorkspaceResult,
} from './hooks/useWorkspaceMutations';
export { useWorkspaces, type UseWorkspacesResult } from './hooks/useWorkspaces';

// Pages
export { AcceptInvitationPage } from './pages/AcceptInvitationPage';
export { WorkspaceDetailPage } from './pages/WorkspaceDetailPage';
export { WorkspaceListPage } from './pages/WorkspaceListPage';

// API
export { createWorkspaceApi } from './api/workspaceApi';
export type { WorkspaceApi, WorkspaceApiConfig } from './api/workspaceApi';
