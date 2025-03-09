// src/server/validators/auth.validator.ts
import { z } from 'zod';

// Register validation schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters'),
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(1, 'Password is required'),
});

// Refresh token validation schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required'),
});

// Update profile validation schema
export const updateProfileSchema = z.object({
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .optional(),
  bio: z.string()
    .max(500, 'Bio cannot exceed 500 characters')
    .optional(),
  avatar: z.string()
    .url('Invalid avatar URL')
    .optional(),
});

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Two-factor authentication verification schema
export const twoFactorVerifySchema = z.object({
  userId: z.string()
    .uuid('Invalid user ID'),
  token: z.string()
    .min(6, 'Token must be at least 6 characters')
    .max(10, 'Token cannot exceed 10 characters'),
});

// Two-factor authentication enable schema
export const twoFactorEnableSchema = z.object({
  token: z.string()
    .min(6, 'Token must be at least 6 characters')
    .max(10, 'Token cannot exceed 10 characters'),
});