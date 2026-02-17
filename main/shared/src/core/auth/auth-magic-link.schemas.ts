// main/shared/src/core/auth/auth-magic-link.schemas.ts
/**
 * @file Auth Magic Link Schemas
 * @description Schemas for magic link authentication flows.
 * @module Core/Auth
 */

import { createSchema, parseString } from '../../primitives/schema';

import { emailSchema } from './auth-scalars.schemas';

import type { Schema } from '../../primitives/schema';

// ============================================================================
// Types
// ============================================================================

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
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
