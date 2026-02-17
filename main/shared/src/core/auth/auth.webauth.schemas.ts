// main/shared/src/core/auth/auth.webauth.schemas.ts
/**
 * @file Auth WebAuthn Schemas
 * @description Schemas for WebAuthn registration and login flows.
 * @module Core/Auth
 */

import { createSchema, parseString } from '../../primitives/schema';

import type { Schema } from '../../primitives/schema';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Schemas
// ============================================================================

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
