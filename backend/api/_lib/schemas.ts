/**
 * All API schemas in one place
 * Single source of truth for validation + types
 */
import { z } from 'zod';

// ============================================
// User & Auth Schemas
// ============================================

export const USER_ROLES = ['user', 'admin', 'moderator'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
});

export const userResponseSchema = userSchema.extend({
  createdAt: z.string().datetime(),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).optional(),
  password: z.string().min(8),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export const refreshResponseSchema = z.object({
  token: z.string(),
});

export const logoutResponseSchema = z.object({
  message: z.string(),
});

export const emailVerificationRequestSchema = z.object({
  token: z.string(),
});

export const emailVerificationResponseSchema = z.object({
  verified: z.boolean(),
  userId: z.string().uuid(),
});

// ============================================
// Common Schemas
// ============================================

export const errorResponseSchema = z.object({
  message: z.string(),
});

// ============================================
// Inferred Types (auto-exported)
// ============================================

export type User = z.infer<typeof userSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type EmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
