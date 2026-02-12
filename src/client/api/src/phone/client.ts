// src/client/api/src/phone/client.ts
/**
 * Phone/SMS Management API Client
 *
 * Framework-agnostic client for phone verification and SMS 2FA endpoints.
 */

import {
  setPhoneRequestSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  verifyPhoneRequestSchema,
} from '@abe-stack/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type { User } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export type PhoneClientConfig = BaseClientConfig;

export interface PhoneClient {
  setPhone(phone: string): Promise<{ message: string }>;
  verifyPhone(code: string): Promise<{ verified: true }>;
  removePhone(): Promise<{ message: string }>;
  sendSmsCode(challengeToken: string): Promise<{ message: string }>;
  verifySmsCode(challengeToken: string, code: string): Promise<{ token: string; user: User }>;
}

// ============================================================================
// Client Factory
// ============================================================================

export function createPhoneClient(config: PhoneClientConfig): PhoneClient {
  const factory = createRequestFactory(config);

  return {
    setPhone: (phone): Promise<{ message: string }> => {
      const validated = setPhoneRequestSchema.parse({ phone });
      return apiRequest<{ message: string }>(factory, '/users/me/phone', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    verifyPhone: (code): Promise<{ verified: true }> => {
      const validated = verifyPhoneRequestSchema.parse({ code });
      return apiRequest<{ verified: true }>(factory, '/users/me/phone/verify', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    removePhone: (): Promise<{ message: string }> =>
      apiRequest<{ message: string }>(factory, '/users/me/phone', {
        method: 'DELETE',
      }),

    sendSmsCode: (challengeToken): Promise<{ message: string }> => {
      const validated = smsChallengeRequestSchema.parse({ challengeToken });
      return apiRequest<{ message: string }>(factory, '/auth/sms/send', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    verifySmsCode: (challengeToken, code): Promise<{ token: string; user: User }> => {
      const validated = smsVerifyRequestSchema.parse({ challengeToken, code });
      return apiRequest<{ token: string; user: User }>(factory, '/auth/sms/verify', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },
  };
}
