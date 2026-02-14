// main/server/db/src/repositories/auth/webauthn-credentials.ts
/**
 * WebAuthn Credentials Repository (Functional)
 *
 * Data access layer for the webauthn_credentials table.
 * Stores FIDO2/WebAuthn public key credentials for passkey authentication.
 *
 * @module
 */

import { eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewWebauthnCredential,
  type WebauthnCredential,
  WEBAUTHN_CREDENTIAL_COLUMNS,
  WEBAUTHN_CREDENTIALS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// WebAuthn Credential Repository Interface
// ============================================================================

/**
 * Functional repository for WebAuthn credential operations.
 */
export interface WebauthnCredentialRepository {
  /** Create a new WebAuthn credential. */
  create(data: NewWebauthnCredential): Promise<WebauthnCredential>;

  /** Find all credentials for a user. */
  findByUserId(userId: string): Promise<WebauthnCredential[]>;

  /** Find a credential by its WebAuthn credential ID. */
  findByCredentialId(credentialId: string): Promise<WebauthnCredential | null>;

  /** Update counter and last_used_at after successful authentication. */
  updateCounter(id: string, counter: number): Promise<void>;

  /** Update the display name of a credential. */
  updateName(id: string, name: string): Promise<void>;

  /** Delete a single credential by ID. */
  delete(id: string): Promise<void>;

  /** Delete all credentials for a user. Returns number deleted. */
  deleteAllByUserId(userId: string): Promise<number>;
}

// ============================================================================
// WebAuthn Credential Repository Implementation
// ============================================================================

function transformCredential(row: Record<string, unknown>): WebauthnCredential {
  return toCamelCase<WebauthnCredential>(row, WEBAUTHN_CREDENTIAL_COLUMNS);
}

/**
 * Create a WebAuthn credential repository bound to a database connection.
 */
export function createWebauthnCredentialRepository(db: RawDb): WebauthnCredentialRepository {
  return {
    async create(data: NewWebauthnCredential): Promise<WebauthnCredential> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        WEBAUTHN_CREDENTIAL_COLUMNS,
      );
      const result = await db.queryOne(
        insert(WEBAUTHN_CREDENTIALS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create WebAuthn credential');
      }
      return transformCredential(result);
    },

    async findByUserId(userId: string): Promise<WebauthnCredential[]> {
      const rows = await db.query(
        select(WEBAUTHN_CREDENTIALS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return rows.map(transformCredential);
    },

    async findByCredentialId(credentialId: string): Promise<WebauthnCredential | null> {
      const result = await db.queryOne(
        select(WEBAUTHN_CREDENTIALS_TABLE).where(eq('credential_id', credentialId)).toSql(),
      );
      return result !== null ? transformCredential(result) : null;
    },

    async updateCounter(id: string, counter: number): Promise<void> {
      await db.execute(
        update(WEBAUTHN_CREDENTIALS_TABLE)
          .set({ ['counter']: counter, ['last_used_at']: new Date() })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async updateName(id: string, name: string): Promise<void> {
      await db.execute(
        update(WEBAUTHN_CREDENTIALS_TABLE)
          .set({ ['name']: name })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async delete(id: string): Promise<void> {
      await db.execute(deleteFrom(WEBAUTHN_CREDENTIALS_TABLE).where(eq('id', id)).toSql());
    },

    async deleteAllByUserId(userId: string): Promise<number> {
      return db.execute(
        deleteFrom(WEBAUTHN_CREDENTIALS_TABLE).where(eq('user_id', userId)).toSql(),
      );
    },
  };
}
