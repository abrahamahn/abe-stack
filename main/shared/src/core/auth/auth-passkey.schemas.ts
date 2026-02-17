// main/shared/src/core/auth/auth-passkey.schemas.ts
/**
 * @file Auth Passkey Schemas
 * @description Schemas for passkey (WebAuthn credential) management.
 * @module Core/Auth
 */

import { createSchema, parseBoolean, parseString } from '../../primitives/schema';

import type { Schema } from '../../primitives/schema';

// ============================================================================
// Types
// ============================================================================

/** Request to rename a passkey */
export interface RenamePasskeyRequest {
  name: string;
}

/** Passkey list item returned by GET /api/users/me/passkeys */
export interface PasskeyListItem {
  id: string;
  name: string;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

// ============================================================================
// Schemas
// ============================================================================

export const renamePasskeyRequestSchema: Schema<RenamePasskeyRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { name: parseString(obj['name'], 'name', { min: 1, max: 64, trim: true }) };
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
