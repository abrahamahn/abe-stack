// main/shared/src/core/auth/auth.core.schemas.ts
/**
 * @file Auth Core Schemas
 * @description Core authentication request/response schemas for login, register,
 *   password reset, sudo mode, and related flows.
 * @module Core/Auth
 */

import { createLiteralSchema, createSchema, parseBoolean, parseString } from '../../primitives/schema';
import { emailSchema, passwordSchema } from '../schemas';
import { userSchema } from '../users/users.schemas';


import type { Schema } from '../../primitives/schema';
import type { User } from '../users/users.schemas';

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
  tosAccepted: boolean;
  captchaToken?: string;
}

export interface ForgotPasswordRequest {
  email: string;
  captchaToken?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface SetPasswordRequest {
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface SetPasswordResponse {
  message: string;
}

export interface SudoRequest {
  password?: string;
  totpCode?: string;
}

export interface SudoResponse {
  sudoToken: string;
  expiresAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  isNewDevice?: boolean;
  defaultTenantId?: string;
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

export interface ForgotPasswordResponse {
  message: string;
}

export interface BffLoginResponse {
  user: User;
  isNewDevice?: boolean;
  defaultTenantId?: string;
}

export type LoginSuccessResponse = BffLoginResponse;

// ============================================================================
// Constants
// ============================================================================

export const pendingVerificationLiteral = createLiteralSchema('pending_verification' as const);

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
    tosAccepted: parseBoolean(obj['tosAccepted'], 'tosAccepted'),
    ...(typeof obj['captchaToken'] === 'string' ? { captchaToken: obj['captchaToken'] } : {}),
  };
});

export const forgotPasswordRequestSchema: Schema<ForgotPasswordRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      email: emailSchema.parse(obj['email']),
      ...(typeof obj['captchaToken'] === 'string' ? { captchaToken: obj['captchaToken'] } : {}),
    };
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

// ============================================================================
// Response Schemas
// ============================================================================

export const authResponseSchema: Schema<AuthResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    token: parseString(obj['token'], 'token'),
    user: userSchema.parse(obj['user']),
    ...(typeof obj['isNewDevice'] === 'boolean' ? { isNewDevice: obj['isNewDevice'] } : {}),
    ...(typeof obj['defaultTenantId'] === 'string'
      ? { defaultTenantId: parseString(obj['defaultTenantId'], 'defaultTenantId') }
      : {}),
  };
});

export const bffLoginResponseSchema: Schema<BffLoginResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (obj['token'] !== undefined || obj['accessToken'] !== undefined) {
    throw new Error('BFF login response must not include token fields');
  }
  return {
    user: userSchema.parse(obj['user']),
    ...(typeof obj['isNewDevice'] === 'boolean'
      ? { isNewDevice: parseBoolean(obj['isNewDevice'], 'isNewDevice') }
      : {}),
    ...(typeof obj['defaultTenantId'] === 'string'
      ? { defaultTenantId: parseString(obj['defaultTenantId'], 'defaultTenantId') }
      : {}),
  };
});

export const loginSuccessResponseSchema: Schema<LoginSuccessResponse> = createSchema(
  (data: unknown) => {
    const bff = bffLoginResponseSchema.safeParse(data);
    if (bff.success) {
      return bff.data;
    }

    throw new Error('Invalid login success response');
  },
);

export const registerResponseSchema: Schema<RegisterResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    status: pendingVerificationLiteral.parse(obj['status']),
    message: parseString(obj['message'], 'message'),
    email: emailSchema.parse(obj['email']),
  };
});

export const logoutResponseSchema: Schema<LogoutResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { message: parseString(obj['message'], 'message') };
});

export const forgotPasswordResponseSchema: Schema<ForgotPasswordResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const refreshResponseSchema: Schema<RefreshResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { token: parseString(obj['token'], 'token') };
});

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

// ============================================================================
// Functions
// ============================================================================

/**
 * Type guard to check if a request context has an authenticated user.
 *
 * Validates that `req.user` is a non-null object with a non-empty `userId` string.
 * Narrows the type so callers can access `req.user.userId`, `req.user.email`, etc.
 */
export function isAuthenticatedRequest<T extends { readonly user?: unknown }>(
  req: T,
): req is T & {
  readonly user: { readonly userId: string; readonly email: string; readonly role: string };
} {
  if (req.user === undefined || typeof req.user !== 'object') {
    return false;
  }
  const user = req.user as unknown as Record<string, unknown>;
  return 'userId' in user && typeof user['userId'] === 'string' && user['userId'] !== '';
}
