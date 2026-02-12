// src/apps/web/src/features/settings/index.ts
/**
 * Settings Feature
 *
 * User profile and settings management.
 */

// Pages
export { SettingsPage } from './pages/SettingsPage';

// Components
export {
  ApiKeyScopeSelector,
  type ApiKeyScopeSelectorProps,
} from './components/ApiKeyScopeSelector';
export { ApiKeysManagement, type ApiKeysManagementProps } from './components/ApiKeysManagement';
export { AvatarUpload, type AvatarUploadProps } from './components/AvatarUpload';
export { ConsentPreferences } from './components/ConsentPreferences';
export {
  CookieConsentBanner,
  type CookieConsentBannerProps,
} from './components/CookieConsentBanner';
export { DangerZone, type DangerZoneProps } from './components/DangerZone';
export {
  DataControlsSection,
  type DataControlsSectionProps,
} from './components/DataControlsSection';
export { DataExportSection, type DataExportSectionProps } from './components/DataExportSection';
export { DevicesList } from './components/DevicesList';
export { EmailChangeForm, type EmailChangeFormProps } from './components/EmailChangeForm';
export {
  ForgotPasswordShortcut,
  type ForgotPasswordShortcutProps,
} from './components/ForgotPasswordShortcut';
export {
  NotificationPreferencesForm,
  type NotificationPreferencesFormProps,
} from './components/NotificationPreferencesForm';
export {
  OAuthConnectionsList,
  type OAuthConnectionsListProps,
} from './components/OAuthConnectionsList';
export { PasskeyManagement, type PasskeyManagementProps } from './components/PasskeyManagement';
export { PasswordChangeForm, type PasswordChangeFormProps } from './components/PasswordChangeForm';
export { PhoneManagement } from './components/PhoneManagement';
export { PreferencesSection, type PreferencesSectionProps } from './components/PreferencesSection';
export {
  ProfileCompleteness,
  type ProfileCompletenessProps,
} from './components/ProfileCompleteness';
export { ProfileForm, type ProfileFormProps } from './components/ProfileForm';
export { SessionCard, type SessionCardProps } from './components/SessionCard';
export { SessionsList, type SessionsListProps } from './components/SessionsList';
export { SudoModal, type SudoModalProps } from './components/SudoModal';
export { TotpManagement, type TotpManagementProps } from './components/TotpManagement';
export { TotpQrCode } from './components/TotpQrCode';
export { UsernameForm, type UsernameFormProps } from './components/UsernameForm';

// Hooks
export {
  useDeactivateAccount,
  useDeleteAccount,
  useReactivateAccount,
  type UseDeactivateAccountOptions,
  type UseDeactivateAccountResult,
  type UseDeleteAccountOptions,
  type UseDeleteAccountResult,
  type UseReactivateAccountOptions,
  type UseReactivateAccountResult,
} from './hooks/useAccountLifecycle';
export {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useRevokeApiKey,
  type UseApiKeysResult,
  type UseCreateApiKeyOptions,
  type UseCreateApiKeyResult,
  type UseDeleteApiKeyOptions,
  type UseDeleteApiKeyResult,
  type UseRevokeApiKeyOptions,
  type UseRevokeApiKeyResult,
} from './hooks/useApiKeys';
export {
  useAvatarDelete,
  useAvatarUpload,
  type UseAvatarDeleteOptions,
  type UseAvatarDeleteResult,
  type UseAvatarUploadOptions,
  type UseAvatarUploadResult,
} from './hooks/useAvatarUpload';
export {
  useConsent,
  useUpdateConsent,
  type UpdateConsentInput,
  type UpdateConsentResponse,
  type ConsentPreferences as UseConsentPreferences,
  type UseConsentResult,
  type UseUpdateConsentResult,
} from './hooks/useConsent';
export {
  useDataExport,
  type DataExportInfo,
  type ExportStatus,
  type UseDataExportResult,
} from './hooks/useDataExport';
export {
  usePasswordChange,
  type UsePasswordChangeOptions,
  type UsePasswordChangeResult,
} from './hooks/usePasswordChange';
export {
  useProfileUpdate,
  type UseProfileUpdateOptions,
  type UseProfileUpdateResult,
} from './hooks/useProfile';
export {
  useProfileCompleteness,
  type UseProfileCompletenessResult,
} from './hooks/useProfileCompleteness';
export {
  useRevokeAllSessions,
  useRevokeSession,
  useSessions,
  type UseRevokeAllSessionsOptions,
  type UseRevokeAllSessionsResult,
  type UseRevokeSessionOptions,
  type UseRevokeSessionResult,
  type UseSessionsResult,
} from './hooks/useSessions';
export { useSudo, type UseSudoOptions, type UseSudoResult } from './hooks/useSudo';
export {
  useTotpManagement,
  type TotpState,
  type UseTotpManagementResult,
} from './hooks/useTotpManagement';
export { useUndoHandler } from './hooks/useUndoHandler';
export {
  useUsernameUpdate,
  type UseUsernameUpdateOptions,
  type UseUsernameUpdateResult,
} from './hooks/useUsername';

// API
export {
  createSettingsApi,
  type ApiError,
  type AvatarDeleteResponse,
  type AvatarUploadResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
  type Session,
  type SessionsListResponse,
  type SettingsApi,
  type SettingsApiConfig,
  type UpdateProfileRequest,
  type User,
} from './api/settingsApi';
