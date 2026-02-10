// src/shared/src/domain/users/index.ts

export { getAllRoles, getRoleDisplayName, isAdmin, isModerator, isUser } from './users.roles';

export { canUser, hasRole, isOwner, isRegularUser } from './users.permissions';

export { usersContract } from './users.contracts';

export {
  getNextUsernameChangeDate,
  isUsernameChangeCooldownActive,
  RESERVED_USERNAMES,
  updateUsernameRequestSchema,
  USERNAME_CHANGE_COOLDOWN_DAYS,
  type UpdateUsernameRequest,
  type UpdateUsernameResponse,
} from './username.schemas';

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

export {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  deactivateAccountRequestSchema,
  deleteAccountRequestSchema,
  type AccountLifecycleFields,
  type AccountLifecycleResponse,
  type AccountStatus,
  type DeactivateAccountRequest,
  type DeleteAccountRequest,
} from './lifecycle.schemas';

export {
  APP_ROLES,
  appRoleSchema,
  USER_ROLES,
  userRoleSchema,
  type UserRole,
  avatarDeleteResponseSchema,
  avatarUploadResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  profileCompletenessResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  userIdSchema,
  userSchema,
  type AppRole,
  type AvatarDeleteResponse,
  type AvatarUploadResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type ProfileCompletenessResponse,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
  type Session,
  type SessionsListResponse,
  type UpdateProfileRequest,
  type User,
  type UserId,
} from './users.schemas';
