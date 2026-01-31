/**
 * Authentication Configuration
 *
 * Loads and validates the complete authentication configuration
 * from environment variables. Enforces security constraints.
 *
 * @module config/auth
 */
import { BaseError } from '@abe-stack/core';
import type { AuthConfig, AuthStrategy } from '@abe-stack/core';
import type { FullEnv } from '@abe-stack/core/config';
/**
 * Error thrown when auth configuration validation fails.
 *
 * @extends BaseError
 */
export declare class AuthValidationError extends BaseError {
    /** HTTP status code for this error */
    readonly statusCode = 400;
    /** The configuration field that failed validation */
    readonly field: string;
    /**
     * @param message - Human-readable error message
     * @param field - The configuration field path (e.g., 'jwt.secret')
     */
    constructor(message: string, field: string);
}
/**
 * Load complete Authentication Configuration.
 *
 * Configures all auth strategies, session policies, and password rules.
 *
 * @param env - Validated Environment Variables
 * @param apiBaseUrl - Public API URL (needed for OAuth callbacks)
 * @returns Complete auth configuration
 * @throws {AuthValidationError} If security constraints are violated
 * @complexity O(1) - configuration loading
 */
export declare function loadAuthConfig(env: FullEnv, apiBaseUrl: string): AuthConfig;
/**
 * Validates critical security constraints.
 *
 * Enforces:
 * - Minimum secret lengths (32+ chars)
 * - Complexity requirements
 * - Safe limits for Lockout/RateLimiting
 *
 * @param config - The auth configuration to validate
 * @throws {AuthValidationError} If any security policy is violated
 * @complexity O(1)
 */
export declare function validateAuthConfig(config: AuthConfig): void;
/**
 * Gets refresh token cookie options based on auth config.
 *
 * @param config - Auth configuration
 * @returns Cookie options for the refresh token
 * @complexity O(1)
 */
export declare function getRefreshCookieOptions(config: AuthConfig): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge: number;
};
/**
 * Checks if a specific auth strategy is enabled.
 *
 * @param config - Auth configuration
 * @param strategy - The strategy to check
 * @returns True if the strategy is enabled
 * @complexity O(n) where n is the number of configured strategies (typically < 10)
 */
export declare function isStrategyEnabled(config: AuthConfig, strategy: AuthStrategy): boolean;
//# sourceMappingURL=auth.d.ts.map