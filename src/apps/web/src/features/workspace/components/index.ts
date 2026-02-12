// src/apps/web/src/features/workspace/components/index.ts

export { Can } from './Can';
export type { CanProps } from './Can';

export { meetsRoleRequirement, RequireWorkspaceRole } from './RequireWorkspaceRole';
export type { RequireWorkspaceRoleProps } from './RequireWorkspaceRole';

export { WorkspaceList, type WorkspaceListProps } from './WorkspaceList';
export { CreateWorkspaceDialog, type CreateWorkspaceDialogProps } from './CreateWorkspaceDialog';
export { WorkspaceSettingsForm, type WorkspaceSettingsFormProps } from './WorkspaceSettingsForm';
export { DomainAllowlistEditor, type DomainAllowlistEditorProps } from './DomainAllowlistEditor';
export { MembersList, type MembersListProps } from './MembersList';
export { InviteMemberDialog, type InviteMemberDialogProps } from './InviteMemberDialog';
export { InvitationsList, type InvitationsListProps } from './InvitationsList';
export { TenantSwitcher, type TenantSwitcherProps } from './TenantSwitcher';
export {
  WorkspaceFeatureOverrides,
  type WorkspaceFeatureOverridesProps,
} from './WorkspaceFeatureOverrides';
export { WorkspaceBilling, type WorkspaceBillingProps } from './WorkspaceBilling';
export {
  MemberDetailPanel,
  type MemberDetailPanelProps,
  type MemberDetail,
} from './MemberDetailPanel';
export { WorkspaceAuditLog, type WorkspaceAuditLogProps } from './WorkspaceAuditLog';
export { AuditEventDetailModal, type AuditEventDetailModalProps } from './AuditEventDetailModal';
export { WorkspaceWelcomeBanner, type WorkspaceWelcomeBannerProps } from './WorkspaceWelcomeBanner';
export { WorkspaceLogoUpload, type WorkspaceLogoUploadProps } from './WorkspaceLogoUpload';
export { WorkspaceDangerZone, type WorkspaceDangerZoneProps } from './WorkspaceDangerZone';
export { WebhookManagement, type WebhookManagementProps } from './WebhookManagement';
export { WebhookDetailView, type WebhookDetailViewProps } from './WebhookDetailView';
