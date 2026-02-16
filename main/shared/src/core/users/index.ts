// main/shared/src/domain/users/index.ts

export { getAllRoles, getRoleDisplayName, isAdmin, isModerator, isUser } from './users.roles';

export { canUser, hasRole, isOwner, isRegularUser } from './users.permissions';

export { usersContract } from '../../contracts';

export {
  getNextUsernameChangeDate,
  isUsernameChangeCooldownActive, RESERVED_USERNAMES, updateUsernameRequestSchema,
  updateUsernameResponseSchema, USERNAME_CHANGE_COOLDOWN_DAYS, type UpdateUsernameRequest,
  type UpdateUsernameResponse
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
  isWithinDeletionGracePeriod
} from './lifecycle.logic';

export {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  accountLifecycleResponseSchema,
  deactivateAccountRequestSchema,
  deleteAccountRequestSchema,
  type AccountLifecycleFields,
  type AccountLifecycleResponse,
  type AccountStatus,
  type DeactivateAccountRequest,
  type DeleteAccountRequest
} from './lifecycle.schemas';

export {
  APP_ROLES, appRoleSchema, avatarDeleteResponseSchema,
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
  updateProfileRequestSchema, USER_ROLES, userIdSchema, userRoleSchema, userSchema, usersListResponseSchema, type AppRole,
  type AvatarDeleteResponse,
  type AvatarUploadRequest,
  type AvatarUploadResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type ProfileCompletenessResponse,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse, type Session, type SessionCountResponse, type SessionsListResponse, type UpdateProfileRequest,
  type User,
  type UserId, type UserRole, type UsersListResponse
} from './users.schemas';

