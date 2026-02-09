// src/apps/web/src/features/settings/index.ts
/**
 * Settings Feature
 *
 * User profile and settings management.
 */

// Pages
export { SettingsPage } from './pages';

// Components
export {
  AvatarUpload,
  OAuthConnectionsList,
  PasswordChangeForm,
  ProfileForm,
  SessionCard,
  SessionsList,
} from './components';

// Hooks
export {
  useAvatarDelete,
  useAvatarUpload,
  usePasswordChange,
  useProfileUpdate,
  useRevokeAllSessions,
  useRevokeSession,
  useSessions,
} from './hooks';

// API
export { createSettingsApi, type SettingsApi, type SettingsApiConfig } from './api';
