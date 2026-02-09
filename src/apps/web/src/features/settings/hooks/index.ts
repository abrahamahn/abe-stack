// src/apps/web/src/features/settings/hooks/index.ts
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
