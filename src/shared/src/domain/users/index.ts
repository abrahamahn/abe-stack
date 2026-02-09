// src/shared/src/domain/users/index.ts

export { getAllRoles, getRoleDisplayName, isAdmin, isModerator, isUser } from './users.roles';

export { canUser, hasRole, isOwner, isRegularUser } from './users.permissions';

export { usersContract } from './users.contracts';

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
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
  type Session,
  type SessionsListResponse,
  type UpdateProfileRequest,
  type User,
  type UserId,
} from './users.schemas';
