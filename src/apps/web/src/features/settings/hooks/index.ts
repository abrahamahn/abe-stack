// src/apps/web/src/features/settings/hooks/index.ts
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
} from './useApiKeys';

export {
  useAvatarDelete,
  useAvatarUpload,
  type UseAvatarDeleteOptions,
  type UseAvatarDeleteResult,
  type UseAvatarUploadOptions,
  type UseAvatarUploadResult,
} from './useAvatarUpload';

export {
  usePasswordChange,
  type UsePasswordChangeOptions,
  type UsePasswordChangeResult,
} from './usePasswordChange';

export {
  useProfileUpdate,
  type UseProfileUpdateOptions,
  type UseProfileUpdateResult,
} from './useProfile';

export {
  useRevokeAllSessions,
  useRevokeSession,
  useSessions,
  type UseRevokeAllSessionsOptions,
  type UseRevokeAllSessionsResult,
  type UseRevokeSessionOptions,
  type UseRevokeSessionResult,
  type UseSessionsResult,
} from './useSessions';

export {
  useTotpManagement,
  type TotpState,
  type UseTotpManagementResult,
} from './useTotpManagement';

export { useSudo, type UseSudoOptions, type UseSudoResult } from './useSudo';

export {
  useUsernameUpdate,
  type UseUsernameUpdateOptions,
  type UseUsernameUpdateResult,
} from './useUsername';

export {
  useProfileCompleteness,
  type UseProfileCompletenessResult,
} from './useProfileCompleteness';

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
} from './useAccountLifecycle';

export {
  useConsent,
  useUpdateConsent,
  type ConsentPreferences,
  type UpdateConsentInput,
  type UpdateConsentResponse,
  type UseConsentResult,
  type UseUpdateConsentResult,
} from './useConsent';

export {
  useDataExport,
  type DataExportInfo,
  type ExportStatus,
  type UseDataExportResult,
} from './useDataExport';

export { useUndoHandler } from './useUndoHandler';
