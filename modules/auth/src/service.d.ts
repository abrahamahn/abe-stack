/**
 * Auth Service
 *
 * Pure business logic for authentication operations.
 * No HTTP awareness - returns domain objects or throws errors.
 *
 * @module service
 */
import { type AuthConfig, type UserRole } from '@abe-stack/core';
import { type DbClient, type Repositories } from '@abe-stack/db';
import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';
/**
 * Authentication result returned after successful login.
 */
export interface AuthResult {
    /** JWT access token */
    accessToken: string;
    /** Opaque refresh token */
    refreshToken: string;
    /** Authenticated user data */
    user: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: UserRole;
        createdAt: string;
    };
}
/**
 * Token refresh result.
 */
export interface RefreshResult {
    /** New JWT access token */
    accessToken: string;
    /** New opaque refresh token */
    refreshToken: string;
}
/**
 * Registration result (pending email verification).
 */
export interface RegisterResult {
    /** Always 'pending_verification' */
    status: 'pending_verification';
    /** Human-readable message */
    message: string;
    /** Registered email address */
    email: string;
}
/**
 * Register a new user.
 * Creates user with unverified email and sends verification email.
 * Returns pending status, user must verify email to complete registration.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param emailService - Email service
 * @param emailTemplates - Email templates
 * @param config - Auth configuration
 * @param email - User email
 * @param password - User password
 * @param name - Optional user name
 * @param baseUrl - Base URL for verification link
 * @returns Registration result
 * @throws {WeakPasswordError} If password is too weak
 * @throws {EmailSendError} If verification email fails
 * @complexity O(1) - constant database operations
 */
export declare function registerUser(db: DbClient, repos: Repositories, emailService: AuthEmailService, emailTemplates: AuthEmailTemplates, config: AuthConfig, email: string, password: string, name?: string, baseUrl?: string): Promise<RegisterResult>;
/**
 * Authenticate a user with email and password.
 * Returns auth result with tokens, throws on failure.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param email - User email
 * @param password - User password
 * @param logger - Logger instance
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @param onPasswordRehash - Callback for password rehash events
 * @returns Authentication result
 * @throws {AccountLockedError} If account is locked
 * @throws {InvalidCredentialsError} If credentials are invalid
 * @throws {EmailNotVerifiedError} If email is not verified
 * @complexity O(1) - constant database operations
 */
export declare function authenticateUser(db: DbClient, repos: Repositories, config: AuthConfig, email: string, password: string, logger: AuthLogger, ipAddress?: string, userAgent?: string, onPasswordRehash?: (userId: string, error?: Error) => void): Promise<AuthResult>;
/**
 * Refresh tokens using a valid refresh token.
 * Returns new tokens, throws if invalid.
 *
 * @param db - Database client
 * @param _repos - Repositories (unused, kept for interface consistency)
 * @param config - Auth configuration
 * @param oldRefreshToken - Current refresh token
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns New token pair
 * @throws {InvalidTokenError} If refresh token is invalid
 * @complexity O(1) - constant database operations
 */
export declare function refreshUserTokens(db: DbClient, _repos: Repositories, config: AuthConfig, oldRefreshToken: string, ipAddress?: string, userAgent?: string): Promise<RefreshResult>;
/**
 * Logout user by invalidating their refresh token.
 *
 * @param _db - Database client (unused, kept for interface consistency)
 * @param repos - Repositories
 * @param refreshToken - Refresh token to invalidate
 * @complexity O(1)
 */
export declare function logoutUser(_db: DbClient, repos: Repositories, refreshToken?: string): Promise<void>;
/**
 * Request a password reset email.
 * Always returns success to prevent user enumeration.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param emailService - Email service
 * @param emailTemplates - Email templates
 * @param email - User email
 * @param baseUrl - Base URL for reset link
 * @throws {EmailSendError} If email fails to send
 * @complexity O(1)
 */
export declare function requestPasswordReset(db: DbClient, repos: Repositories, emailService: AuthEmailService, emailTemplates: AuthEmailTemplates, email: string, baseUrl: string): Promise<void>;
/**
 * Reset password using a valid token.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param token - Password reset token
 * @param newPassword - New password
 * @throws {InvalidTokenError} If token is invalid or expired
 * @throws {WeakPasswordError} If new password is too weak
 * @complexity O(1)
 */
export declare function resetPassword(db: DbClient, repos: Repositories, config: AuthConfig, token: string, newPassword: string): Promise<void>;
/**
 * Check if a user has a password set (vs being magic-link only).
 *
 * @param passwordHash - User's password hash
 * @returns True if user has a real password
 * @complexity O(1)
 */
export declare function hasPassword(passwordHash: string): boolean;
/**
 * Set password for a user who doesn't have one (magic-link only users).
 *
 * @param _db - Database client (unused, kept for interface consistency)
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param userId - User ID
 * @param newPassword - New password
 * @throws {InvalidCredentialsError} If user not found
 * @throws Error with name 'PasswordAlreadySetError' if user already has a password
 * @throws {WeakPasswordError} If password is too weak
 * @complexity O(1)
 */
export declare function setPassword(_db: DbClient, repos: Repositories, config: AuthConfig, userId: string, newPassword: string): Promise<void>;
/**
 * Create an email verification token for a user.
 *
 * @param dbOrRepos - Either DbClient (for transactions) or Repositories (for direct calls)
 * @param userId - User ID to create token for
 * @returns Plain text token
 * @complexity O(1)
 */
export declare function createEmailVerificationToken(dbOrRepos: DbClient | Repositories, userId: string): Promise<string>;
/**
 * Resend verification email for an unverified user.
 * Creates a new verification token and sends the email.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param emailService - Email service
 * @param emailTemplates - Email templates
 * @param email - User email
 * @param baseUrl - Base URL for verification link
 * @throws {EmailSendError} If email fails to send
 * @complexity O(1)
 */
export declare function resendVerificationEmail(db: DbClient, repos: Repositories, emailService: AuthEmailService, emailTemplates: AuthEmailTemplates, email: string, baseUrl: string): Promise<void>;
/**
 * Verify email using a token.
 * Returns auth result with tokens for auto-login after verification.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param token - Email verification token
 * @returns Authentication result for auto-login
 * @throws {InvalidTokenError} If token is invalid or expired
 * @complexity O(1) - constant database operations
 */
export declare function verifyEmail(db: DbClient, repos: Repositories, config: AuthConfig, token: string): Promise<AuthResult>;
//# sourceMappingURL=service.d.ts.map