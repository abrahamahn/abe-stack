// packages/core/src/contracts/auth.ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { errorResponseSchema, userSchema } from './common';

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

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordResponseSchema = z.object({
  message: z.string(),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const resetPasswordResponseSchema = z.object({
  message: z.string(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type EmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponseSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>;

const c = initContract();

export const authContract = c.router({
  register: {
    method: 'POST',
    path: '/api/auth/register',
    body: registerRequestSchema,
    responses: {
      201: authResponseSchema,
      400: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Register a new user',
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
    summary: 'Verify email with a token',
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
});
