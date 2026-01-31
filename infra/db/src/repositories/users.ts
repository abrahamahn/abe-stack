// infra/db/src/repositories/users.ts
/**
 * User Repository
 *
 * Data access layer for users and refresh_tokens tables.
 */

import {
  and,
  deleteFrom,
  eq,
  gt,
  ilike,
  insert,
  isNull,
  lt,
  or,
  select,
  selectCount,
  type SqlFragment,
  update,
} from '../builder/index';
import {
  type NewRefreshToken,
  type NewUser,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKENS_TABLE,
  type RefreshToken,
  type UpdateUser,
  USER_COLUMNS,
  type User,
  type UserRole,
  USERS_TABLE,
} from '../schema/index';
import { toCamelCase, toCamelCaseArray, toSnakeCase } from '../utils';

import type { RawDb } from '../client';
import type { PaginatedResult, PaginationOptions } from './types';

// ============================================================================
// Admin User List Filter Types
// ============================================================================

/**
 * User status for admin filtering
 */
export type UserStatusFilter = 'active' | 'locked' | 'unverified';

/**
 * Filter options for admin user listing
 */
export interface AdminUserListFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatusFilter;
  sortBy?: 'email' | 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Result for offset-based paginated queries
 */
export interface OffsetPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// User Repository
// ============================================================================

export interface UserRepository {
  // Basic CRUD
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  update(id: string, data: UpdateUser): Promise<User | null>;
  updateWithVersion(id: string, data: UpdateUser, expectedVersion: number): Promise<User | null>;
  delete(id: string): Promise<boolean>;

  // Queries
  list(options?: PaginationOptions): Promise<PaginatedResult<User>>;
  listWithFilters(filters?: AdminUserListFilters): Promise<OffsetPaginatedResult<User>>;
  existsByEmail(email: string): Promise<boolean>;

  // Account lockout
  incrementFailedAttempts(id: string): Promise<void>;
  resetFailedAttempts(id: string): Promise<void>;
  lockAccount(id: string, until: Date): Promise<void>;
  unlockAccount(id: string): Promise<void>;

  // Email verification
  verifyEmail(id: string): Promise<void>;
}

/**
 * Create a user repository
 */
export function createUserRepository(db: RawDb): UserRepository {
  return {
    async findById(id: string): Promise<User | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(USERS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null ? toCamelCase<User>(result, USER_COLUMNS) : null;
    },

    async findByEmail(email: string): Promise<User | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(USERS_TABLE).where(eq('email', email)).toSql(),
      );
      return result !== null ? toCamelCase<User>(result, USER_COLUMNS) : null;
    },

    async create(user: NewUser): Promise<User> {
      const snakeData = toSnakeCase(user as unknown as Record<string, unknown>, USER_COLUMNS);
      const result = await db.queryOne<Record<string, unknown>>(
        insert(USERS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create user');
      }
      return toCamelCase<User>(result, USER_COLUMNS);
    },

    async update(id: string, data: UpdateUser): Promise<User | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, USER_COLUMNS);
      const result = await db.queryOne<Record<string, unknown>>(
        update(USERS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? toCamelCase<User>(result, USER_COLUMNS) : null;
    },

    async updateWithVersion(
      id: string,
      data: UpdateUser,
      expectedVersion: number,
    ): Promise<User | null> {
      const snakeData = toSnakeCase(
        { ...data, version: expectedVersion + 1 } as unknown as Record<string, unknown>,
        USER_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        update(USERS_TABLE)
          .set(snakeData)
          .where(and(eq('id', id), eq('version', expectedVersion)))
          .returningAll()
          .toSql(),
      );
      return result !== null ? toCamelCase<User>(result, USER_COLUMNS) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(USERS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async list(options: PaginationOptions = {}): Promise<PaginatedResult<User>> {
      const { limit = 20, cursor, direction = 'desc', sortBy = 'created_at' } = options;

      // Build query with cursor-based pagination
      let query = select(USERS_TABLE);

      if (cursor !== undefined) {
        // Cursor format: "timestamp_id" for tie-breaking
        const parts = cursor.split('_');
        const cursorValue = parts[0];
        const cursorId = parts[1];

        if (
          cursorValue !== undefined &&
          cursorValue !== '' &&
          cursorId !== undefined &&
          cursorId !== ''
        ) {
          const cursorDate = new Date(cursorValue);
          if (direction === 'desc') {
            query = query.where(
              or(lt(sortBy, cursorDate), and(eq(sortBy, cursorDate), lt('id', cursorId))),
            );
          } else {
            query = query.where(
              or(gt(sortBy, cursorDate), and(eq(sortBy, cursorDate), gt('id', cursorId))),
            );
          }
        }
      }

      query = query
        .orderBy(sortBy, direction)
        .orderBy('id', direction)
        .limit(limit + 1); // Fetch one extra to check for more

      const results = await db.query<Record<string, unknown>>(query.toSql());
      const items = toCamelCaseArray<User>(results, USER_COLUMNS);

      const hasMore = items.length > limit;
      if (hasMore) {
        items.pop(); // Remove the extra item
      }

      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem !== undefined
          ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
          : null;

      return { items, nextCursor };
    },

    async existsByEmail(email: string): Promise<boolean> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(USERS_TABLE).columns('1 as exists').where(eq('email', email)).limit(1).toSql(),
      );
      return result !== null;
    },

    async listWithFilters(
      filters: AdminUserListFilters = {},
    ): Promise<OffsetPaginatedResult<User>> {
      const {
        search,
        role,
        status,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = filters;

      // Build WHERE conditions
      const conditions = [];

      // Search filter (email or name)
      if (search !== undefined && search !== '') {
        const searchPattern = `%${search}%`;
        conditions.push(or(ilike('email', searchPattern), ilike('name', searchPattern)));
      }

      // Role filter
      if (role !== undefined) {
        conditions.push(eq('role', role));
      }

      // Status filter
      if (status !== undefined) {
        const now = new Date();
        switch (status) {
          case 'locked':
            conditions.push(gt('locked_until', now));
            break;
          case 'unverified':
            conditions.push(eq('email_verified', false));
            break;
          case 'active':
            // Active = not locked AND email verified
            conditions.push(
              and(or(isNull('locked_until'), lt('locked_until', now)), eq('email_verified', true)),
            );
            break;
        }
      }

      // Build the main query
      let query = select(USERS_TABLE);
      let countQuery = selectCount(USERS_TABLE);

      // Apply conditions
      if (conditions.length > 0) {
        const firstCondition = conditions[0] as SqlFragment;
        const whereClause = conditions.length === 1 ? firstCondition : and(...conditions);
        query = query.where(whereClause);
        countQuery = countQuery.where(whereClause);
      }

      // Apply sorting and pagination
      query = query
        .orderBy(sortBy, sortOrder)
        .orderBy('id', sortOrder)
        .limit(limit)
        .offset((page - 1) * limit);

      // Execute queries
      const [results, countResult] = await Promise.all([
        db.query<Record<string, unknown>>(query.toSql()),
        db.queryOne<{ count: string | number }>(countQuery.toSql()),
      ]);

      const items = toCamelCaseArray<User>(results, USER_COLUMNS);
      const total = countResult !== null ? Number(countResult.count) : 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    },

    async incrementFailedAttempts(id: string): Promise<void> {
      await db.execute(
        update(USERS_TABLE).increment('failed_login_attempts').where(eq('id', id)).toSql(),
      );
    },

    async resetFailedAttempts(id: string): Promise<void> {
      await db.execute(
        update(USERS_TABLE)
          .set({ ['failed_login_attempts']: 0, ['locked_until']: null })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async lockAccount(id: string, until: Date): Promise<void> {
      await db.execute(
        update(USERS_TABLE).set({ ['locked_until']: until }).where(eq('id', id)).toSql(),
      );
    },

    async unlockAccount(id: string): Promise<void> {
      await db.execute(
        update(USERS_TABLE)
          .set({ ['locked_until']: null, ['failed_login_attempts']: 0 })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async verifyEmail(id: string): Promise<void> {
      await db.execute(
        update(USERS_TABLE)
          .set({
            ['email_verified']: true,
            ['email_verified_at']: new Date(),
          })
          .where(eq('id', id))
          .toSql(),
      );
    },
  };
}

// ============================================================================
// Refresh Token Repository
// ============================================================================

export interface RefreshTokenRepository {
  findById(id: string): Promise<RefreshToken | null>;
  findByToken(token: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  create(token: NewRefreshToken): Promise<RefreshToken>;
  delete(id: string): Promise<boolean>;
  deleteByToken(token: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  deleteByFamilyId(familyId: string): Promise<number>;
  deleteExpired(): Promise<number>;
}

/**
 * Create a refresh token repository
 */
export function createRefreshTokenRepository(db: RawDb): RefreshTokenRepository {
  return {
    async findById(id: string): Promise<RefreshToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(REFRESH_TOKENS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null ? toCamelCase<RefreshToken>(result, REFRESH_TOKEN_COLUMNS) : null;
    },

    async findByToken(token: string): Promise<RefreshToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(REFRESH_TOKENS_TABLE).where(eq('token', token)).toSql(),
      );
      return result !== null ? toCamelCase<RefreshToken>(result, REFRESH_TOKEN_COLUMNS) : null;
    },

    async findByUserId(userId: string): Promise<RefreshToken[]> {
      const results = await db.query<Record<string, unknown>>(
        select(REFRESH_TOKENS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return toCamelCaseArray<RefreshToken>(results, REFRESH_TOKEN_COLUMNS);
    },

    async create(token: NewRefreshToken): Promise<RefreshToken> {
      const snakeData = toSnakeCase(
        token as unknown as Record<string, unknown>,
        REFRESH_TOKEN_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(REFRESH_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create refresh token');
      }
      return toCamelCase<RefreshToken>(result, REFRESH_TOKEN_COLUMNS);
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async deleteByToken(token: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(REFRESH_TOKENS_TABLE).where(eq('token', token)).toSql(),
      );
      return count > 0;
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('user_id', userId)).toSql());
    },

    async deleteByFamilyId(familyId: string): Promise<number> {
      return db.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('family_id', familyId)).toSql());
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(REFRESH_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql(),
      );
    },
  };
}
