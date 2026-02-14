// main/server/db/src/repositories/oauth/oauth-connections.ts
/**
 * OAuth Connections Repository (Functional)
 *
 * Data access layer for the oauth_connections table.
 * Links external OAuth provider accounts to local users.
 *
 * @module
 */

import { and, eq, isNotNull, lt, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewOAuthConnection,
  type OAuthConnection,
  type UpdateOAuthConnection,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// OAuth Connection Repository Interface
// ============================================================================

/**
 * Functional repository for OAuth connection operations
 */
export interface OAuthConnectionRepository {
  /**
   * Find a connection by provider and provider user ID
   * @param provider - The OAuth provider name
   * @param providerUserId - The user ID from the provider
   * @returns The connection or null if not found
   */
  findByProviderUserId(provider: string, providerUserId: string): Promise<OAuthConnection | null>;

  /**
   * Find a connection by user ID and provider
   * @param userId - The local user ID
   * @param provider - The OAuth provider name
   * @returns The connection or null if not found
   */
  findByUserIdAndProvider(userId: string, provider: string): Promise<OAuthConnection | null>;

  /**
   * Find all connections for a user
   * @param userId - The local user ID
   * @returns Array of OAuth connections
   */
  findByUserId(userId: string): Promise<OAuthConnection[]>;

  /**
   * Create a new OAuth connection
   * @param data - The connection data to insert
   * @returns The created connection
   * @throws Error if insert fails
   */
  create(data: NewOAuthConnection): Promise<OAuthConnection>;

  /**
   * Update an OAuth connection
   * @param id - The connection ID to update
   * @param data - The fields to update
   * @returns The updated connection or null if not found
   */
  update(id: string, data: UpdateOAuthConnection): Promise<OAuthConnection | null>;

  /**
   * Delete a connection by user ID and provider
   * @param userId - The local user ID
   * @param provider - The OAuth provider name
   * @returns True if a connection was deleted
   */
  deleteByUserIdAndProvider(userId: string, provider: string): Promise<boolean>;

  /**
   * Find connections with tokens expiring before the given date that have a refresh token.
   * Used by the OAuth refresh cron to proactively renew expiring tokens.
   * @param before - Expiry threshold date
   * @returns Array of OAuth connections with expiring tokens
   */
  findExpiringSoon(before: Date): Promise<OAuthConnection[]>;
}

// ============================================================================
// OAuth Connection Repository Implementation
// ============================================================================

/**
 * Transform raw database row to OAuthConnection type
 * @param row - Raw database row with snake_case keys
 * @returns Typed OAuthConnection object
 * @complexity O(n) where n is number of columns
 */
function transformConnection(row: Record<string, unknown>): OAuthConnection {
  return toCamelCase<OAuthConnection>(row, OAUTH_CONNECTION_COLUMNS);
}

/**
 * Create an OAuth connection repository bound to a database connection
 * @param db - The raw database client
 * @returns OAuthConnectionRepository implementation
 */
export function createOAuthConnectionRepository(db: RawDb): OAuthConnectionRepository {
  return {
    async findByProviderUserId(
      provider: string,
      providerUserId: string,
    ): Promise<OAuthConnection | null> {
      const result = await db.queryOne(
        select(OAUTH_CONNECTIONS_TABLE)
          .where(and(eq('provider', provider), eq('provider_user_id', providerUserId)))
          .toSql(),
      );
      return result !== null ? transformConnection(result) : null;
    },

    async findByUserIdAndProvider(
      userId: string,
      provider: string,
    ): Promise<OAuthConnection | null> {
      const result = await db.queryOne(
        select(OAUTH_CONNECTIONS_TABLE)
          .where(and(eq('user_id', userId), eq('provider', provider)))
          .toSql(),
      );
      return result !== null ? transformConnection(result) : null;
    },

    async findByUserId(userId: string): Promise<OAuthConnection[]> {
      const results = await db.query(
        select(OAUTH_CONNECTIONS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformConnection);
    },

    async create(data: NewOAuthConnection): Promise<OAuthConnection> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        OAUTH_CONNECTION_COLUMNS,
      );
      const result = await db.queryOne(
        insert(OAUTH_CONNECTIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create OAuth connection');
      }
      return transformConnection(result);
    },

    async update(id: string, data: UpdateOAuthConnection): Promise<OAuthConnection | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        OAUTH_CONNECTION_COLUMNS,
      );
      const result = await db.queryOne(
        update(OAUTH_CONNECTIONS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformConnection(result) : null;
    },

    async deleteByUserIdAndProvider(userId: string, provider: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(OAUTH_CONNECTIONS_TABLE)
          .where(and(eq('user_id', userId), eq('provider', provider)))
          .toSql(),
      );
      return count > 0;
    },

    async findExpiringSoon(before: Date): Promise<OAuthConnection[]> {
      const results = await db.query(
        select(OAUTH_CONNECTIONS_TABLE)
          .where(and(lt('expires_at', before), isNotNull('refresh_token')))
          .toSql(),
      );
      return results.map(transformConnection);
    },
  };
}
