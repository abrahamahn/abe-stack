// main/server/core/src/users/index.ts
/**
 * Users Package
 *
 * Provides user profile, session management, and avatar functionality.
 * Extracted from apps/server for reuse across applications. Lives in packages/core/src/users/.
 *
 * @module @bslt/users
 */

// Routes (for auto-registration)
export { userRoutes } from './routes';

// Handlers
export { handleListUsers, handleMe } from './handlers';

// Session management
export {
  getSessionCount,
  listUserSessions,
  revokeAllSessions,
  revokeSession,
  type UserSession
} from './handlers';

// Profile & avatar service functions
export {
  changePassword,
  deleteAvatar,
  getAvatarUrl,
  updateProfile,
  uploadAvatar,
  type ProfileUser,
  type UpdateProfileData
} from './handlers';

// Service (business logic)
export { getUserById, listUsers, type ListUsersResult, type User } from './service';

// Types (module dependency types)
export type {
  UsersArgon2Config,
  UsersAuthConfig,
  UsersModuleDeps,
  UsersRequest,
  UsersRequestInfo
} from './types';

export { ERROR_MESSAGES } from './types';

// Data hygiene (soft-delete enforcement + hard-delete)
export {
  ANONYMIZED_EMAIL_PATTERN,
  filterDeletedUsers,
  hardDeleteAnonymizedUsers,
  isUserDeleted,
  type HardDeleteResult
} from './data-hygiene';

// Background crons
export { anonymizeExpiredUsers, type AnonymizeResult } from './pii-anonymization';
export { cleanupUnverifiedUsers, type CleanupResult } from './unverified-cleanup';

