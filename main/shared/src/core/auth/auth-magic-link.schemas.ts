// main/shared/src/core/auth/auth-magic-link.schemas.ts
/**
 * @file Auth Magic Link Schemas
 * @description Schemas for magic link authentication flows.
 * @module Core/Auth
 */

import { createSchema, parseString } from '../../primitives/schema';

import { emailSchema } from './auth-scalars.schemas';

import type { User } from '../users/users.schemas';
import type { Schema } from '../../primitives/schema';

import { userSchema } from '../users/users.schemas';

// ============================================================================
// Types
// ============================================================================

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
}

export interface MagicLinkRequestResponse {
  message: string;
}

export interface MagicLinkVerifyResponse {
  token: string;
  user: User;
}

// ============================================================================
// Schemas
// ============================================================================

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
