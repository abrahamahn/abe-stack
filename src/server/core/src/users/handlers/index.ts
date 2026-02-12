// src/server/core/src/users/handlers/index.ts
/**
 * Users Handlers
 *
 * Re-exports all handler functions from the users module.
 *
 * @module handlers
 */

// Profile handlers
export { handleListUsers, handleMe } from './profile';

// Profile completeness
export { computeProfileCompleteness, handleGetProfileCompleteness } from './profile-completeness';

// Session management
export {
  getSessionCount,
  listUserSessions,
  revokeAllSessions,
  revokeSession,
  type UserSession,
} from './sessions';

// Username management
export { handleUpdateUsername } from './username';

// Account lifecycle
export {
  handleDeactivateAccount,
  handleReactivateAccount,
  handleRequestDeletion,
} from './lifecycle';

// Avatar, profile & password HTTP handlers
export {
  handleChangePassword,
  handleDeleteAvatar,
  handleUpdateProfile,
  handleUploadAvatar,
} from './avatar';

// Avatar and profile service functions
export {
  cacheBustAvatarUrl,
  changePassword,
  deleteAvatar,
  getAvatarFallbackUrl,
  getAvatarUrl,
  getGravatarUrl,
  getInitialsAvatarUrl,
  updateProfile,
  uploadAvatar,
  type ProfileUser,
  type UpdateProfileData,
} from './avatar';
