// src/server/validators/auth.validator.ts
import { z } from 'zod';

// Register validation schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name cannot exceed 100 characters'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name cannot exceed 100 characters'),
  displayName: z.string()
    .optional()
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
});

// Refresh token validation schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required'),
});

// Email validation schema for resend confirmation
export const emailSchema = z.object({
  email: z.string()
    .email('Invalid email format')
});

// Update profile validation schema
export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  bio: z.string()
    .max(500, 'Bio must not exceed 500 characters')
    .optional(),
  avatar: z.string()
    .url('Avatar must be a valid URL')
    .optional(),
});

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters'),
});

// Two-factor authentication verification schema
export const twoFactorVerifySchema = z.object({
  code: z.string()
    .length(6, 'Code must be exactly 6 characters'),
});

// Two-factor authentication enable schema
export const twoFactorEnableSchema = z.object({
  secret: z.string()
    .min(1, 'Secret is required'),
  code: z.string()
    .length(6, 'Code must be exactly 6 characters'),
});