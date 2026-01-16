// packages/core/src/contracts/index.ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

export * from './native';

// User roles - kept in sync with apps/server/src/infra/database/schema/users.ts
export const USER_ROLES = ['user', 'admin', 'moderator'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

// Shared schemas
export const errorResponseSchema = z.object({
  message: z.string(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
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

export const userResponseSchema = userSchema.extend({
  createdAt: z.string().datetime(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type EmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;

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
});

export const usersContract = c.router({
  me: {
    method: 'GET',
    path: '/api/users/me',
    responses: {
      200: userResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },
});

// Admin unlock request/response schemas
export const unlockAccountRequestSchema = z.object({
  email: z.string().email(),
});

export const unlockAccountResponseSchema = z.object({
  message: z.string(),
  email: z.string().email(),
});

export type UnlockAccountRequest = z.infer<typeof unlockAccountRequestSchema>;
export type UnlockAccountResponse = z.infer<typeof unlockAccountResponseSchema>;

export const adminContract = c.router({
  unlockAccount: {
    method: 'POST',
    path: '/api/admin/auth/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      200: unlockAccountResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unlock a locked user account (admin only)',
  },
});

export const apiContract = c.router({
  auth: authContract,
  users: usersContract,
  admin: adminContract,
});

export type ApiContract = typeof apiContract;
