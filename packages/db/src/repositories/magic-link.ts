// packages/db/src/repositories/magic-link.ts
/**
 * Magic Link Repository
 *
 * Data access layer for magic link authentication tokens.
 */

import { and, eq, gt, isNull, lt, select, insert, update, deleteFrom, raw } from '../builder';
import {
  MAGIC_LINK_TOKEN_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
  type MagicLinkToken,
  type NewMagicLinkToken,
} from '../schema';
import { toCamelCase, toCamelCaseArray, toSnakeCase } from '../utils';

import type { RawDb } from '../client';

// ============================================================================
// Magic Link Token Repository
// ============================================================================

export interface MagicLinkTokenRepository {
  findById(id: string): Promise<MagicLinkToken | null>;
  findValidByTokenHash(tokenHash: string): Promise<MagicLinkToken | null>;
  findValidByEmail(email: string): Promise<MagicLinkToken | null>;
  findRecentByEmail(email: string, since: Date): Promise<MagicLinkToken[]>;
  create(token: NewMagicLinkToken): Promise<MagicLinkToken>;
  markAsUsed(id: string): Promise<void>;
  deleteByEmail(email: string): Promise<number>;
  deleteExpired(): Promise<number>;
  countRecentByEmail(email: string, since: Date): Promise<number>;
  countRecentByIp(ipAddress: string, since: Date): Promise<number>;
}

/**
 * Create a magic link token repository
 */
export function createMagicLinkTokenRepository(db: RawDb): MagicLinkTokenRepository {
  return {
    async findById(id: string): Promise<MagicLinkToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(MAGIC_LINK_TOKENS_TABLE).where(eq('id', id)).toSql(),
      );
      return result ? toCamelCase<MagicLinkToken>(result, MAGIC_LINK_TOKEN_COLUMNS) : null;
    },

    async findValidByTokenHash(tokenHash: string): Promise<MagicLinkToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .where(and(eq('token_hash', tokenHash), gt('expires_at', new Date()), isNull('used_at')))
          .toSql(),
      );
      return result ? toCamelCase<MagicLinkToken>(result, MAGIC_LINK_TOKEN_COLUMNS) : null;
    },

    async findValidByEmail(email: string): Promise<MagicLinkToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .where(and(eq('email', email), gt('expires_at', new Date()), isNull('used_at')))
          .orderBy('created_at', 'desc')
          .limit(1)
          .toSql(),
      );
      return result ? toCamelCase<MagicLinkToken>(result, MAGIC_LINK_TOKEN_COLUMNS) : null;
    },

    async findRecentByEmail(email: string, since: Date): Promise<MagicLinkToken[]> {
      const results = await db.query<Record<string, unknown>>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .where(and(eq('email', email), gt('created_at', since)))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return toCamelCaseArray<MagicLinkToken>(results, MAGIC_LINK_TOKEN_COLUMNS);
    },

    async create(token: NewMagicLinkToken): Promise<MagicLinkToken> {
      const snakeData = toSnakeCase(
        token as unknown as Record<string, unknown>,
        MAGIC_LINK_TOKEN_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(MAGIC_LINK_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (!result) {
        throw new Error('Failed to create magic link token');
      }
      return toCamelCase<MagicLinkToken>(result, MAGIC_LINK_TOKEN_COLUMNS);
    },

    async markAsUsed(id: string): Promise<void> {
      await db.execute(
        update(MAGIC_LINK_TOKENS_TABLE).set({ used_at: new Date() }).where(eq('id', id)).toSql(),
      );
    },

    async deleteByEmail(email: string): Promise<number> {
      return db.execute(deleteFrom(MAGIC_LINK_TOKENS_TABLE).where(eq('email', email)).toSql());
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(MAGIC_LINK_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql(),
      );
    },

    async countRecentByEmail(email: string, since: Date): Promise<number> {
      const result = await db.queryOne<{ count: string }>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .columns()
          .column(raw('COUNT(*)'), 'count')
          .where(and(eq('email', email), gt('created_at', since)))
          .toSql(),
      );
      return result ? parseInt(result.count, 10) : 0;
    },

    async countRecentByIp(ipAddress: string, since: Date): Promise<number> {
      const result = await db.queryOne<{ count: string }>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .columns()
          .column(raw('COUNT(*)'), 'count')
          .where(and(eq('ip_address', ipAddress), gt('created_at', since)))
          .toSql(),
      );
      return result ? parseInt(result.count, 10) : 0;
    },
  };
}
