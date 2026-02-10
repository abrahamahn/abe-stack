// src/shared/src/domain/auth/auth.schemas.ts

/**
 * @file Auth Schemas
 * @description Schemas and inferred types for authentication requests, responses, and data models.
 * @module Domain/Auth
 */

import {
  createLiteralSchema,
  createSchema,
  parseBoolean,
  parseNumber,
  parseString,
} from '../../core/schema.utils';
import { emailSchema, passwordSchema } from '../../core/schemas';
import { userSchema as domainUserSchema, type User as DomainUser } from '../users/users.schemas';

import type { Schema } from '../../core/api';

// Re-export utility schemas from contracts/common
export { emptyBodySchema, type EmptyBody } from '../../core/schemas';
export { errorResponseSchema } from '../../core/schemas';
export type { ErrorResponse } from '../../core/api';

// ============================================================================
// Types
// ============================================================================

export interface LoginRequest {
  identifier: string;
  password: string;
  captchaToken?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  captchaToken?: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
  captchaToken?: string;
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

export interface RevertEmailChangeRequest {
  token: string;
}

export interface AcceptTosRequest {
  documentId: string;
}

export interface AcceptTosResponse {
  agreedAt: string;
}

export interface TosStatusResponse {
  accepted: boolean;
  requiredVersion: number | null;
  documentId: string | null;
}

// Sudo Mode
export interface SudoRequest {
  password?: string;
  totpCode?: string;
}

export interface SudoResponse {
  sudoToken: string;
  expiresAt: string;
}

export interface TotpVerifyRequest {
  code: string;
}

export interface TotpLoginChallengeResponse {
  requiresTotp: true;
  challengeToken: string;
  message: string;
}

export interface TotpLoginVerifyRequest {
  challengeToken: string;
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
  verified: boolean;
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

export interface RevertEmailChangeResponse {
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
    identifier: parseString(obj['identifier'], 'identifier', { min: 1, trim: true }),
    password: passwordSchema.parse(obj['password']),
    ...(typeof obj['captchaToken'] === 'string' ? { captchaToken: obj['captchaToken'] } : {}),
  };
});

export const registerRequestSchema: Schema<RegisterRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    email: emailSchema.parse(obj['email']),
    username: parseString(obj['username'], 'username', { min: 2, trim: true }),
    firstName: parseString(obj['firstName'], 'first name', { min: 1, trim: true }),
    lastName: parseString(obj['lastName'], 'last name', { min: 1, trim: true }),
    password: passwordSchema.parse(obj['password']),
    ...(typeof obj['captchaToken'] === 'string' ? { captchaToken: obj['captchaToken'] } : {}),
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
    return {
      email: emailSchema.parse(obj['email']),
      ...(typeof obj['captchaToken'] === 'string' ? { captchaToken: obj['captchaToken'] } : {}),
    };
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

export const revertEmailChangeRequestSchema: Schema<RevertEmailChangeRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { token: parseString(obj['token'], 'token', { min: 1 }) };
  },
);

// ToS (Terms of Service)
export const acceptTosRequestSchema: Schema<AcceptTosRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { documentId: parseString(obj['documentId'], 'documentId', { min: 1 }) };
});

// Sudo Mode
export const sudoRequestSchema: Schema<SudoRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const password = typeof obj['password'] === 'string' ? obj['password'] : undefined;
  const totpCode = typeof obj['totpCode'] === 'string' ? obj['totpCode'] : undefined;
  if (password === undefined && totpCode === undefined) {
    throw new Error('Either password or totpCode is required');
  }
  return {
    ...(password !== undefined ? { password } : {}),
    ...(totpCode !== undefined ? { totpCode } : {}),
  };
});

export const sudoResponseSchema: Schema<SudoResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    sudoToken: parseString(obj['sudoToken'], 'sudoToken'),
    expiresAt: parseString(obj['expiresAt'], 'expiresAt'),
  };
});

// TOTP (2FA)
export const totpVerifyRequestSchema: Schema<TotpVerifyRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { code: parseString(obj['code'], 'code', { min: 6 }) };
});

export const totpLoginVerifyRequestSchema: Schema<TotpLoginVerifyRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      challengeToken: parseString(obj['challengeToken'], 'challengeToken', { min: 1 }),
      code: parseString(obj['code'], 'code', { min: 6 }),
    };
  },
);

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
      verified: parseBoolean(obj['verified'], 'verified'),
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

export const revertEmailChangeResponseSchema: Schema<RevertEmailChangeResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      email: emailSchema.parse(obj['email']),
    };
  },
);

// ToS Responses
export const acceptTosResponseSchema: Schema<AcceptTosResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { agreedAt: parseString(obj['agreedAt'], 'agreedAt') };
});

export const tosStatusResponseSchema: Schema<TosStatusResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    accepted: parseBoolean(obj['accepted'], 'accepted'),
    requiredVersion:
      obj['requiredVersion'] === null
        ? null
        : parseNumber(obj['requiredVersion'], 'requiredVersion'),
    documentId: obj['documentId'] === null ? null : parseString(obj['documentId'], 'documentId'),
  };
});

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

const requiresTotpLiteral = createLiteralSchema(true as const);

export const totpLoginChallengeResponseSchema: Schema<TotpLoginChallengeResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      requiresTotp: requiresTotpLiteral.parse(obj['requiresTotp']),
      challengeToken: parseString(obj['challengeToken'], 'challengeToken'),
      message: parseString(obj['message'], 'message'),
    };
  },
);
