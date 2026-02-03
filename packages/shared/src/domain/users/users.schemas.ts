// shared/src/domain/users/users.schemas.ts

/**
 * @file User Schemas
 * @description Zod schemas and types for user profiles, sessions, and settings.
 * @module Domain/Users
 */

import { z } from 'zod';

import { emailSchema, isoDateTimeSchema, passwordSchema } from '../../core/schemas';
import { userIdSchema } from '../../types/ids';
import { appRoleSchema } from '../../types/roles';

// ============================================================================
// Shared Types & Re-exports
// ============================================================================

const uuidSchema = z.string().uuid('Invalid UUID format');

export { userIdSchema };
export type UserId = z.infer<typeof userIdSchema>;

// Re-export AppRole from core types
export { APP_ROLES, appRoleSchema, type AppRole } from '../../types/roles';

// ============================================================================
// User & Profile Schemas
// ============================================================================

export const userSchema = z.object({
  id: userIdSchema,
  email: emailSchema,
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: appRoleSchema.describe('System-wide role (e.g. Platform Admin vs Standard User)'),
  isVerified: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

export const updateProfileRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).nullable().optional(),
  email: emailSchema.optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

// ============================================================================
// Security & Password Schemas
// ============================================================================

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const changePasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>;

// ============================================================================
// Avatar Schemas
// ============================================================================

export const avatarUploadResponseSchema = z.object({
  avatarUrl: z.string(),
});
export type AvatarUploadResponse = z.infer<typeof avatarUploadResponseSchema>;

export const avatarDeleteResponseSchema = z.object({
  success: z.boolean(),
});
export type AvatarDeleteResponse = z.infer<typeof avatarDeleteResponseSchema>;

// ============================================================================
// Session Schemas
// ============================================================================

export const sessionSchema = z.object({
  id: uuidSchema,
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  lastUsedAt: isoDateTimeSchema,
  device: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  isCurrent: z.boolean(),
});
export type Session = z.infer<typeof sessionSchema>;

export const sessionsListResponseSchema = z.object({
  sessions: z.array(sessionSchema),
});
export type SessionsListResponse = z.infer<typeof sessionsListResponseSchema>;

export const revokeSessionResponseSchema = z.object({
  success: z.boolean(),
});
export type RevokeSessionResponse = z.infer<typeof revokeSessionResponseSchema>;

export const revokeAllSessionsResponseSchema = z.object({
  success: z.boolean(),
  revokedCount: z.number(),
});
export type RevokeAllSessionsResponse = z.infer<typeof revokeAllSessionsResponseSchema>;

// ============================================================================
// Re-exports
// ============================================================================

export { errorResponseSchema, type ErrorResponse } from '../../core/schemas';
