// main/shared/src/core/auth/auth-tos.schemas.ts
/**
 * @file Auth ToS Schemas
 * @description Schemas for Terms of Service acceptance and status.
 * @module Core/Auth
 */

import { createSchema, parseBoolean, parseNumber, parseString } from '../../primitives/schema';

import type { Schema } from '../../primitives/schema';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Schemas
// ============================================================================

export const acceptTosRequestSchema: Schema<AcceptTosRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { documentId: parseString(obj['documentId'], 'documentId', { min: 1 }) };
});

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
