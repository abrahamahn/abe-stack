// main/shared/src/core/auth/auth-email.schemas.ts
/**
 * @file Auth Email Schemas
 * @description Schemas for email verification, change, and revert flows.
 * @module Core/Auth
 */

import { createSchema, parseBoolean, parseString } from '../../primitives/schema';
import { userSchema } from '../users/users.schemas';

import { emailSchema, passwordSchema } from './auth.scalars.schemas';

import type { Schema } from '../../primitives/schema';
import type { User } from '../users/users.schemas';

// ============================================================================
// Types
// ============================================================================

export interface ResendVerificationRequest {
  email: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

export interface ConfirmEmailChangeRequest {
  token: string;
}

export interface RevertEmailChangeRequest {
  token: string;
}

export interface ChangeEmailResponse {
  message: string;
}

export interface ConfirmEmailChangeResponse {
  message: string;
  email: string;
}

export interface RevertEmailChangeResponse {
  message: string;
  email: string;
}

export interface EmailVerificationResponse {
  verified: boolean;
  token: string;
  user: User;
}

export interface ResendVerificationResponse {
  message: string;
}

// ============================================================================
// Request Schemas
// ============================================================================

export const changeEmailRequestSchema: Schema<ChangeEmailRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      newEmail: emailSchema.parse(obj['newEmail']),
      password: passwordSchema.parse(obj['password']),
    };
  },
);

export const confirmEmailChangeRequestSchema: Schema<ConfirmEmailChangeRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { token: parseString(obj['token'], 'token', { min: 1 }) };
  },
);

export const revertEmailChangeRequestSchema: Schema<RevertEmailChangeRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { token: parseString(obj['token'], 'token', { min: 1 }) };
  },
);

export const emailVerificationRequestSchema: Schema<EmailVerificationRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { token: parseString(obj['token'], 'token', { min: 1 }) };
  },
);

export const resendVerificationRequestSchema: Schema<ResendVerificationRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { email: emailSchema.parse(obj['email']) };
  },
);

// ============================================================================
// Response Schemas
// ============================================================================

export const changeEmailResponseSchema: Schema<ChangeEmailResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const confirmEmailChangeResponseSchema: Schema<ConfirmEmailChangeResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      email: emailSchema.parse(obj['email']),
    };
  },
);

export const revertEmailChangeResponseSchema: Schema<RevertEmailChangeResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      email: emailSchema.parse(obj['email']),
    };
  },
);

export const emailVerificationResponseSchema: Schema<EmailVerificationResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      verified: parseBoolean(obj['verified'], 'verified'),
      token: parseString(obj['token'], 'token'),
      user: userSchema.parse(obj['user']),
    };
  },
);

export const resendVerificationResponseSchema: Schema<ResendVerificationResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);
