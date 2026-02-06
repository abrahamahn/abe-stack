// packages/shared/src/domain/auth/auth.schemas.ts

/**
 * @file Auth Schemas
 * @description Schemas and inferred types for authentication requests, responses, and data models.
 * @module Domain/Auth
 */

import { emailSchema, passwordSchema } from '../../contracts/common';
import {
  createLiteralSchema,
  createSchema,
  parseBoolean,
  parseString,
} from '../../contracts/schema';
import { userSchema as domainUserSchema, type User as DomainUser } from '../users/users.schemas';

import type { Schema } from '../../contracts/types';

// Re-export utility schemas from contracts/common
export { emptyBodySchema, type EmptyBody } from '../../contracts/common';
export { errorResponseSchema, type ErrorResponse } from '../../contracts/common';

// ============================================================================
// Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name?: string | null | undefined;
  password: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface SetPasswordRequest {
  password: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

export interface ConfirmEmailChangeRequest {
  token: string;
}

export interface TotpVerifyRequest {
  code: string;
}

// Response types
export type User = DomainUser;

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  status: 'pending_verification';
  message: string;
  email: string;
}

export interface RefreshResponse {
  token: string;
}

export interface LogoutResponse {
  message: string;
}

export interface EmailVerificationResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface SetPasswordResponse {
  message: string;
}

export interface MagicLinkRequestResponse {
  message: string;
}

export interface MagicLinkVerifyResponse {
  token: string;
  user: User;
}

export interface ChangeEmailResponse {
  message: string;
}

export interface ConfirmEmailChangeResponse {
  message: string;
  email: string;
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

export interface TotpVerifyResponse {
  message: string;
}

export interface TotpStatusResponse {
  enabled: boolean;
}

// ============================================================================
// Request Schemas
// ============================================================================

export const loginRequestSchema: Schema<LoginRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    email: emailSchema.parse(obj['email']),
    password: passwordSchema.parse(obj['password']),
  };
});

export const registerRequestSchema: Schema<RegisterRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    email: emailSchema.parse(obj['email']),
    name:
      obj['name'] === undefined
        ? undefined
        : obj['name'] === null
          ? null
          : parseString(obj['name'], 'name', { min: 2 }),
    password: passwordSchema.parse(obj['password']),
  };
});

export const emailVerificationRequestSchema: Schema<EmailVerificationRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { token: parseString(obj['token'], 'token', { min: 1 }) };
  },
);

export const forgotPasswordRequestSchema: Schema<ForgotPasswordRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { email: emailSchema.parse(obj['email']) };
  },
);

export const resendVerificationRequestSchema: Schema<ResendVerificationRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { email: emailSchema.parse(obj['email']) };
  },
);

export const resetPasswordRequestSchema: Schema<ResetPasswordRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      token: parseString(obj['token'], 'token', { min: 1 }),
      password: passwordSchema.parse(obj['password']),
    };
  },
);

export const setPasswordRequestSchema: Schema<SetPasswordRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { password: passwordSchema.parse(obj['password']) };
  },
);

// Magic Link
export const magicLinkRequestSchema: Schema<MagicLinkRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { email: emailSchema.parse(obj['email']) };
});

export const magicLinkVerifyRequestSchema: Schema<MagicLinkVerifyRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { token: parseString(obj['token'], 'token', { min: 1 }) };
  },
);

// Email Change
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

// TOTP (2FA)
export const totpVerifyRequestSchema: Schema<TotpVerifyRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { code: parseString(obj['code'], 'code', { min: 6 }) };
});

// ============================================================================
// Response Schemas
// ============================================================================

// Re-export User schema from Users domain to avoid duplication
export const userSchema = domainUserSchema;

export const authResponseSchema: Schema<AuthResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    token: parseString(obj['token'], 'token'),
    user: userSchema.parse(obj['user']),
  };
});

const pendingVerificationLiteral = createLiteralSchema('pending_verification' as const);

export const registerResponseSchema: Schema<RegisterResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    status: pendingVerificationLiteral.parse(obj['status']),
    message: parseString(obj['message'], 'message'),
    email: emailSchema.parse(obj['email']),
  };
});

export const refreshResponseSchema: Schema<RefreshResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { token: parseString(obj['token'], 'token') };
});

export const logoutResponseSchema: Schema<LogoutResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { message: parseString(obj['message'], 'message') };
});

export const emailVerificationResponseSchema: Schema<EmailVerificationResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      token: parseString(obj['token'], 'token'),
      user: userSchema.parse(obj['user']),
    };
  },
);

export const forgotPasswordResponseSchema: Schema<ForgotPasswordResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const resendVerificationResponseSchema: Schema<ResendVerificationResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const resetPasswordResponseSchema: Schema<ResetPasswordResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const setPasswordResponseSchema: Schema<SetPasswordResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const magicLinkRequestResponseSchema: Schema<MagicLinkRequestResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const magicLinkVerifyResponseSchema: Schema<MagicLinkVerifyResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      token: parseString(obj['token'], 'token'),
      user: userSchema.parse(obj['user']),
    };
  },
);

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

// TOTP Responses
export const totpSetupResponseSchema: Schema<TotpSetupResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (!Array.isArray(obj['backupCodes'])) {
    throw new Error('backupCodes must be an array');
  }
  return {
    secret: parseString(obj['secret'], 'secret'),
    otpauthUrl: parseString(obj['otpauthUrl'], 'otpauthUrl'),
    backupCodes: obj['backupCodes'].map((item: unknown, i: number) =>
      parseString(item, `backupCodes[${String(i)}]`),
    ),
  };
});

export const totpVerifyResponseSchema: Schema<TotpVerifyResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const totpStatusResponseSchema: Schema<TotpStatusResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { enabled: parseBoolean(obj['enabled'], 'enabled') };
  },
);
