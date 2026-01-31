// infra/db/src/repositories/auth.ts
/**
 * Auth Repository
 *
 * Data access layer for authentication-related tables:
 * - refresh_token_families
 * - login_attempts
 * - password_reset_tokens
 * - email_verification_tokens
 * - security_events
 */

import { and, deleteFrom, eq, gt, insert, isNull, lt, raw, select, update } from '../builder/index';
import {
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  type EmailVerificationToken,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
  type PasswordResetToken,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  type RefreshTokenFamily,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENTS_TABLE,
  type SecurityEvent,
} from '../schema/index';
import { toCamelCase, toCamelCaseArray, toSnakeCase } from '../utils';

import type { RawDb } from '../client';
import type { PaginatedResult, PaginationOptions, TimeRangeFilter } from './types';

// ============================================================================
// Refresh Token Family Repository
// ============================================================================

export interface RefreshTokenFamilyRepository {
  findById(id: string): Promise<RefreshTokenFamily | null>;
  findActiveByUserId(userId: string): Promise<RefreshTokenFamily[]>;
  create(family: NewRefreshTokenFamily): Promise<RefreshTokenFamily>;
  revoke(id: string, reason: string): Promise<void>;
  revokeAllForUser(userId: string, reason: string): Promise<number>;
}

export function createRefreshTokenFamilyRepository(db: RawDb): RefreshTokenFamilyRepository {
  return {
    async findById(id: string): Promise<RefreshTokenFamily | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(REFRESH_TOKEN_FAMILIES_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null
        ? toCamelCase<RefreshTokenFamily>(result, REFRESH_TOKEN_FAMILY_COLUMNS)
        : null;
    },

    async findActiveByUserId(userId: string): Promise<RefreshTokenFamily[]> {
      const results = await db.query<Record<string, unknown>>(
        select(REFRESH_TOKEN_FAMILIES_TABLE)
          .where(and(eq('user_id', userId), isNull('revoked_at')))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return toCamelCaseArray<RefreshTokenFamily>(results, REFRESH_TOKEN_FAMILY_COLUMNS);
    },

    async create(family: NewRefreshTokenFamily): Promise<RefreshTokenFamily> {
      const snakeData = toSnakeCase(
        family as unknown as Record<string, unknown>,
        REFRESH_TOKEN_FAMILY_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(REFRESH_TOKEN_FAMILIES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create refresh token family');
      }
      return toCamelCase<RefreshTokenFamily>(result, REFRESH_TOKEN_FAMILY_COLUMNS);
    },

    async revoke(id: string, reason: string): Promise<void> {
      await db.execute(
        update(REFRESH_TOKEN_FAMILIES_TABLE)
          .set({ ['revoked_at']: new Date(), ['revoke_reason']: reason })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async revokeAllForUser(userId: string, reason: string): Promise<number> {
      return db.execute(
        update(REFRESH_TOKEN_FAMILIES_TABLE)
          .set({ ['revoked_at']: new Date(), ['revoke_reason']: reason })
          .where(and(eq('user_id', userId), isNull('revoked_at')))
          .toSql(),
      );
    },
  };
}

// ============================================================================
// Login Attempt Repository
// ============================================================================

export interface LoginAttemptRepository {
  create(attempt: NewLoginAttempt): Promise<LoginAttempt>;
  countRecentFailures(email: string, since: Date): Promise<number>;
  findRecentByEmail(email: string, limit?: number): Promise<LoginAttempt[]>;
  deleteOlderThan(date: Date): Promise<number>;
}

export function createLoginAttemptRepository(db: RawDb): LoginAttemptRepository {
  return {
    async create(attempt: NewLoginAttempt): Promise<LoginAttempt> {
      const snakeData = toSnakeCase(
        attempt as unknown as Record<string, unknown>,
        LOGIN_ATTEMPT_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(LOGIN_ATTEMPTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create login attempt');
      }
      return toCamelCase<LoginAttempt>(result, LOGIN_ATTEMPT_COLUMNS);
    },

    async countRecentFailures(email: string, since: Date): Promise<number> {
      const result = await db.queryOne<{ count: string }>(
        select(LOGIN_ATTEMPTS_TABLE)
          .columns()
          .column(raw('COUNT(*)'), 'count')
          .where(and(eq('email', email), eq('success', false), gt('created_at', since)))
          .toSql(),
      );
      return result !== null ? parseInt(result.count, 10) : 0;
    },

    async findRecentByEmail(email: string, limit = 10): Promise<LoginAttempt[]> {
      const results = await db.query<Record<string, unknown>>(
        select(LOGIN_ATTEMPTS_TABLE)
          .where(eq('email', email))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return toCamelCaseArray<LoginAttempt>(results, LOGIN_ATTEMPT_COLUMNS);
    },

    async deleteOlderThan(date: Date): Promise<number> {
      return db.execute(deleteFrom(LOGIN_ATTEMPTS_TABLE).where(lt('created_at', date)).toSql());
    },
  };
}

// ============================================================================
// Password Reset Token Repository
// ============================================================================

export interface PasswordResetTokenRepository {
  findById(id: string): Promise<PasswordResetToken | null>;
  findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  findValidByUserId(userId: string): Promise<PasswordResetToken | null>;
  create(token: NewPasswordResetToken): Promise<PasswordResetToken>;
  markAsUsed(id: string): Promise<void>;
  invalidateByUserId(userId: string): Promise<number>;
  deleteByUserId(userId: string): Promise<number>;
  deleteExpired(): Promise<number>;
}

export function createPasswordResetTokenRepository(db: RawDb): PasswordResetTokenRepository {
  return {
    async findById(id: string): Promise<PasswordResetToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(PASSWORD_RESET_TOKENS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null
        ? toCamelCase<PasswordResetToken>(result, PASSWORD_RESET_TOKEN_COLUMNS)
        : null;
    },

    async findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(PASSWORD_RESET_TOKENS_TABLE)
          .where(and(eq('token_hash', tokenHash), gt('expires_at', new Date()), isNull('used_at')))
          .toSql(),
      );
      return result !== null
        ? toCamelCase<PasswordResetToken>(result, PASSWORD_RESET_TOKEN_COLUMNS)
        : null;
    },

    async findValidByUserId(userId: string): Promise<PasswordResetToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(PASSWORD_RESET_TOKENS_TABLE)
          .where(and(eq('user_id', userId), gt('expires_at', new Date()), isNull('used_at')))
          .orderBy('created_at', 'desc')
          .limit(1)
          .toSql(),
      );
      return result !== null
        ? toCamelCase<PasswordResetToken>(result, PASSWORD_RESET_TOKEN_COLUMNS)
        : null;
    },

    async create(token: NewPasswordResetToken): Promise<PasswordResetToken> {
      const snakeData = toSnakeCase(
        token as unknown as Record<string, unknown>,
        PASSWORD_RESET_TOKEN_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(PASSWORD_RESET_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create password reset token');
      }
      return toCamelCase<PasswordResetToken>(result, PASSWORD_RESET_TOKEN_COLUMNS);
    },

    async markAsUsed(id: string): Promise<void> {
      await db.execute(
        update(PASSWORD_RESET_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async invalidateByUserId(userId: string): Promise<number> {
      return db.execute(
        update(PASSWORD_RESET_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(and(eq('user_id', userId), isNull('used_at')))
          .toSql(),
      );
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(
        deleteFrom(PASSWORD_RESET_TOKENS_TABLE).where(eq('user_id', userId)).toSql(),
      );
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(PASSWORD_RESET_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql(),
      );
    },
  };
}

// ============================================================================
// Email Verification Token Repository
// ============================================================================

export interface EmailVerificationTokenRepository {
  findById(id: string): Promise<EmailVerificationToken | null>;
  findValidByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  findValidByUserId(userId: string): Promise<EmailVerificationToken | null>;
  create(token: NewEmailVerificationToken): Promise<EmailVerificationToken>;
  markAsUsed(id: string): Promise<void>;
  invalidateByUserId(userId: string): Promise<number>;
  deleteByUserId(userId: string): Promise<number>;
  deleteExpired(): Promise<number>;
}

export function createEmailVerificationTokenRepository(
  db: RawDb,
): EmailVerificationTokenRepository {
  return {
    async findById(id: string): Promise<EmailVerificationToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(EMAIL_VERIFICATION_TOKENS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null
        ? toCamelCase<EmailVerificationToken>(result, EMAIL_VERIFICATION_TOKEN_COLUMNS)
        : null;
    },

    async findValidByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(EMAIL_VERIFICATION_TOKENS_TABLE)
          .where(and(eq('token_hash', tokenHash), gt('expires_at', new Date()), isNull('used_at')))
          .toSql(),
      );
      return result !== null
        ? toCamelCase<EmailVerificationToken>(result, EMAIL_VERIFICATION_TOKEN_COLUMNS)
        : null;
    },

    async findValidByUserId(userId: string): Promise<EmailVerificationToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(EMAIL_VERIFICATION_TOKENS_TABLE)
          .where(and(eq('user_id', userId), gt('expires_at', new Date()), isNull('used_at')))
          .orderBy('created_at', 'desc')
          .limit(1)
          .toSql(),
      );
      return result !== null
        ? toCamelCase<EmailVerificationToken>(result, EMAIL_VERIFICATION_TOKEN_COLUMNS)
        : null;
    },

    async create(token: NewEmailVerificationToken): Promise<EmailVerificationToken> {
      const snakeData = toSnakeCase(
        token as unknown as Record<string, unknown>,
        EMAIL_VERIFICATION_TOKEN_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(EMAIL_VERIFICATION_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create email verification token');
      }
      return toCamelCase<EmailVerificationToken>(result, EMAIL_VERIFICATION_TOKEN_COLUMNS);
    },

    async markAsUsed(id: string): Promise<void> {
      await db.execute(
        update(EMAIL_VERIFICATION_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async invalidateByUserId(userId: string): Promise<number> {
      return db.execute(
        update(EMAIL_VERIFICATION_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(and(eq('user_id', userId), isNull('used_at')))
          .toSql(),
      );
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(
        deleteFrom(EMAIL_VERIFICATION_TOKENS_TABLE).where(eq('user_id', userId)).toSql(),
      );
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(EMAIL_VERIFICATION_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql(),
      );
    },
  };
}

// ============================================================================
// Security Event Repository
// ============================================================================

export interface SecurityEventRepository {
  create(event: NewSecurityEvent): Promise<SecurityEvent>;
  findByUserId(
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SecurityEvent>>;
  findByEmail(email: string, options?: PaginationOptions): Promise<PaginatedResult<SecurityEvent>>;
  findByType(eventType: string, timeRange?: TimeRangeFilter): Promise<SecurityEvent[]>;
  findBySeverity(severity: string, timeRange?: TimeRangeFilter): Promise<SecurityEvent[]>;
  countByType(eventType: string, since: Date): Promise<number>;
  deleteOlderThan(date: Date): Promise<number>;
}

export function createSecurityEventRepository(db: RawDb): SecurityEventRepository {
  return {
    async create(event: NewSecurityEvent): Promise<SecurityEvent> {
      const snakeData = toSnakeCase(
        event as unknown as Record<string, unknown>,
        SECURITY_EVENT_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(SECURITY_EVENTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create security event');
      }
      return toCamelCase<SecurityEvent>(result, SECURITY_EVENT_COLUMNS);
    },

    async findByUserId(
      userId: string,
      options: PaginationOptions = {},
    ): Promise<PaginatedResult<SecurityEvent>> {
      const { limit = 20, cursor, direction = 'desc' } = options;

      let query = select(SECURITY_EVENTS_TABLE).where(eq('user_id', userId));

      if (cursor !== undefined) {
        const cursorDate = new Date(cursor);
        query = query.where(
          direction === 'desc' ? lt('created_at', cursorDate) : gt('created_at', cursorDate),
        );
      }

      query = query.orderBy('created_at', direction).limit(limit + 1);

      const results = await db.query<Record<string, unknown>>(query.toSql());
      const items = toCamelCaseArray<SecurityEvent>(results, SECURITY_EVENT_COLUMNS);

      const hasMore = items.length > limit;
      if (hasMore) {
        items.pop();
      }

      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem !== undefined ? lastItem.createdAt.toISOString() : null;

      return { items, nextCursor };
    },

    async findByEmail(
      email: string,
      options: PaginationOptions = {},
    ): Promise<PaginatedResult<SecurityEvent>> {
      const { limit = 20, cursor, direction = 'desc' } = options;

      let query = select(SECURITY_EVENTS_TABLE).where(eq('email', email));

      if (cursor !== undefined) {
        const cursorDate = new Date(cursor);
        query = query.where(
          direction === 'desc' ? lt('created_at', cursorDate) : gt('created_at', cursorDate),
        );
      }

      query = query.orderBy('created_at', direction).limit(limit + 1);

      const results = await db.query<Record<string, unknown>>(query.toSql());
      const items = toCamelCaseArray<SecurityEvent>(results, SECURITY_EVENT_COLUMNS);

      const hasMore = items.length > limit;
      if (hasMore) {
        items.pop();
      }

      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem !== undefined ? lastItem.createdAt.toISOString() : null;

      return { items, nextCursor };
    },

    async findByType(eventType: string, timeRange?: TimeRangeFilter): Promise<SecurityEvent[]> {
      let query = select(SECURITY_EVENTS_TABLE).where(eq('event_type', eventType));

      if (timeRange?.from !== undefined) {
        query = query.where(gt('created_at', timeRange.from));
      }
      if (timeRange?.to !== undefined) {
        query = query.where(lt('created_at', timeRange.to));
      }

      query = query.orderBy('created_at', 'desc');

      const results = await db.query<Record<string, unknown>>(query.toSql());
      return toCamelCaseArray<SecurityEvent>(results, SECURITY_EVENT_COLUMNS);
    },

    async findBySeverity(severity: string, timeRange?: TimeRangeFilter): Promise<SecurityEvent[]> {
      let query = select(SECURITY_EVENTS_TABLE).where(eq('severity', severity));

      if (timeRange?.from !== undefined) {
        query = query.where(gt('created_at', timeRange.from));
      }
      if (timeRange?.to !== undefined) {
        query = query.where(lt('created_at', timeRange.to));
      }

      query = query.orderBy('created_at', 'desc');

      const results = await db.query<Record<string, unknown>>(query.toSql());
      return toCamelCaseArray<SecurityEvent>(results, SECURITY_EVENT_COLUMNS);
    },

    async countByType(eventType: string, since: Date): Promise<number> {
      const result = await db.queryOne<{ count: string }>(
        select(SECURITY_EVENTS_TABLE)
          .columns()
          .column(raw('COUNT(*)'), 'count')
          .where(and(eq('event_type', eventType), gt('created_at', since)))
          .toSql(),
      );
      return result !== null ? parseInt(result.count, 10) : 0;
    },

    async deleteOlderThan(date: Date): Promise<number> {
      return db.execute(deleteFrom(SECURITY_EVENTS_TABLE).where(lt('created_at', date)).toSql());
    },
  };
}
