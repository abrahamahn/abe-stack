// packages/db/src/repositories/oauth.ts
/**
 * OAuth Repository
 *
 * Data access layer for OAuth provider connections.
 */

import { and, deleteFrom, eq, insert, select, update } from '../builder/index';
import {
  type NewOAuthConnection,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  type OAuthConnection,
  type OAuthProvider,
  type UpdateOAuthConnection,
} from '../schema/index';
import { toCamelCase, toCamelCaseArray, toSnakeCase } from '../utils';

import type { RawDb } from '../client';

// ============================================================================
// OAuth Connection Repository
// ============================================================================

export interface OAuthConnectionRepository {
  findById(id: string): Promise<OAuthConnection | null>;
  findByUserIdAndProvider(userId: string, provider: OAuthProvider): Promise<OAuthConnection | null>;
  findByProviderUserId(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<OAuthConnection | null>;
  findByUserId(userId: string): Promise<OAuthConnection[]>;
  create(connection: NewOAuthConnection): Promise<OAuthConnection>;
  update(id: string, data: UpdateOAuthConnection): Promise<OAuthConnection | null>;
  delete(id: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  deleteByUserIdAndProvider(userId: string, provider: OAuthProvider): Promise<boolean>;
}

/**
 * Create an OAuth connection repository
 */
export function createOAuthConnectionRepository(db: RawDb): OAuthConnectionRepository {
  return {
    async findById(id: string): Promise<OAuthConnection | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(OAUTH_CONNECTIONS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null ? toCamelCase<OAuthConnection>(result, OAUTH_CONNECTION_COLUMNS) : null;
    },

    async findByUserIdAndProvider(
      userId: string,
      provider: OAuthProvider,
    ): Promise<OAuthConnection | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(OAUTH_CONNECTIONS_TABLE)
          .where(and(eq('user_id', userId), eq('provider', provider)))
          .toSql(),
      );
      return result !== null ? toCamelCase<OAuthConnection>(result, OAUTH_CONNECTION_COLUMNS) : null;
    },

    async findByProviderUserId(
      provider: OAuthProvider,
      providerUserId: string,
    ): Promise<OAuthConnection | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(OAUTH_CONNECTIONS_TABLE)
          .where(and(eq('provider', provider), eq('provider_user_id', providerUserId)))
          .toSql(),
      );
      return result !== null ? toCamelCase<OAuthConnection>(result, OAUTH_CONNECTION_COLUMNS) : null;
    },

    async findByUserId(userId: string): Promise<OAuthConnection[]> {
      const results = await db.query<Record<string, unknown>>(
        select(OAUTH_CONNECTIONS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return toCamelCaseArray<OAuthConnection>(results, OAUTH_CONNECTION_COLUMNS);
    },

    async create(connection: NewOAuthConnection): Promise<OAuthConnection> {
      const snakeData = toSnakeCase(
        connection as unknown as Record<string, unknown>,
        OAUTH_CONNECTION_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(OAUTH_CONNECTIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create OAuth connection');
      }
      return toCamelCase<OAuthConnection>(result, OAUTH_CONNECTION_COLUMNS);
    },

    async update(id: string, data: UpdateOAuthConnection): Promise<OAuthConnection | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        OAUTH_CONNECTION_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        update(OAUTH_CONNECTIONS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? toCamelCase<OAuthConnection>(result, OAUTH_CONNECTION_COLUMNS) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(OAUTH_CONNECTIONS_TABLE).where(eq('id', id)).toSql(),
      );
      return count > 0;
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(OAUTH_CONNECTIONS_TABLE).where(eq('user_id', userId)).toSql());
    },

    async deleteByUserIdAndProvider(userId: string, provider: OAuthProvider): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(OAUTH_CONNECTIONS_TABLE)
          .where(and(eq('user_id', userId), eq('provider', provider)))
          .toSql(),
      );
      return count > 0;
    },
  };
}
