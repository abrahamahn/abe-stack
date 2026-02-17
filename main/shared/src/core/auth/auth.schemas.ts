// main/shared/src/domain/auth/auth.schemas.ts

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
} from '../schema.utils';
import { emailSchema, passwordSchema } from '../schemas';
import { userSchema as domainUserSchema, type User as DomainUser } from '../users/users.schemas';

import type { Schema } from '../../primitives/api';

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

// SMS 2FA
export interface SetPhoneRequest {
  phone: string;
}

export interface VerifyPhoneRequest {
  code: string;
}

export interface SetPhoneResponse {
  message: string;
}

export interface VerifyPhoneResponse {
  verified: boolean;
}

export interface RemovePhoneResponse {
  message: string;
}

export interface SmsChallengeRequest {
  challengeToken: string;
}

export interface SmsChallengeResponse {
  requiresSms: true;
  challengeToken: string;
  message: string;
}

export interface SmsVerifyRequest {
  challengeToken: string;
  code: string;
}

export interface TotpLoginChallengeResponse {
  requiresTotp: true;
  challengeToken: string;
  message: string;
}

export interface SmsLoginChallengeResponse {
  requiresSms: true;
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
  isNewDevice?: boolean;
  defaultTenantId?: string;
}

export interface BffLoginResponse {
  user: User;
  isNewDevice?: boolean;
  defaultTenantId?: string;
}

export type LoginSuccessResponse = BffLoginResponse;

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

// Devices
export interface DeviceItem {
  id: string;
  deviceFingerprint: string;
  label: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  trusted: boolean;
  createdAt: string;
}

export interface DeviceListResponse {
  devices: DeviceItem[];
}

export interface TrustDeviceResponse {
  device: DeviceItem;
}

export interface InvalidateSessionsResponse {
  message: string;
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
    tosAccepted: parseBoolean(obj['tosAccepted'], 'tosAccepted'),
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

// SMS 2FA
export const setPhoneRequestSchema: Schema<SetPhoneRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { phone: parseString(obj['phone'], 'phone', { min: 7, trim: true }) };
});

export const verifyPhoneRequestSchema: Schema<VerifyPhoneRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { code: parseString(obj['code'], 'code', { min: 6 }) };
  },
);

export const smsChallengeRequestSchema: Schema<SmsChallengeRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      challengeToken: parseString(obj['challengeToken'], 'challengeToken', { min: 1 }),
    };
  },
);

export const smsVerifyRequestSchema: Schema<SmsVerifyRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    challengeToken: parseString(obj['challengeToken'], 'challengeToken', { min: 1 }),
    code: parseString(obj['code'], 'code', { min: 6 }),
  };
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
    user: domainUserSchema.parse(obj['user']),
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

export const setPhoneResponseSchema: Schema<SetPhoneResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { message: parseString(obj['message'], 'message') };
});

export const verifyPhoneResponseSchema: Schema<VerifyPhoneResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { verified: parseBoolean(obj['verified'], 'verified') };
  },
);

export const removePhoneResponseSchema: Schema<RemovePhoneResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
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

// ============================================================================
// WebAuthn / Passkey Types
// ============================================================================

/** Passkey list item returned by GET /api/users/me/passkeys */
export interface PasskeyListItem {
  id: string;
  name: string;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Request to rename a passkey */
export interface RenamePasskeyRequest {
  name: string;
}

export interface WebauthnOptionsResponse {
  options: Record<string, unknown>;
}

export interface WebauthnRegisterVerifyRequest {
  credential: Record<string, unknown>;
  name?: string;
}

export interface WebauthnRegisterVerifyResponse {
  credentialId: string;
  message: string;
}

export interface WebauthnLoginOptionsRequest {
  email?: string;
}

export interface WebauthnLoginVerifyRequest {
  credential: Record<string, unknown>;
  sessionKey: string;
}

export const renamePasskeyRequestSchema: Schema<RenamePasskeyRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { name: parseString(obj['name'], 'name', { min: 1, max: 64, trim: true }) };
  },
);

export const deviceItemSchema: Schema<DeviceItem> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: parseString(obj['id'], 'id'),
    deviceFingerprint: parseString(obj['deviceFingerprint'], 'deviceFingerprint'),
    label: obj['label'] === null ? null : parseString(obj['label'], 'label'),
    ipAddress: obj['ipAddress'] === null ? null : parseString(obj['ipAddress'], 'ipAddress'),
    userAgent: obj['userAgent'] === null ? null : parseString(obj['userAgent'], 'userAgent'),
    firstSeenAt: parseString(obj['firstSeenAt'], 'firstSeenAt'),
    lastSeenAt: parseString(obj['lastSeenAt'], 'lastSeenAt'),
    trusted: parseBoolean(obj['trusted'], 'trusted'),
    createdAt: parseString(obj['createdAt'], 'createdAt'),
  };
});

export const deviceListResponseSchema: Schema<DeviceListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (!Array.isArray(obj['devices'])) {
      throw new Error('devices must be an array');
    }
    return {
      devices: obj['devices'].map((item) => deviceItemSchema.parse(item)),
    };
  },
);

export const trustDeviceResponseSchema: Schema<TrustDeviceResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      device: deviceItemSchema.parse(obj['device']),
    };
  },
);

export const invalidateSessionsResponseSchema: Schema<InvalidateSessionsResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);

export const passkeyListItemSchema: Schema<PasskeyListItem> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: parseString(obj['id'], 'id'),
    name: parseString(obj['name'], 'name'),
    deviceType: obj['deviceType'] === null ? null : parseString(obj['deviceType'], 'deviceType'),
    backedUp: parseBoolean(obj['backedUp'], 'backedUp'),
    createdAt: parseString(obj['createdAt'], 'createdAt'),
    lastUsedAt: obj['lastUsedAt'] === null ? null : parseString(obj['lastUsedAt'], 'lastUsedAt'),
  };
});

export const passkeyListResponseSchema: Schema<PasskeyListItem[]> = createSchema(
  (data: unknown) => {
    if (!Array.isArray(data)) {
      throw new Error('passkeys response must be an array');
    }
    return data.map((item) => passkeyListItemSchema.parse(item));
  },
);

export const webauthnOptionsResponseSchema: Schema<WebauthnOptionsResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (
      obj['options'] === null ||
      obj['options'] === undefined ||
      typeof obj['options'] !== 'object'
    ) {
      throw new Error('options must be an object');
    }
    return { options: obj['options'] as Record<string, unknown> };
  },
);

export const webauthnRegisterVerifyRequestSchema: Schema<WebauthnRegisterVerifyRequest> =
  createSchema((data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (
      obj['credential'] === null ||
      obj['credential'] === undefined ||
      typeof obj['credential'] !== 'object'
    ) {
      throw new Error('credential must be an object');
    }
    const result: WebauthnRegisterVerifyRequest = {
      credential: obj['credential'] as Record<string, unknown>,
    };
    if (typeof obj['name'] === 'string') {
      result.name = obj['name'];
    }
    return result;
  });

export const webauthnRegisterVerifyResponseSchema: Schema<WebauthnRegisterVerifyResponse> =
  createSchema((data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      credentialId: parseString(obj['credentialId'], 'credentialId'),
      message: parseString(obj['message'], 'message'),
    };
  });

export const webauthnLoginOptionsRequestSchema: Schema<WebauthnLoginOptionsRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const result: WebauthnLoginOptionsRequest = {};
    if (typeof obj['email'] === 'string') {
      result.email = obj['email'];
    }
    return result;
  },
);

export const webauthnLoginVerifyRequestSchema: Schema<WebauthnLoginVerifyRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (
      obj['credential'] === null ||
      obj['credential'] === undefined ||
      typeof obj['credential'] !== 'object'
    ) {
      throw new Error('credential must be an object');
    }
    return {
      credential: obj['credential'] as Record<string, unknown>,
      sessionKey: parseString(obj['sessionKey'], 'sessionKey', { min: 1 }),
    };
  },
);
