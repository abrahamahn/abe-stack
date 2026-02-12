// src/server/core/src/users/types.ts
/**
 * Users Module Types
 *
 * Dependency interface and shared types for the users module.
 * The server provides these dependencies when registering the users module.
 *
 * Uses shared context contracts from `@abe-stack/shared` to eliminate
 * duplicate Logger and request interfaces across packages.
 *
 * @module types
 */

import { ERROR_MESSAGES as SHARED_ERRORS } from '@abe-stack/shared';

import type { DbClient, Repositories } from '@abe-stack/db';
import type { CacheProvider } from '@abe-stack/shared';
import type { Argon2Config } from '@abe-stack/shared/config';
import type {
  BaseContext,
  RequestContext,
  RequestInfo,
  ServerLogger,
  StorageService,
} from '@abe-stack/shared/core';

// ============================================================================
// Auth Config Subset
// ============================================================================

/**
 * Argon2 hashing configuration subset needed by users module
 * for password change operations.
 * All properties are required to match Argon2Config from shared.
 *
 * @complexity O(1) constant access
 */
export type UsersArgon2Config = Argon2Config;

/**
 * Auth configuration subset needed by users module.
 * Only includes argon2 config for password hashing.
 *
 * @complexity O(1) constant access
 */
export interface UsersAuthConfig {
  /** Argon2 hashing configuration */
  readonly argon2: UsersArgon2Config;
}

// ============================================================================
// Request Types (Transition Aliases)
// ============================================================================

/**
 * Request info extracted by middleware.
 *
 * Transition alias for `RequestInfo` from `@abe-stack/shared`.
 * New code should import `RequestInfo` from `@abe-stack/shared` directly.
 *
 * @complexity O(1) constant access
 */
export type UsersRequestInfo = RequestInfo;

/**
 * Request with cookie support and auth context.
 *
 * Transition alias for `RequestContext` from `@abe-stack/shared`.
 * New code should import `RequestContext` from `@abe-stack/shared` directly.
 *
 * @complexity O(1) constant access
 */
export type UsersRequest = RequestContext;

// ============================================================================
// Users Module Dependencies
// ============================================================================

/**
 * Users module dependencies.
 * These are provided by the server composition root.
 *
 * Extends `BaseContext` with storage and config.
 *
 * @example
 * ```typescript
 * const deps: UsersModuleDeps = {
 *   repos: createRepositories(db),
 *   log: createLogger('users'),
 *   storage: createStorage(storageConfig),
 *   config: { auth: { argon2: authConfig.argon2 } },
 * };
 * ```
 */
export interface UsersModuleDeps extends Omit<BaseContext, 'db'> {
  /** Database client for transaction support (password change, etc.) */
  readonly db: DbClient;
  /** Repository layer for structured database access */
  readonly repos: Repositories;
  /** Logger instance for users module logging */
  readonly log: ServerLogger;
  /** Storage service for avatar uploads */
  readonly storage: StorageService;
  /** Cache provider for performance optimization */
  readonly cache?: CacheProvider | undefined;
  /** Application configuration subset needed by users */
  readonly config: {
    readonly auth: UsersAuthConfig;
  };
}

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Standardized error messages for users operations.
 *
 * @complexity O(1) constant access
 */
export const ERROR_MESSAGES = {
  /** Generic internal error message */
  INTERNAL_ERROR: SHARED_ERRORS.INTERNAL_ERROR,
  /** User not found error message */
  USER_NOT_FOUND: 'User not found',
  /** Unauthorized error message */
  UNAUTHORIZED: SHARED_ERRORS.UNAUTHORIZED,
} as const;
