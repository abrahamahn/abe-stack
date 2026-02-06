// backend/db/src/repositories/users/users.ts
/**
 * Users Repository (Functional)
 *
 * Data access layer for the users table.
 * Follows the functional factory pattern used by billing repositories.
 *
 * @module
 */

import {
  and,
  eq,
  escapeLikePattern,
  gt,
  ilike,
  isNotNull,
  isNull,
  or,
  rawCondition,
  select,
  selectCount,
  insert,
  update,
} from '../../builder/index';
import {
  type NewUser,
  type UpdateUser,
  type User,
  type UserRole,
  USER_COLUMNS,
  USERS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { SqlFragment } from '../../builder/index';
import type { RawDb } from '../../client';

// ============================================================================
// Admin User List Types
// ============================================================================

/**
 * User status for filtering admin user lists.
 * - 'active': email verified and not locked
 * - 'locked': locked_until is in the future
 * - 'unverified': email_verified is false
 */
export type UserStatus = 'active' | 'locked' | 'unverified';

/**
 * Database-level filter options for listing users with pagination.
 * The sortBy field uses snake_case column names matching the database schema.
 */
export interface AdminUserListFilters {
  /** Full-text search across email and name (case-insensitive) */
  search?: string | undefined;
  /** Filter by user role */
  role?: UserRole | undefined;
  /** Filter by computed user status (active, locked, unverified) */
  status?: UserStatus | undefined;
  /** Column to sort by (snake_case database column names) */
  sortBy?: 'email' | 'name' | 'created_at' | 'updated_at' | undefined;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc' | undefined;
  /** Page number (1-indexed, defaults to 1) */
  page?: number | undefined;
  /** Number of results per page (defaults to 20) */
  limit?: number | undefined;
}

/**
 * Paginated result set for user listing operations.
 * Contains the result items and pagination metadata.
 */
export interface PaginatedUserResult {
  /** Array of User records for the current page */
  items: User[];
  /** Total number of matching records across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Number of results per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

// ============================================================================
// User Repository Interface
// ============================================================================

/**
 * Functional repository for user CRUD and admin listing operations
 */
export interface UserRepository {
  /**
   * Find a user by email address
   * @param email - The email to search for
   * @returns The user or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find a user by ID
   * @param id - The user ID
   * @returns The user or null if not found
   */
  findById(id: string): Promise<User | null>;

  /**
   * Create a new user
   * @param data - The user data to insert
   * @returns The created user
   * @throws Error if insert fails
   */
  create(data: NewUser): Promise<User>;

  /**
   * Update a user by ID
   * @param id - The user ID to update
   * @param data - The fields to update
   * @returns The updated user or null if not found
   */
  update(id: string, data: UpdateUser): Promise<User | null>;

  /**
   * List users with filtering, sorting, and pagination
   * @param filters - Optional filter, sort, and pagination parameters
   * @returns Paginated result containing matching users and metadata
   * @complexity O(n) where n is the number of matching records (database-level)
   */
  listWithFilters(filters: AdminUserListFilters): Promise<PaginatedUserResult>;

  /**
   * Lock a user account until a specified date
   * @param userId - The user ID to lock
   * @param lockedUntil - The date/time when the lock expires
   * @returns void (use findById to retrieve updated user)
   */
  lockAccount(userId: string, lockedUntil: Date): Promise<void>;

  /**
   * Unlock a user account by clearing locked_until and resetting failed_login_attempts
   * @param userId - The user ID to unlock
   * @returns void (use findById to retrieve updated user)
   */
  unlockAccount(userId: string): Promise<void>;
}

// ============================================================================
// User Repository Implementation
// ============================================================================

/**
 * Transform raw database row to User type
 * @param row - Raw database row with snake_case keys
 * @returns Typed User object with camelCase keys
 * @complexity O(n) where n is number of columns
 */
function transformUser(row: Record<string, unknown>): User {
  return toCamelCase<User>(row, USER_COLUMNS);
}

/**
 * Build a WHERE clause fragment array from AdminUserListFilters.
 * Only non-empty, defined filter fields produce conditions.
 *
 * @param filters - The admin user list filters
 * @returns Array of SqlFragment conditions to combine with AND
 * @complexity O(1) - constant number of filter fields
 */
function buildFilterConditions(filters: AdminUserListFilters): SqlFragment[] {
  const conditions: SqlFragment[] = [];

  // Search: case-insensitive match on email or name
  if (filters.search !== undefined && filters.search !== '') {
    const escapedSearch = escapeLikePattern(filters.search);
    const pattern = `%${escapedSearch}%`;
    conditions.push(or(ilike('email', pattern), ilike('name', pattern)));
  }

  // Role filter
  if (filters.role !== undefined) {
    conditions.push(eq('role', filters.role));
  }

  // Status filter: maps to database column conditions
  if (filters.status !== undefined) {
    switch (filters.status) {
      case 'locked':
        conditions.push(and(isNotNull('locked_until'), gt('locked_until', new Date())));
        break;
      case 'unverified':
        conditions.push(eq('email_verified', false));
        break;
      case 'active':
        conditions.push(
          and(
            eq('email_verified', true),
            or(isNull('locked_until'), rawCondition('"locked_until" <= NOW()')),
          ),
        );
        break;
    }
  }

  return conditions;
}

/**
 * Create a user repository bound to a database connection
 * @param db - The raw database client
 * @returns UserRepository implementation
 */
export function createUserRepository(db: RawDb): UserRepository {
  return {
    async findByEmail(email: string): Promise<User | null> {
      const result = await db.queryOne(select(USERS_TABLE).where(eq('email', email)).toSql());
      return result !== null ? transformUser(result) : null;
    },

    async findById(id: string): Promise<User | null> {
      const result = await db.queryOne(select(USERS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformUser(result) : null;
    },

    async create(data: NewUser): Promise<User> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, USER_COLUMNS);
      const result = await db.queryOne(
        insert(USERS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create user');
      }
      return transformUser(result);
    },

    async update(id: string, data: UpdateUser): Promise<User | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, USER_COLUMNS);
      const result = await db.queryOne(
        update(USERS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformUser(result) : null;
    },

    async listWithFilters(filters: AdminUserListFilters): Promise<PaginatedUserResult> {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const sortBy = filters.sortBy ?? 'created_at';
      const sortOrder = filters.sortOrder ?? 'desc';
      const offset = (page - 1) * limit;

      // Build WHERE conditions from filters
      const conditions = buildFilterConditions(filters);

      // Build data query
      let dataQuery = select(USERS_TABLE);
      if (conditions.length > 0) {
        dataQuery = dataQuery.where(and(...conditions));
      }
      dataQuery = dataQuery.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

      // Build count query
      let countQuery = selectCount(USERS_TABLE);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }

      // Execute both queries
      const rows = await db.query(dataQuery.toSql());
      const countRow = await db.queryOne(countQuery.toSql());

      const total = countRow !== null ? Number(countRow['count']) : 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items: rows.map(transformUser),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    },

    async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
      await db.execute(
        update(USERS_TABLE)
          .set({ ['locked_until']: lockedUntil })
          .where(eq('id', userId))
          .toSql(),
      );
    },

    async unlockAccount(userId: string): Promise<void> {
      await db.execute(
        update(USERS_TABLE)
          .set({ ['locked_until']: null, ['failed_login_attempts']: 0 })
          .where(eq('id', userId))
          .toSql(),
      );
    },
  };
}
