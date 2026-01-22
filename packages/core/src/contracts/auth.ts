// packages/core/src/contracts/auth.ts
/**
 * Auth Contract
 *
 * Authentication-related schemas and API contract definitions.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { emailSchema, errorResponseSchema, nameSchema, passwordSchema } from './common';
import { userSchema } from './users';

// ============================================================================
// Request Schemas
// ============================================================================

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerRequestSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
});

export const emailVerificationRequestSchema = z.object({
  token: z.string(),
});

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resendVerificationRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordRequestSchema = z.object({
  token: z.string(),
  password: passwordSchema,
});

export const setPasswordRequestSchema = z.object({
  password: passwordSchema,
});

// ============================================================================
// Magic Link Schemas
// ============================================================================

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export const registerResponseSchema = z.object({
  status: z.literal('pending_verification'),
  message: z.string(),
  email: emailSchema,
});

export const refreshResponseSchema = z.object({
  token: z.string(),
});

export const logoutResponseSchema = z.object({
  message: z.string(),
});

export const emailVerificationResponseSchema = z.object({
  verified: z.boolean(),
  token: z.string(),
  user: userSchema,
});

export const forgotPasswordResponseSchema = z.object({
  message: z.string(),
});

export const resendVerificationResponseSchema = z.object({
  message: z.string(),
});

export const resetPasswordResponseSchema = z.object({
  message: z.string(),
});

export const setPasswordResponseSchema = z.object({
  message: z.string(),
});

export const magicLinkRequestResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const magicLinkVerifyResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

// ============================================================================
// Types
// ============================================================================

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type EmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponseSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
export type ResendVerificationResponse = z.infer<typeof resendVerificationResponseSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>;
export type SetPasswordRequest = z.infer<typeof setPasswordRequestSchema>;
export type SetPasswordResponse = z.infer<typeof setPasswordResponseSchema>;
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerifyRequest = z.infer<typeof magicLinkVerifySchema>;
export type MagicLinkRequestResponse = z.infer<typeof magicLinkRequestResponseSchema>;
export type MagicLinkVerifyResponse = z.infer<typeof magicLinkVerifyResponseSchema>;

// ============================================================================
// Auth Contract
// ============================================================================

const c = initContract();

export const authContract = c.router({
  register: {
    method: 'POST',
    path: '/api/auth/register',
    body: registerRequestSchema,
    responses: {
      201: registerResponseSchema,
      400: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Register a new user - sends verification email',
  },
  login: {
    method: 'POST',
    path: '/api/auth/login',
    body: loginRequestSchema,
    responses: {
      200: authResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Login an existing user',
  },
  refresh: {
    method: 'POST',
    path: '/api/auth/refresh',
    body: z.object({}),
    responses: {
      200: refreshResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Refresh access token using refresh token cookie',
  },
  logout: {
    method: 'POST',
    path: '/api/auth/logout',
    body: z.object({}),
    responses: {
      200: logoutResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Logout and invalidate refresh token',
  },
  verifyEmail: {
    method: 'POST',
    path: '/api/auth/verify-email',
    body: emailVerificationRequestSchema,
    responses: {
      200: emailVerificationResponseSchema,
      400: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Verify email with a token - auto-logs in user',
  },
  resendVerification: {
    method: 'POST',
    path: '/api/auth/resend-verification',
    body: resendVerificationRequestSchema,
    responses: {
      200: resendVerificationResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Resend verification email to unverified user',
  },
  forgotPassword: {
    method: 'POST',
    path: '/api/auth/forgot-password',
    body: forgotPasswordRequestSchema,
    responses: {
      200: forgotPasswordResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Request password reset',
  },
  resetPassword: {
    method: 'POST',
    path: '/api/auth/reset-password',
    body: resetPasswordRequestSchema,
    responses: {
      200: resetPasswordResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Reset password with token',
  },
  setPassword: {
    method: 'POST',
    path: '/api/auth/set-password',
    body: setPasswordRequestSchema,
    responses: {
      200: setPasswordResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema, // User already has a password
    },
    summary: 'Set password for first time (magic-link only users)',
  },
  magicLinkRequest: {
    method: 'POST',
    path: '/api/auth/magic-link/request',
    body: magicLinkRequestSchema,
    responses: {
      200: magicLinkRequestResponseSchema,
      400: errorResponseSchema,
      429: errorResponseSchema,
    },
    summary: 'Request a magic link for passwordless login',
  },
  magicLinkVerify: {
    method: 'POST',
    path: '/api/auth/magic-link/verify',
    body: magicLinkVerifySchema,
    responses: {
      200: magicLinkVerifyResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify magic link token and login',
  },
});
