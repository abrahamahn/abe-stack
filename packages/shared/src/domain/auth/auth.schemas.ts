// shared/src/domain/auth/auth.schemas.ts

/**
 * @file Auth Schemas
 * @description Zod schemas and inferred types for authentication requests, responses, and data models.
 * @module Domain/Auth
 */

import { z } from 'zod';

import { emailSchema, passwordSchema } from '../../core/schemas';
import { userSchema as domainUserSchema, type User as DomainUser } from '../users/users.schemas';

// ============================================================================
// Request Schemas
// ============================================================================

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').optional().nullable(),
  password: passwordSchema,
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const emailVerificationRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type EmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resendVerificationRequestSchema = z.object({
  email: emailSchema,
});
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const setPasswordRequestSchema = z.object({
  password: passwordSchema,
});
export type SetPasswordRequest = z.infer<typeof setPasswordRequestSchema>;

// Magic Link
export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

export const magicLinkVerifyRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type MagicLinkVerifyRequest = z.infer<typeof magicLinkVerifyRequestSchema>;

// Email Change
export const changeEmailRequestSchema = z.object({
  newEmail: emailSchema,
  password: passwordSchema,
});
export type ChangeEmailRequest = z.infer<typeof changeEmailRequestSchema>;

export const confirmEmailChangeRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type ConfirmEmailChangeRequest = z.infer<typeof confirmEmailChangeRequestSchema>;

// TOTP (2FA)
export const totpVerifyRequestSchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters'),
});
export type TotpVerifyRequest = z.infer<typeof totpVerifyRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

// Re-export User schema from Users domain to avoid duplication
export const userSchema = domainUserSchema;
export type User = DomainUser;

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const registerResponseSchema = z.object({
  status: z.literal('pending_verification'),
  message: z.string(),
  email: emailSchema,
});
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const refreshResponseSchema = z.object({
  token: z.string(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const logoutResponseSchema = z.object({
  message: z.string(),
});
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// Generic Success Messages
export const emailVerificationResponseSchema = z.object({ token: z.string(), user: userSchema });
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;

export const forgotPasswordResponseSchema = z.object({ message: z.string() });
export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponseSchema>;

export const resendVerificationResponseSchema = z.object({ message: z.string() });
export type ResendVerificationResponse = z.infer<typeof resendVerificationResponseSchema>;

export const resetPasswordResponseSchema = z.object({ message: z.string() });
export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>;

export const setPasswordResponseSchema = z.object({ message: z.string() });
export type SetPasswordResponse = z.infer<typeof setPasswordResponseSchema>;

export const magicLinkRequestResponseSchema = z.object({ message: z.string() });
export type MagicLinkRequestResponse = z.infer<typeof magicLinkRequestResponseSchema>;

export const magicLinkVerifyResponseSchema = z.object({ token: z.string(), user: userSchema });
export type MagicLinkVerifyResponse = z.infer<typeof magicLinkVerifyResponseSchema>;

export const changeEmailResponseSchema = z.object({ message: z.string() });
export type ChangeEmailResponse = z.infer<typeof changeEmailResponseSchema>;

export const confirmEmailChangeResponseSchema = z.object({
  message: z.string(),
  email: emailSchema,
});
export type ConfirmEmailChangeResponse = z.infer<typeof confirmEmailChangeResponseSchema>;

// TOTP Responses
export const totpSetupResponseSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
  backupCodes: z.array(z.string()),
});
export type TotpSetupResponse = z.infer<typeof totpSetupResponseSchema>;

export const totpVerifyResponseSchema = z.object({ message: z.string() });
export type TotpVerifyResponse = z.infer<typeof totpVerifyResponseSchema>;

export const totpStatusResponseSchema = z.object({ enabled: z.boolean() });
export type TotpStatusResponse = z.infer<typeof totpStatusResponseSchema>;

// ============================================================================
// Utility Types
// ============================================================================

// Re-export strict empty body schema from common
export { emptyBodySchema, type EmptyBody } from '../../core/schemas';

// Re-export common errors
export { errorResponseSchema, type ErrorResponse } from '../../core/schemas';
