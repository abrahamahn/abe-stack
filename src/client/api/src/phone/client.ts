// src/client/api/src/phone/client.ts
/**
 * Phone/SMS Management API Client
 *
 * Framework-agnostic client for phone verification and SMS 2FA endpoints.
 */

import { addAuthHeader } from '@abe-stack/shared';

import { createApiError, NetworkError } from '../errors';

import type { ApiErrorBody } from '../errors';

// ============================================================================
// Types
// ============================================================================

export interface PhoneClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

export interface PhoneClient {
  setPhone(phone: string): Promise<{ message: string }>;
  verifyPhone(code: string): Promise<{ verified: true }>;
  removePhone(): Promise<{ message: string }>;
  sendSmsCode(challengeToken: string): Promise<{ message: string }>;
  verifySmsCode(challengeToken: string, code: string): Promise<{ token: string; user: unknown }>;
}

// ============================================================================
// Client Factory
// ============================================================================

export function createPhoneClient(config: PhoneClientConfig): PhoneClient {
  async function request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${config.baseUrl}${path}`;
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = config.getToken?.() ?? null;
    addAuthHeader(headers, token);

    const init: RequestInit = { method, headers, credentials: 'include' };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      throw new NetworkError('Failed to connect to server');
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody;
      throw createApiError(response.status, errorBody);
    }

    return (await response.json()) as T;
  }

  return {
    setPhone: (phone) =>
      request<{ message: string }>('POST', '/api/users/me/phone', { phone }),

    verifyPhone: (code) =>
      request<{ verified: true }>('POST', '/api/users/me/phone/verify', { code }),

    removePhone: () =>
      request<{ message: string }>('DELETE', '/api/users/me/phone'),

    sendSmsCode: (challengeToken) =>
      request<{ message: string }>('POST', '/api/auth/sms/send', { challengeToken }),

    verifySmsCode: (challengeToken, code) =>
      request<{ token: string; user: unknown }>('POST', '/api/auth/sms/verify', {
        challengeToken,
        code,
      }),
  };
}
