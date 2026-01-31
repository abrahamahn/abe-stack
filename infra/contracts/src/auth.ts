// infra/contracts/src/auth.ts
/**
 * Auth Contract
 *
 * Authentication-related schemas and API contract definitions.
 */

import { emailSchema, errorResponseSchema, nameSchema, passwordSchema } from './common';
import { createSchema } from './schema';
import { userSchema, type User } from './users';

import type { Contract, Schema } from './types';

// ============================================================================
// Request Schemas
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export const loginRequestSchema: Schema<LoginRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid login request');
  }
  const obj = data as Record<string, unknown>;
  return {
    email: emailSchema.parse(obj['email']),
    password: passwordSchema.parse(obj['password']),
  };
});

export interface RegisterRequest {
  email: string;
  name?: string | undefined;
  password: string;
}

export const registerRequestSchema: Schema<RegisterRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid register request');
  }
  const obj = data as Record<string, unknown>;
  return {
    email: emailSchema.parse(obj['email']),
    name: nameSchema.parse(obj['name']),
    password: passwordSchema.parse(obj['password']),
  };
});

export interface EmailVerificationRequest {
  token: string;
}

export const emailVerificationRequestSchema: Schema<EmailVerificationRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid email verification request');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['token'] !== 'string') {
      throw new Error('Token must be a string');
    }
    return { token: obj['token'] };
  },
);

export interface ForgotPasswordRequest {
  email: string;
}

export const forgotPasswordRequestSchema: Schema<ForgotPasswordRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid forgot password request');
    }
    const obj = data as Record<string, unknown>;
    return { email: emailSchema.parse(obj['email']) };
  },
);

export interface ResendVerificationRequest {
  email: string;
}

export const resendVerificationRequestSchema: Schema<ResendVerificationRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid resend verification request');
    }
    const obj = data as Record<string, unknown>;
    return { email: emailSchema.parse(obj['email']) };
  },
);

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export const resetPasswordRequestSchema: Schema<ResetPasswordRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid reset password request');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['token'] !== 'string') {
      throw new Error('Token must be a string');
    }
    return {
      token: obj['token'],
      password: passwordSchema.parse(obj['password']),
    };
  },
);

export interface SetPasswordRequest {
  password: string;
}

export const setPasswordRequestSchema: Schema<SetPasswordRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid set password request');
    }
    const obj = data as Record<string, unknown>;
    return { password: passwordSchema.parse(obj['password']) };
  },
);

// ============================================================================
// Magic Link Schemas
// ============================================================================

export interface MagicLinkRequest {
  email: string;
}

export const magicLinkRequestSchema: Schema<MagicLinkRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid magic link request');
  }
  const obj = data as Record<string, unknown>;
  return { email: emailSchema.parse(obj['email']) };
});

export interface MagicLinkVerifyRequest {
  token: string;
}

export const magicLinkVerifySchema: Schema<MagicLinkVerifyRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid magic link verify request');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['token'] !== 'string' || obj['token'].length < 1) {
      throw new Error('Token is required');
    }
    return { token: obj['token'] };
  },
);

// ============================================================================
// Response Schemas
// ============================================================================

export interface AuthResponse {
  token: string;
  user: User;
}

export const authResponseSchema: Schema<AuthResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid auth response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['token'] !== 'string') {
    throw new Error('Token must be a string');
  }
  return {
    token: obj['token'],
    user: userSchema.parse(obj['user']),
  };
});

export interface RegisterResponse {
  status: 'pending_verification';
  message: string;
  email: string;
}

export const registerResponseSchema: Schema<RegisterResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid register response');
  }
  const obj = data as Record<string, unknown>;
  if (obj['status'] !== 'pending_verification') {
    throw new Error('Invalid status');
  }
  if (typeof obj['message'] !== 'string') {
    throw new Error('Message must be a string');
  }
  return {
    status: 'pending_verification',
    message: obj['message'],
    email: emailSchema.parse(obj['email']),
  };
});

export interface RefreshResponse {
  token: string;
}

export const refreshResponseSchema: Schema<RefreshResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid refresh response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['token'] !== 'string') {
    throw new Error('Token must be a string');
  }
  return { token: obj['token'] };
});

export interface LogoutResponse {
  message: string;
}

export const logoutResponseSchema: Schema<LogoutResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid logout response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['message'] !== 'string') {
    throw new Error('Message must be a string');
  }
  return { message: obj['message'] };
});

export interface EmailVerificationResponse {
  verified: boolean;
  token: string;
  user: User;
}

export const emailVerificationResponseSchema: Schema<EmailVerificationResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid email verification response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['verified'] !== 'boolean') {
      throw new Error('Verified must be a boolean');
    }
    if (typeof obj['token'] !== 'string') {
      throw new Error('Token must be a string');
    }
    return {
      verified: obj['verified'],
      token: obj['token'],
      user: userSchema.parse(obj['user']),
    };
  },
);

export interface ForgotPasswordResponse {
  message: string;
}

export const forgotPasswordResponseSchema: Schema<ForgotPasswordResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid forgot password response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return { message: obj['message'] };
  },
);

export interface ResendVerificationResponse {
  message: string;
}

export const resendVerificationResponseSchema: Schema<ResendVerificationResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid resend verification response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return { message: obj['message'] };
  },
);

export interface ResetPasswordResponse {
  message: string;
}

export const resetPasswordResponseSchema: Schema<ResetPasswordResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid reset password response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return { message: obj['message'] };
  },
);

export interface SetPasswordResponse {
  message: string;
}

export const setPasswordResponseSchema: Schema<SetPasswordResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid set password response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return { message: obj['message'] };
  },
);

export interface MagicLinkRequestResponse {
  success: boolean;
  message: string;
}

export const magicLinkRequestResponseSchema: Schema<MagicLinkRequestResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid magic link request response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['success'] !== 'boolean') {
      throw new Error('Success must be a boolean');
    }
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return { success: obj['success'], message: obj['message'] };
  },
);

export interface MagicLinkVerifyResponse {
  token: string;
  user: User;
}

export const magicLinkVerifyResponseSchema: Schema<MagicLinkVerifyResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid magic link verify response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['token'] !== 'string') {
      throw new Error('Token must be a string');
    }
    return {
      token: obj['token'],
      user: userSchema.parse(obj['user']),
    };
  },
);

// ============================================================================
// TOTP (2FA) Schemas
// ============================================================================

export interface TotpSetupResponse {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

export const totpSetupResponseSchema: Schema<TotpSetupResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid TOTP setup response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['secret'] !== 'string') throw new Error('Secret must be a string');
  if (typeof obj['otpauthUrl'] !== 'string') throw new Error('otpauthUrl must be a string');
  if (!Array.isArray(obj['backupCodes'])) throw new Error('backupCodes must be an array');
  return {
    secret: obj['secret'],
    otpauthUrl: obj['otpauthUrl'],
    backupCodes: obj['backupCodes'] as string[],
  };
});

export interface TotpVerifyRequest {
  code: string;
}

export const totpVerifyRequestSchema: Schema<TotpVerifyRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid TOTP verify request');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['code'] !== 'string' || obj['code'].length < 6) {
    throw new Error('Code must be a string of at least 6 characters');
  }
  return { code: obj['code'] };
});

export interface TotpVerifyResponse {
  success: boolean;
  message: string;
}

export const totpVerifyResponseSchema: Schema<TotpVerifyResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid TOTP verify response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['success'] !== 'boolean') throw new Error('Success must be a boolean');
    if (typeof obj['message'] !== 'string') throw new Error('Message must be a string');
    return { success: obj['success'], message: obj['message'] };
  },
);

export interface TotpStatusResponse {
  enabled: boolean;
}

export const totpStatusResponseSchema: Schema<TotpStatusResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid TOTP status response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['enabled'] !== 'boolean') throw new Error('Enabled must be a boolean');
    return { enabled: obj['enabled'] };
  },
);

// ============================================================================
// Email Change Schemas
// ============================================================================

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

export const changeEmailRequestSchema: Schema<ChangeEmailRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid change email request');
    }
    const obj = data as Record<string, unknown>;
    return {
      newEmail: emailSchema.parse(obj['newEmail']),
      password: passwordSchema.parse(obj['password']),
    };
  },
);

export interface ChangeEmailResponse {
  success: boolean;
  message: string;
}

export const changeEmailResponseSchema: Schema<ChangeEmailResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid change email response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['success'] !== 'boolean') throw new Error('Success must be a boolean');
    if (typeof obj['message'] !== 'string') throw new Error('Message must be a string');
    return { success: obj['success'], message: obj['message'] };
  },
);

export interface ConfirmEmailChangeRequest {
  token: string;
}

export const confirmEmailChangeRequestSchema: Schema<ConfirmEmailChangeRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid confirm email change request');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['token'] !== 'string' || obj['token'].length < 1) {
      throw new Error('Token is required');
    }
    return { token: obj['token'] };
  },
);

export interface ConfirmEmailChangeResponse {
  success: boolean;
  message: string;
  email: string;
}

export const confirmEmailChangeResponseSchema: Schema<ConfirmEmailChangeResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid confirm email change response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['success'] !== 'boolean') throw new Error('Success must be a boolean');
    if (typeof obj['message'] !== 'string') throw new Error('Message must be a string');
    return {
      success: obj['success'],
      message: obj['message'],
      email: emailSchema.parse(obj['email']),
    };
  },
);

// ============================================================================
// Empty Body Schema (for endpoints with no body)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmptyBody {}

export const emptyBodySchema: Schema<EmptyBody> = createSchema((data: unknown) => {
  if (data !== undefined && data !== null && typeof data === 'object') {
    return {};
  }
  return {};
});

// ============================================================================
// Auth Contract
// ============================================================================

export const authContract = {
  register: {
    method: 'POST' as const,
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
    method: 'POST' as const,
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
    method: 'POST' as const,
    path: '/api/auth/refresh',
    body: emptyBodySchema,
    responses: {
      200: refreshResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Refresh access token using refresh token cookie',
  },
  logout: {
    method: 'POST' as const,
    path: '/api/auth/logout',
    body: emptyBodySchema,
    responses: {
      200: logoutResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Logout and invalidate refresh token',
  },
  verifyEmail: {
    method: 'POST' as const,
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
    method: 'POST' as const,
    path: '/api/auth/resend-verification',
    body: resendVerificationRequestSchema,
    responses: {
      200: resendVerificationResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Resend verification email to unverified user',
  },
  forgotPassword: {
    method: 'POST' as const,
    path: '/api/auth/forgot-password',
    body: forgotPasswordRequestSchema,
    responses: {
      200: forgotPasswordResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Request password reset',
  },
  resetPassword: {
    method: 'POST' as const,
    path: '/api/auth/reset-password',
    body: resetPasswordRequestSchema,
    responses: {
      200: resetPasswordResponseSchema,
      400: errorResponseSchema,
    },
    summary: 'Reset password with token',
  },
  setPassword: {
    method: 'POST' as const,
    path: '/api/auth/set-password',
    body: setPasswordRequestSchema,
    responses: {
      200: setPasswordResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Set password for first time (magic-link only users)',
  },
  magicLinkRequest: {
    method: 'POST' as const,
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
    method: 'POST' as const,
    path: '/api/auth/magic-link/verify',
    body: magicLinkVerifySchema,
    responses: {
      200: magicLinkVerifyResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify magic link token and login',
  },
  // TOTP (2FA) endpoints
  totpSetup: {
    method: 'POST' as const,
    path: '/api/auth/totp/setup',
    body: emptyBodySchema,
    responses: {
      200: totpSetupResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Generate TOTP secret and backup codes for 2FA setup',
  },
  totpEnable: {
    method: 'POST' as const,
    path: '/api/auth/totp/enable',
    body: totpVerifyRequestSchema,
    responses: {
      200: totpVerifyResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify TOTP code and enable 2FA',
  },
  totpDisable: {
    method: 'POST' as const,
    path: '/api/auth/totp/disable',
    body: totpVerifyRequestSchema,
    responses: {
      200: totpVerifyResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Disable 2FA by verifying current TOTP code',
  },
  totpStatus: {
    method: 'GET' as const,
    path: '/api/auth/totp/status',
    responses: {
      200: totpStatusResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Check if 2FA is enabled for current user',
  },
  // Email change endpoints
  changeEmail: {
    method: 'POST' as const,
    path: '/api/auth/change-email',
    body: changeEmailRequestSchema,
    responses: {
      200: changeEmailResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Initiate email change - sends verification to new email',
  },
  confirmEmailChange: {
    method: 'POST' as const,
    path: '/api/auth/change-email/confirm',
    body: confirmEmailChangeRequestSchema,
    responses: {
      200: confirmEmailChangeResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Confirm email change with verification token',
  },
} satisfies Contract;
