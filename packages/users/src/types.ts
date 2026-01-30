// packages/users/src/types.ts
/**
 * Users Module Types
 *
 * Dependency interface and shared types for the users module.
 * The server provides these dependencies when registering the users module.
 *
 * Uses shared context contracts from `@abe-stack/contracts` to eliminate
 * duplicate Logger and request interfaces across packages.
 *
 * @module types
 */

import type { BaseContext, Logger, RequestContext, RequestInfo } from '@abe-stack/contracts';
import type { Repositories } from '@abe-stack/db';
import type { StorageProvider } from '@abe-stack/storage';

// ============================================================================
// Logger Interface (Transition Alias)
// ============================================================================

/**
 * Logger interface used by the users module.
 *
 * Extends the shared `Logger` contract with a required `child` method.
 * The contracts `Logger` marks `child` as optional; the users module
 * requires it for structured logging with user context bindings.
 *
 * @complexity O(1) per log call
 */
export interface UsersLogger extends Logger {
  /**
   * Create a child logger with additional bindings
   *
   * @param bindings - Key-value pairs to attach to all child log entries
   * @returns A new logger instance with the bindings
   */
  child(bindings: Record<string, unknown>): UsersLogger;
}

// ============================================================================
// Auth Config Subset
// ============================================================================

/**
 * Argon2 hashing configuration subset needed by users module
 * for password change operations.
 * All properties are required to match @abe-stack/auth Argon2Config.
 *
 * @complexity O(1) constant access
 */
export interface UsersArgon2Config {
  /** Argon2 type: 0 = argon2d, 1 = argon2i, 2 = argon2id */
  readonly type: 0 | 1 | 2;
  /** Memory cost in KiB */
  readonly memoryCost: number;
  /** Number of iterations */
  readonly timeCost: number;
  /** Degree of parallelism */
  readonly parallelism: number;
}

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
 * Transition alias for `RequestInfo` from `@abe-stack/contracts`.
 * New code should import `RequestInfo` from `@abe-stack/contracts` directly.
 *
 * @complexity O(1) constant access
 */
export type UsersRequestInfo = RequestInfo;

/**
 * Request with cookie support and auth context.
 *
 * Transition alias for `RequestContext` from `@abe-stack/contracts`.
 * New code should import `RequestContext` from `@abe-stack/contracts` directly.
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
  /** Repository layer for structured database access */
  readonly repos: Repositories;
  /** Logger instance for users module logging */
  readonly log: UsersLogger;
  /** Storage provider for avatar uploads */
  readonly storage: StorageProvider;
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
  INTERNAL_ERROR: 'Internal server error',
  /** User not found error message */
  USER_NOT_FOUND: 'User not found',
  /** Unauthorized error message */
  UNAUTHORIZED: 'Unauthorized',
} as const;
