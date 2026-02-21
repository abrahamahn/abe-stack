// main/server/core/src/auth/facade.ts
/**
 * Auth Facade
 *
 * Domain-level facade for authentication operations. Provides a clean,
 * single-entry-point API for each auth flow, hiding the internal wiring
 * of services, repositories, crypto utilities, and token management.
 *
 * Route handlers (and other app-layer code) should call these facade
 * methods instead of reaching into service/utils/security internals
 * directly. This keeps the HTTP layer thin and the domain boundary clear.
 *
 * **Import restriction:** Application layers (routes, handlers, controllers)
 * should consume auth functionality through this facade or the re-exports
 * in `./index.ts`. Direct imports from `./service`, `./utils`, `./security`,
 * or other internal modules are reserved for the facade implementation and
 * tests only.
 *
 * @module facade
 */

import {
  authenticateUser,
  logoutUser,
  refreshUserTokens,
  registerUser,
  requestPasswordReset,
  resetPassword,
  type AuthResult,
  type RefreshResult,
  type RegisterResult,
  type SmsChallengeResult,
  type TotpChallengeResult,
} from './service';

import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';
import type { DbClient, Repositories } from '../../../db/src';
import type { BreadcrumbData } from '@bslt/shared';
import type { AuthConfig } from '@bslt/shared/config';

// ============================================================================
// Facade Input Types
// ============================================================================

/**
 * Input for the sign-up (registration) flow.
 */
export interface SignUpInput {
  /** User email address */
  readonly email: string;
  /** Unique username (1-15 chars, alphanumeric + underscores) */
  readonly username: string;
  /** User first name */
  readonly firstName: string;
  /** User last name */
  readonly lastName: string;
  /** User password (validated for strength) */
  readonly password: string;
  /** Base URL for the verification email link */
  readonly baseUrl: string;
  /** Whether the user accepted Terms of Service */
  readonly tosAccepted?: boolean;
  /** Client IP address */
  readonly ipAddress?: string;
  /** Client user agent string */
  readonly userAgent?: string;
}

/**
 * Input for the sign-in (login) flow.
 */
export interface SignInInput {
  /** Email address or username (auto-detected via '@') */
  readonly identifier: string;
  /** User password */
  readonly password: string;
  /** Client IP address */
  readonly ipAddress?: string;
  /** Client user agent string */
  readonly userAgent?: string;
  /** Optional callback for password rehash events */
  readonly onPasswordRehash?: (userId: string, error?: Error) => void;
  /** Optional error tracker for breadcrumbs */
  readonly errorTracker?: { addBreadcrumb: (m: string, d: BreadcrumbData) => void };
}

/**
 * Input for the token refresh flow.
 */
export interface RefreshInput {
  /** Current (old) refresh token */
  readonly refreshToken: string;
  /** Client IP address */
  readonly ipAddress?: string;
  /** Client user agent string */
  readonly userAgent?: string;
}

/**
 * Input for the sign-out (logout) flow.
 */
export interface SignOutInput {
  /** Refresh token to revoke (if available) */
  readonly refreshToken?: string;
}

/**
 * Input for the forgot-password flow.
 */
export interface ForgotPasswordInput {
  /** User email address */
  readonly email: string;
  /** Base URL for the reset link */
  readonly baseUrl: string;
}

/**
 * Input for the reset-password flow.
 */
export interface ResetPasswordInput {
  /** Password reset token (from the email link) */
  readonly token: string;
  /** New password (validated for strength) */
  readonly password: string;
}

// ============================================================================
// Facade Result Types
// ============================================================================

/** Result of a successful sign-up. Re-exported from service for convenience. */
export type SignUpResult = RegisterResult;

/**
 * Result of a successful sign-in.
 * May be a full auth result, a TOTP challenge, or an SMS challenge.
 */
export type SignInResult = AuthResult | TotpChallengeResult | SmsChallengeResult;

/** Result of a successful token refresh. Re-exported from service. */
export { type RefreshResult } from './service';

// ============================================================================
// Facade Interface
// ============================================================================

/**
 * Auth facade interface.
 *
 * Each method maps to a single auth flow and encapsulates all
 * orchestration logic (validation, service calls, side effects).
 * Crypto, token, and DB internals stay behind this boundary.
 */
export interface AuthFacade {
  /**
   * Register a new user.
   * Creates the user with an unverified email and sends a verification email.
   *
   * @param input - Sign-up input data
   * @returns Registration result (pending verification)
   * @throws {WeakPasswordError} If password is too weak
   * @throws {EmailSendError} If verification email fails to send
   * @throws {Error} With name 'ConflictError' if username is taken
   */
  signUp(input: SignUpInput): Promise<SignUpResult>;

  /**
   * Authenticate a user with identifier (email or username) and password.
   *
   * @param input - Sign-in input data
   * @returns Auth result with tokens, or a 2FA challenge
   * @throws {AccountLockedError} If account is locked
   * @throws {InvalidCredentialsError} If credentials are invalid
   * @throws {EmailNotVerifiedError} If email is not verified
   */
  signIn(input: SignInInput): Promise<SignInResult>;

  /**
   * Refresh an access token using a valid refresh token.
   *
   * @param input - Refresh input data
   * @returns New access + refresh token pair
   * @throws {InvalidTokenError} If the refresh token is invalid or expired
   */
  refresh(input: RefreshInput): Promise<RefreshResult>;

  /**
   * Sign out by revoking the refresh token.
   *
   * @param input - Sign-out input data (optional refresh token)
   */
  signOut(input: SignOutInput): Promise<void>;

  /**
   * Request a password reset email.
   * Always completes without error to prevent user enumeration.
   *
   * @param input - Forgot-password input data
   * @throws {EmailSendError} If the email fails to send
   */
  forgotPassword(input: ForgotPasswordInput): Promise<void>;

  /**
   * Reset a user's password using a valid reset token.
   *
   * @param input - Reset-password input data
   * @returns The email address of the user whose password was reset
   * @throws {InvalidTokenError} If the token is invalid or expired
   * @throws {WeakPasswordError} If the new password is too weak
   */
  resetPassword(input: ResetPasswordInput): Promise<string>;
}

// ============================================================================
// Facade Dependencies
// ============================================================================

/**
 * Dependencies required to construct the auth facade.
 * These are the same services the handlers currently wire up manually.
 */
export interface AuthFacadeDeps {
  /** Database client for queries and transactions */
  readonly db: DbClient;
  /** Repository layer for structured database access */
  readonly repos: Repositories;
  /** Auth configuration (JWT, refresh token, argon2, lockout, etc.) */
  readonly config: AuthConfig;
  /** Logger instance */
  readonly logger: AuthLogger;
  /** Email service for sending auth-related emails */
  readonly email: AuthEmailService;
  /** Email templates for auth-related emails */
  readonly emailTemplates: AuthEmailTemplates;
}

// ============================================================================
// Facade Implementation
// ============================================================================

/**
 * Create an auth facade instance.
 *
 * The facade delegates to the existing service functions, passing through
 * the injected dependencies. This is a thin orchestration layer -- all
 * business logic remains in `./service.ts`.
 *
 * @param deps - Auth facade dependencies
 * @returns An AuthFacade instance
 * @complexity O(1) construction; each method is O(1) (constant DB operations)
 *
 * @example
 * ```typescript
 * const auth = createAuthFacade({
 *   db, repos, config: config.auth,
 *   logger, email, emailTemplates,
 * });
 *
 * // In a route handler:
 * const result = await auth.signUp({
 *   email: 'user@example.com',
 *   username: 'alice',
 *   firstName: 'Alice',
 *   lastName: 'Smith',
 *   password: 'SecureP@ss1!',
 *   baseUrl: 'https://app.example.com',
 * });
 * ```
 */
export function createAuthFacade(deps: AuthFacadeDeps): AuthFacade {
  const { db, repos, config, logger, email, emailTemplates } = deps;

  return {
    async signUp(input: SignUpInput): Promise<SignUpResult> {
      const options: {
        tosAccepted?: boolean;
        ipAddress?: string;
        userAgent?: string;
      } = {};
      if (input.tosAccepted !== undefined) {
        options.tosAccepted = input.tosAccepted;
      }
      if (input.ipAddress !== undefined) {
        options.ipAddress = input.ipAddress;
      }
      if (input.userAgent !== undefined) {
        options.userAgent = input.userAgent;
      }

      return registerUser(
        db,
        repos,
        email,
        emailTemplates,
        config,
        input.email,
        input.password,
        input.username,
        input.firstName,
        input.lastName,
        input.baseUrl,
        options,
      );
    },

    async signIn(input: SignInInput): Promise<SignInResult> {
      return authenticateUser(
        db,
        repos,
        config,
        input.identifier,
        input.password,
        logger,
        input.ipAddress,
        input.userAgent,
        input.onPasswordRehash,
        input.errorTracker,
      );
    },

    async refresh(input: RefreshInput): Promise<RefreshResult> {
      return refreshUserTokens(
        db,
        repos,
        config,
        input.refreshToken,
        input.ipAddress,
        input.userAgent,
      );
    },

    async signOut(input: SignOutInput): Promise<void> {
      return logoutUser(db, repos, input.refreshToken);
    },

    async forgotPassword(input: ForgotPasswordInput): Promise<void> {
      return requestPasswordReset(db, repos, email, emailTemplates, input.email, input.baseUrl);
    },

    async resetPassword(input: ResetPasswordInput): Promise<string> {
      return resetPassword(db, repos, config, input.token, input.password);
    },
  };
}
