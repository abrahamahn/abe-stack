import { initContract } from '@ts-rest/core';
import { z } from 'zod';

export * from './native';

// Shared schemas
export const errorResponseSchema = z.object({
  message: z.string(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
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
  refreshToken: z.string().optional(),
  user: userSchema,
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
export type EmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;

const c = initContract();

export const authContract = c.router({
  register: {
    method: 'POST',
    path: '/auth/register',
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
    path: '/auth/login',
    body: loginRequestSchema,
    responses: {
      200: authResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Login an existing user',
  },
  verifyEmail: {
    method: 'POST',
    path: '/auth/verify-email',
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
    path: '/users/me',
    responses: {
      200: userResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },
});

export const apiContract = c.router({
  auth: authContract,
  users: usersContract,
});

export type ApiContract = typeof apiContract;
