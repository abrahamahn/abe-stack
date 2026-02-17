// main/shared/src/core/users/index.ts

/**
 * @file Users Barrel
 * @description Public API for user-related schemas, types, roles, permissions, and lifecycle logic.
 * @module Core/Users
 */

// --- lifecycle.logic ---
export {
  calculateDeletionGracePeriodEnd,
  canDeactivate,
  canReactivate,
  canRequestDeletion,
  getAccountStatus,
  isAccountActive,
  isAccountDeactivated,
  isAccountPendingDeletion,
  isWithinDeletionGracePeriod,
} from './lifecycle.logic';

// --- lifecycle.schemas ---
export {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  accountLifecycleResponseSchema,
  deactivateAccountRequestSchema,
  deleteAccountRequestSchema,
} from './lifecycle.schemas';
export type {
  AccountLifecycleFields,
  AccountLifecycleResponse,
  AccountStatus,
  DeactivateAccountRequest,
  DeleteAccountRequest,
} from './lifecycle.schemas';

// --- username.schemas ---
export {
  getNextUsernameChangeDate,
  isUsernameChangeCooldownActive,
  RESERVED_USERNAMES,
  updateUsernameRequestSchema,
  updateUsernameResponseSchema,
  USERNAME_CHANGE_COOLDOWN_DAYS,
} from './username.schemas';
export type {
  UpdateUsernameRequest,
  UpdateUsernameResponse,
} from './username.schemas';

// --- users.permissions ---
export {
  canUser,
  hasRole,
  isOwner,
  isRegularUser,
} from './users.permissions';

// --- users.roles ---
export {
  getAllRoles,
  getRoleDisplayName,
  isAdmin,
  isModerator,
  isUser,
} from './users.roles';

// --- users.schemas ---
export {
  APP_ROLES,
  appRoleSchema,
  avatarDeleteResponseSchema,
  avatarUploadRequestSchema,
  avatarUploadResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  profileCompletenessResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionCountResponseSchema,
  sessionSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  USER_ROLES,
  userIdSchema,
  userRoleSchema,
  userSchema,
  usersListResponseSchema,
} from './users.schemas';
export type {
  AppRole,
  AvatarDeleteResponse,
  AvatarUploadRequest,
  AvatarUploadResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ProfileCompletenessResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  Session,
  SessionCountResponse,
  SessionsListResponse,
  UpdateProfileRequest,
  User,
  UserId,
  UserRole,
  UsersListResponse,
} from './users.schemas';
