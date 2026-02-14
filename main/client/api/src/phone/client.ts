// main/client/api/src/phone/client.ts
/**
 * Phone/SMS Management API Client
 *
 * Framework-agnostic client for phone verification and SMS 2FA endpoints.
 */

import {
  authResponseSchema,
  removePhoneResponseSchema,
  setPhoneRequestSchema,
  setPhoneResponseSchema,
  smsChallengeRequestSchema,
  totpVerifyResponseSchema,
  smsVerifyRequestSchema,
  verifyPhoneRequestSchema,
  verifyPhoneResponseSchema,
} from '@abe-stack/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  AuthResponse,
  RemovePhoneResponse,
  SetPhoneResponse,
  TotpVerifyResponse,
  VerifyPhoneResponse,
} from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export type PhoneClientConfig = BaseClientConfig;

export interface PhoneClient {
  setPhone(phone: string): Promise<SetPhoneResponse>;
  verifyPhone(code: string): Promise<VerifyPhoneResponse>;
  removePhone(): Promise<RemovePhoneResponse>;
  sendSmsCode(challengeToken: string): Promise<TotpVerifyResponse>;
  verifySmsCode(challengeToken: string, code: string): Promise<AuthResponse>;
}

// ============================================================================
// Client Factory
// ============================================================================

export function createPhoneClient(config: PhoneClientConfig): PhoneClient {
  const factory = createRequestFactory(config);

  return {
    setPhone: (phone): Promise<SetPhoneResponse> => {
      const validated = setPhoneRequestSchema.parse({ phone });
      return apiRequest(
        factory,
        '/users/me/phone',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        setPhoneResponseSchema,
      );
    },

    verifyPhone: (code): Promise<VerifyPhoneResponse> => {
      const validated = verifyPhoneRequestSchema.parse({ code });
      return apiRequest(
        factory,
        '/users/me/phone/verify',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        verifyPhoneResponseSchema,
      );
    },

    removePhone: (): Promise<RemovePhoneResponse> =>
      apiRequest(
        factory,
        '/users/me/phone/delete',
        { method: 'DELETE' },
        true,
        removePhoneResponseSchema,
      ),

    sendSmsCode: (challengeToken): Promise<TotpVerifyResponse> => {
      const validated = smsChallengeRequestSchema.parse({ challengeToken });
      return apiRequest(
        factory,
        '/auth/sms/send',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        totpVerifyResponseSchema,
      );
    },

    verifySmsCode: (challengeToken, code): Promise<AuthResponse> => {
      const validated = smsVerifyRequestSchema.parse({ challengeToken, code });
      return apiRequest(
        factory,
        '/auth/sms/verify',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        authResponseSchema,
      );
    },
  };
}
