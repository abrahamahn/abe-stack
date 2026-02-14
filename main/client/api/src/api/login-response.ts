// main/client/api/src/api/login-response.ts
/**
 * Login response normalization and parsing for the web BFF flow.
 */

import {
  totpLoginChallengeResponseSchema,
  userSchema,
} from '@abe-stack/shared';

import type {
  LoginSuccessResponse,
  SmsLoginChallengeResponse,
  TotpLoginChallengeResponse,
} from '@abe-stack/shared';

type LoginResponse = LoginSuccessResponse | TotpLoginChallengeResponse | SmsLoginChallengeResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function parseSmsChallenge(candidate: Record<string, unknown> | null): SmsLoginChallengeResponse | null {
  if (
    isRecord(candidate) &&
    candidate['requiresSms'] === true &&
    typeof candidate['challengeToken'] === 'string' &&
    typeof candidate['message'] === 'string'
  ) {
    return {
      requiresSms: true,
      challengeToken: candidate['challengeToken'],
      message: candidate['message'],
    };
  }
  return null;
}

function parseBffAuth(candidate: Record<string, unknown> | null): LoginSuccessResponse | null {
  if (!isRecord(candidate)) return null;
  if ('token' in candidate || 'accessToken' in candidate) return null;

  const parsedUser = userSchema.safeParse(candidate['user']);
  if (!parsedUser.success) return null;

  return {
    user: parsedUser.data,
    ...(typeof candidate['isNewDevice'] === 'boolean'
      ? { isNewDevice: candidate['isNewDevice'] }
      : {}),
    ...(typeof candidate['defaultTenantId'] === 'string'
      ? { defaultTenantId: candidate['defaultTenantId'] }
      : {}),
  };
}

export function parseLoginResponse(value: unknown): LoginResponse {
  const raw = isRecord(value) ? value : null;
  const bffAuth = parseBffAuth(raw);
  if (bffAuth !== null) return bffAuth;

  const totpResult = totpLoginChallengeResponseSchema.safeParse(raw);
  if (totpResult.success) return totpResult.data;

  const smsResult = parseSmsChallenge(raw);
  if (smsResult !== null) return smsResult;

  const preview = raw !== null ? `keys=${Object.keys(raw).join(',')}` : `type=${typeof value}`;
  throw new Error(`Invalid login response shape (${preview})`);
}
