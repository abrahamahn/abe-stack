// main/shared/src/core/auth/auth.mfa.schemas.ts
/**
 * @file Auth MFA Schemas
 * @description Schemas for multi-factor authentication (TOTP, SMS 2FA, session invalidation).
 * @module Core/Auth
 */

import {
  createLiteralSchema,
  createSchema,
  parseBoolean,
  parseString,
} from '../../primitives/schema';

import type { Schema } from '../../primitives/schema';

// ============================================================================
// Types
// ============================================================================

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

export interface InvalidateSessionsResponse {
  message: string;
}

export interface TotpVerifyRequest {
  code: string;
}

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

// ============================================================================
// Constants
// ============================================================================

const requiresTotpLiteral = createLiteralSchema(true as const);

// ============================================================================
// Request Schemas
// ============================================================================

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

export const invalidateSessionsResponseSchema: Schema<InvalidateSessionsResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message') };
  },
);
