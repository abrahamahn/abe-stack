// packages/shared/src/config/types/auth.ts
/**
 * Authentication Configuration Contracts
 *
 * These types define the shape of all authentication and security configurations.
 * Supports multiple strategies: local auth, OAuth providers, magic links, and TOTP.
 */

// ============================================================================
// Primitive Types
// ============================================================================

/**
 * Supported authentication strategies.
 * Enable multiple strategies by listing them in AUTH_STRATEGIES env var.
 */
export type AuthStrategy =
  | 'local' // Email + password
  | 'magic' // Magic link (passwordless)
  | 'webauthn' // Passkeys/biometric
  | 'google'
  | 'github'
  | 'facebook'
  | 'microsoft'
  | 'apple';

// ============================================================================
// OAuth Configuration
// ============================================================================

/**
 * OAuth provider credentials.
 * Obtain these from each provider's developer console.
 */
export interface OAuthProviderConfig {
  /** OAuth client ID from provider */
  clientId: string;
  /** OAuth client secret from provider */
  clientSecret: string;
  /** Callback URL registered with provider */
  callbackUrl: string;
}

// ============================================================================
// Main Auth Configuration
// ============================================================================

/**
 * Complete authentication configuration.
 * Controls JWT, sessions, password policy, rate limiting, and OAuth.
 */
export interface AuthConfig {
  /** Enabled authentication strategies */
  strategies: AuthStrategy[];

  /** JWT token configuration */
  jwt: {
    /** Secret for signing tokens (min 32 chars, use openssl rand -base64 32) */
    secret: string;
    /** Previous secret for zero-downtime key rotation */
    previousSecret?: string;
    /** Access token expiry (e.g., '15m', '1h', or seconds as number) */
    accessTokenExpiry: string | number;
    /** Token issuer claim */
    issuer: string;
    /** Token audience claim */
    audience: string;
  };

  /** Refresh token configuration */
  refreshToken: {
    /** Token validity in days */
    expiryDays: number;
    /** Grace period for concurrent refresh requests (seconds) */
    gracePeriodSeconds: number;
  };

  /** Argon2 password hashing parameters (OWASP recommended) */
  argon2: {
    /** Algorithm variant: 0=argon2d, 1=argon2i, 2=argon2id (recommended) */
    type: 0 | 1 | 2;
    /** Memory cost in KiB */
    memoryCost: number;
    /** Number of iterations */
    timeCost: number;
    /** Degree of parallelism */
    parallelism: number;
  };

  /** Password policy settings */
  password: {
    /** Minimum password length */
    minLength: number;
    /** Maximum password length (prevent DoS) */
    maxLength: number;
    /** Minimum zxcvbn score (0-4, recommend 3+) */
    minZxcvbnScore: 0 | 1 | 2 | 3 | 4;
  };

  /** Account lockout settings for brute-force protection */
  lockout: {
    /** Failed attempts before lockout */
    maxAttempts: number;
    /** Lockout duration in milliseconds */
    lockoutDurationMs: number;
    /** Enable progressive delay between attempts */
    progressiveDelay: boolean;
    /** Base delay for progressive backoff (milliseconds) */
    baseDelayMs: number;
  };

  /** Backend-for-Frontend mode (cookies-only, no exposed tokens) */
  bffMode: boolean;

  /** Reverse proxy configuration for accurate IP detection */
  proxy: {
    /** Trust X-Forwarded-For headers */
    trustProxy: boolean;
    /** Trusted proxy IP ranges (CIDR notation) */
    trustedProxies: string[];
    /** Maximum proxy chain depth to trust */
    maxProxyDepth: number;
  };

  /** Per-endpoint rate limiting */
  rateLimit: {
    login: { max: number; windowMs: number };
    register: { max: number; windowMs: number };
    forgotPassword: { max: number; windowMs: number };
    verifyEmail: { max: number; windowMs: number };
  };

  /** Refresh token cookie settings */
  cookie: {
    /** Cookie name */
    name: string;
    /** Cookie signing secret */
    secret: string;
    /** Prevent JavaScript access */
    httpOnly: boolean;
    /** Require HTTPS */
    secure: boolean;
    /** SameSite policy */
    sameSite: 'strict' | 'lax' | 'none';
    /** Cookie path */
    path: string;
  };

  /** OAuth provider configurations */
  oauth: {
    google?: OAuthProviderConfig;
    github?: OAuthProviderConfig;
    facebook?: OAuthProviderConfig;
    microsoft?: OAuthProviderConfig & {
      /** Azure AD tenant ID ('common' for multi-tenant) */
      tenantId: string;
    };
    apple?: OAuthProviderConfig & {
      /** Apple Developer Team ID */
      teamId: string;
      /** Sign In with Apple Key ID */
      keyId: string;
      /** Private key (PEM format) */
      privateKey: string;
    };
  };

  /** Magic link (passwordless) settings */
  magicLink: {
    /** Link validity in minutes */
    tokenExpiryMinutes: number;
    /** Max attempts before temporary block */
    maxAttempts: number;
  };

  /** TOTP (2FA) settings */
  totp: {
    /** Issuer name shown in authenticator apps */
    issuer: string;
    /** Time window tolerance (number of periods) */
    window: number;
  };
}

// ============================================================================
// Helper Types for Auth Infrastructure
// ============================================================================

/**
 * JWT rotation configuration for seamless secret key rotation.
 * Allows accepting tokens signed with previous secret during rotation period.
 */
export interface JwtRotationConfig {
  /** Current JWT signing secret */
  secret: string;
  /** Previous secret for accepting tokens during rotation */
  previousSecret?: string;
}

/**
 * Rate limiting configuration for API protection.
 * Supports progressive delays to slow down rather than block attackers.
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Cleanup interval for rate limit storage */
  cleanupIntervalMs?: number;
  /** Trust proxy headers for client IP detection */
  trustProxy?: boolean;
  /** Progressive delay configuration */
  progressiveDelay?: {
    enabled: boolean;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
}

/**
 * Argon2 password hashing configuration.
 * Extracted from AuthConfig['argon2'] for standalone use by password utilities.
 *
 * @see AuthConfig.argon2 for the nested form in the auth config
 */
export type Argon2Config = AuthConfig['argon2'];
