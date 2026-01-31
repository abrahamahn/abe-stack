// infra/users/src/handlers/index.ts
/**
 * Users Handlers
 *
 * Re-exports all handler functions from the users module.
 *
 * @module handlers
 */

// Profile handlers
export { handleListUsers, handleMe } from './profile';

// Session management
export {
  getSessionCount,
  listUserSessions,
  revokeAllSessions,
  revokeSession,
  type UserSession,
} from './sessions';

// Avatar and profile service functions
export {
  changePassword,
  deleteAvatar,
  getAvatarUrl,
  updateProfile,
  uploadAvatar,
  type ProfileUser,
  type UpdateProfileData,
} from './avatar';
