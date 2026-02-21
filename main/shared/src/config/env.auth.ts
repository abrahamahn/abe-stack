// main/shared/src/config/env.auth.ts
/**
 * Authentication Environment Configuration
 *
 * Auth types, env interface, and validation schema.
 * Merged from config/types/auth.ts and the auth section of config/env.ts.
 *
 * @module config/env.auth
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import { trueFalseSchema } from './env.base';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
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
  | 'kakao'
  | 'facebook'
  | 'microsoft'
  | 'apple';

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
    /** Clock skew tolerance in seconds for token verification (default: 30) */
    clockToleranceSeconds?: number;
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

  /**
   * Encryption key for stored OAuth access/refresh tokens.
   * Separate from cookie.secret to allow independent key rotation.
   * Min 32 chars. Falls back to cookie.secret if not set (backwards-compatible).
   */
  oauthTokenEncryptionKey: string;

  /** OAuth provider configurations */
  oauth: {
    google?: OAuthProviderConfig;
    github?: OAuthProviderConfig;
    kakao?: OAuthProviderConfig;
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

  /**
   * CAPTCHA configuration for bot protection on public endpoints.
   * When enabled, login, register, and forgot-password require a valid CAPTCHA token.
   * Currently supports Cloudflare Turnstile.
   */
  captcha?: {
    /** Whether CAPTCHA verification is enabled */
    enabled: boolean;
    /** CAPTCHA provider (currently only Turnstile is supported) */
    provider: 'turnstile';
    /** Site key (public, sent to client) */
    siteKey: string;
    /** Secret key (server-side, for verification API calls) */
    secretKey: string;
  };

  /**
   * Session management settings.
   * Controls idle timeout and concurrent session limits.
   */
  sessions?: {
    /** Idle timeout in minutes. Sessions inactive longer are rejected on refresh. Default: 30 */
    idleTimeoutMinutes?: number;
    /** Maximum concurrent sessions per user. Oldest evicted when exceeded. Default: 10 */
    maxConcurrentSessions?: number;
  };

  /** WebAuthn/Passkey configuration */
  webauthn?: {
    /** Relying Party display name shown during registration */
    rpName: string;
    /** Relying Party ID (typically the domain, e.g. 'example.com') */
    rpId: string;
    /** Expected origin (e.g. 'https://example.com') */
    origin: string;
    /** Attestation preference. Default: 'none' */
    attestation?: 'none' | 'direct';
  };
}

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
 */
export type Argon2Config = AuthConfig['argon2'];

// ============================================================================
// Env Interface
// ============================================================================

/** Authentication environment variables */
export interface AuthEnv {
  AUTH_STRATEGIES?: string | undefined;
  ACCESS_TOKEN_EXPIRY: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  REFRESH_TOKEN_EXPIRY_DAYS: number;
  REFRESH_TOKEN_GRACE_PERIOD: number;
  PASSWORD_MIN_LENGTH: number;
  PASSWORD_MAX_LENGTH: number;
  PASSWORD_MIN_SCORE: number;
  LOCKOUT_MAX_ATTEMPTS: number;
  LOCKOUT_DURATION_MS: number;
  RATE_LIMIT_LOGIN_MAX?: number | undefined;
  RATE_LIMIT_REGISTER_MAX?: number | undefined;
  RATE_LIMIT_FORGOT_PASSWORD_MAX?: number | undefined;
  RATE_LIMIT_VERIFY_EMAIL_MAX?: number | undefined;
  COOKIE_SECRET?: string | undefined;
  OAUTH_TOKEN_ENCRYPTION_KEY?: string | undefined;
  TRUST_PROXY?: 'true' | 'false' | undefined;
  TRUSTED_PROXIES?: string | undefined;
  MAX_PROXY_DEPTH?: number | undefined;
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
  GOOGLE_CALLBACK_URL?: string | undefined;
  GITHUB_CLIENT_ID?: string | undefined;
  GITHUB_CLIENT_SECRET?: string | undefined;
  GITHUB_CALLBACK_URL?: string | undefined;
  KAKAO_CLIENT_ID?: string | undefined;
  KAKAO_CLIENT_SECRET?: string | undefined;
  KAKAO_CALLBACK_URL?: string | undefined;
  FACEBOOK_CLIENT_ID?: string | undefined;
  FACEBOOK_CLIENT_SECRET?: string | undefined;
  FACEBOOK_CALLBACK_URL?: string | undefined;
  MICROSOFT_CLIENT_ID?: string | undefined;
  MICROSOFT_CLIENT_SECRET?: string | undefined;
  MICROSOFT_CALLBACK_URL?: string | undefined;
  MICROSOFT_TENANT_ID?: string | undefined;
  APPLE_CLIENT_ID?: string | undefined;
  APPLE_CLIENT_SECRET?: string | undefined;
  APPLE_CALLBACK_URL?: string | undefined;
  APPLE_TEAM_ID?: string | undefined;
  APPLE_KEY_ID?: string | undefined;
  APPLE_PRIVATE_KEY?: string | undefined;
  APPLE_PRIVATE_KEY_BASE64?: string | undefined;
  MAGIC_LINK_EXPIRY_MINUTES: number;
  MAGIC_LINK_MAX_ATTEMPTS: number;
  TOTP_ISSUER: string;
  TOTP_WINDOW: number;
  CAPTCHA_ENABLED?: 'true' | 'false' | undefined;
  CAPTCHA_PROVIDER?: 'turnstile' | undefined;
  CAPTCHA_SITE_KEY?: string | undefined;
  CAPTCHA_SECRET_KEY?: string | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const AuthEnvSchema: Schema<AuthEnv> = createSchema<AuthEnv>((data: unknown) => {
  const obj = parseObject(data, 'AuthEnv');
  return {
    AUTH_STRATEGIES: parseOptional(obj['AUTH_STRATEGIES'], (v: unknown) =>
      parseString(v, 'AUTH_STRATEGIES'),
    ),
    ACCESS_TOKEN_EXPIRY: parseString(
      withDefault(obj['ACCESS_TOKEN_EXPIRY'], '15m'),
      'ACCESS_TOKEN_EXPIRY',
    ),
    JWT_ISSUER: parseString(withDefault(obj['JWT_ISSUER'], 'bslt'), 'JWT_ISSUER'),
    JWT_AUDIENCE: parseString(withDefault(obj['JWT_AUDIENCE'], 'bslt-api'), 'JWT_AUDIENCE'),
    REFRESH_TOKEN_EXPIRY_DAYS: coerceNumber(
      withDefault(obj['REFRESH_TOKEN_EXPIRY_DAYS'], 7),
      'REFRESH_TOKEN_EXPIRY_DAYS',
    ),
    REFRESH_TOKEN_GRACE_PERIOD: coerceNumber(
      withDefault(obj['REFRESH_TOKEN_GRACE_PERIOD'], 30),
      'REFRESH_TOKEN_GRACE_PERIOD',
    ),
    PASSWORD_MIN_LENGTH: coerceNumber(
      withDefault(obj['PASSWORD_MIN_LENGTH'], 8),
      'PASSWORD_MIN_LENGTH',
    ),
    PASSWORD_MAX_LENGTH: coerceNumber(
      withDefault(obj['PASSWORD_MAX_LENGTH'], 64),
      'PASSWORD_MAX_LENGTH',
    ),
    PASSWORD_MIN_SCORE: coerceNumber(
      withDefault(obj['PASSWORD_MIN_SCORE'], 3),
      'PASSWORD_MIN_SCORE',
    ),
    LOCKOUT_MAX_ATTEMPTS: coerceNumber(
      withDefault(obj['LOCKOUT_MAX_ATTEMPTS'], 10),
      'LOCKOUT_MAX_ATTEMPTS',
    ),
    LOCKOUT_DURATION_MS: coerceNumber(
      withDefault(obj['LOCKOUT_DURATION_MS'], 1800000),
      'LOCKOUT_DURATION_MS',
    ),
    RATE_LIMIT_LOGIN_MAX: parseOptional(obj['RATE_LIMIT_LOGIN_MAX'], (v: unknown) =>
      coerceNumber(v, 'RATE_LIMIT_LOGIN_MAX'),
    ),
    RATE_LIMIT_REGISTER_MAX: parseOptional(obj['RATE_LIMIT_REGISTER_MAX'], (v: unknown) =>
      coerceNumber(v, 'RATE_LIMIT_REGISTER_MAX'),
    ),
    RATE_LIMIT_FORGOT_PASSWORD_MAX: parseOptional(
      obj['RATE_LIMIT_FORGOT_PASSWORD_MAX'],
      (v: unknown) => coerceNumber(v, 'RATE_LIMIT_FORGOT_PASSWORD_MAX'),
    ),
    RATE_LIMIT_VERIFY_EMAIL_MAX: parseOptional(obj['RATE_LIMIT_VERIFY_EMAIL_MAX'], (v: unknown) =>
      coerceNumber(v, 'RATE_LIMIT_VERIFY_EMAIL_MAX'),
    ),
    COOKIE_SECRET: parseOptional(obj['COOKIE_SECRET'], (v: unknown) =>
      parseString(v, 'COOKIE_SECRET'),
    ),
    OAUTH_TOKEN_ENCRYPTION_KEY: parseOptional(obj['OAUTH_TOKEN_ENCRYPTION_KEY'], (v: unknown) =>
      parseString(v, 'OAUTH_TOKEN_ENCRYPTION_KEY'),
    ),
    TRUST_PROXY: parseOptional(obj['TRUST_PROXY'], (v: unknown) => trueFalseSchema.parse(v)),
    TRUSTED_PROXIES: parseOptional(obj['TRUSTED_PROXIES'], (v: unknown) =>
      parseString(v, 'TRUSTED_PROXIES'),
    ),
    MAX_PROXY_DEPTH: parseOptional(obj['MAX_PROXY_DEPTH'], (v: unknown) =>
      coerceNumber(v, 'MAX_PROXY_DEPTH'),
    ),
    GOOGLE_CLIENT_ID: parseOptional(obj['GOOGLE_CLIENT_ID'], (v: unknown) =>
      parseString(v, 'GOOGLE_CLIENT_ID'),
    ),
    GOOGLE_CLIENT_SECRET: parseOptional(obj['GOOGLE_CLIENT_SECRET'], (v: unknown) =>
      parseString(v, 'GOOGLE_CLIENT_SECRET'),
    ),
    GOOGLE_CALLBACK_URL: parseOptional(obj['GOOGLE_CALLBACK_URL'], (v: unknown) =>
      parseString(v, 'GOOGLE_CALLBACK_URL'),
    ),
    GITHUB_CLIENT_ID: parseOptional(obj['GITHUB_CLIENT_ID'], (v: unknown) =>
      parseString(v, 'GITHUB_CLIENT_ID'),
    ),
    GITHUB_CLIENT_SECRET: parseOptional(obj['GITHUB_CLIENT_SECRET'], (v: unknown) =>
      parseString(v, 'GITHUB_CLIENT_SECRET'),
    ),
    GITHUB_CALLBACK_URL: parseOptional(obj['GITHUB_CALLBACK_URL'], (v: unknown) =>
      parseString(v, 'GITHUB_CALLBACK_URL'),
    ),
    KAKAO_CLIENT_ID: parseOptional(obj['KAKAO_CLIENT_ID'], (v: unknown) =>
      parseString(v, 'KAKAO_CLIENT_ID'),
    ),
    KAKAO_CLIENT_SECRET: parseOptional(obj['KAKAO_CLIENT_SECRET'], (v: unknown) =>
      parseString(v, 'KAKAO_CLIENT_SECRET'),
    ),
    KAKAO_CALLBACK_URL: parseOptional(obj['KAKAO_CALLBACK_URL'], (v: unknown) =>
      parseString(v, 'KAKAO_CALLBACK_URL'),
    ),
    FACEBOOK_CLIENT_ID: parseOptional(obj['FACEBOOK_CLIENT_ID'], (v: unknown) =>
      parseString(v, 'FACEBOOK_CLIENT_ID'),
    ),
    FACEBOOK_CLIENT_SECRET: parseOptional(obj['FACEBOOK_CLIENT_SECRET'], (v: unknown) =>
      parseString(v, 'FACEBOOK_CLIENT_SECRET'),
    ),
    FACEBOOK_CALLBACK_URL: parseOptional(obj['FACEBOOK_CALLBACK_URL'], (v: unknown) =>
      parseString(v, 'FACEBOOK_CALLBACK_URL'),
    ),
    MICROSOFT_CLIENT_ID: parseOptional(obj['MICROSOFT_CLIENT_ID'], (v: unknown) =>
      parseString(v, 'MICROSOFT_CLIENT_ID'),
    ),
    MICROSOFT_CLIENT_SECRET: parseOptional(obj['MICROSOFT_CLIENT_SECRET'], (v: unknown) =>
      parseString(v, 'MICROSOFT_CLIENT_SECRET'),
    ),
    MICROSOFT_CALLBACK_URL: parseOptional(obj['MICROSOFT_CALLBACK_URL'], (v: unknown) =>
      parseString(v, 'MICROSOFT_CALLBACK_URL'),
    ),
    MICROSOFT_TENANT_ID: parseOptional(obj['MICROSOFT_TENANT_ID'], (v: unknown) =>
      parseString(v, 'MICROSOFT_TENANT_ID'),
    ),
    APPLE_CLIENT_ID: parseOptional(obj['APPLE_CLIENT_ID'], (v: unknown) =>
      parseString(v, 'APPLE_CLIENT_ID'),
    ),
    APPLE_CLIENT_SECRET: parseOptional(obj['APPLE_CLIENT_SECRET'], (v: unknown) =>
      parseString(v, 'APPLE_CLIENT_SECRET'),
    ),
    APPLE_CALLBACK_URL: parseOptional(obj['APPLE_CALLBACK_URL'], (v: unknown) =>
      parseString(v, 'APPLE_CALLBACK_URL'),
    ),
    APPLE_TEAM_ID: parseOptional(obj['APPLE_TEAM_ID'], (v: unknown) =>
      parseString(v, 'APPLE_TEAM_ID'),
    ),
    APPLE_KEY_ID: parseOptional(obj['APPLE_KEY_ID'], (v: unknown) =>
      parseString(v, 'APPLE_KEY_ID'),
    ),
    APPLE_PRIVATE_KEY: parseOptional(obj['APPLE_PRIVATE_KEY'], (v: unknown) =>
      parseString(v, 'APPLE_PRIVATE_KEY'),
    ),
    APPLE_PRIVATE_KEY_BASE64: parseOptional(obj['APPLE_PRIVATE_KEY_BASE64'], (v: unknown) =>
      parseString(v, 'APPLE_PRIVATE_KEY_BASE64'),
    ),
    MAGIC_LINK_EXPIRY_MINUTES: coerceNumber(
      withDefault(obj['MAGIC_LINK_EXPIRY_MINUTES'], 15),
      'MAGIC_LINK_EXPIRY_MINUTES',
    ),
    MAGIC_LINK_MAX_ATTEMPTS: coerceNumber(
      withDefault(obj['MAGIC_LINK_MAX_ATTEMPTS'], 3),
      'MAGIC_LINK_MAX_ATTEMPTS',
    ),
    TOTP_ISSUER: parseString(withDefault(obj['TOTP_ISSUER'], 'BSLT'), 'TOTP_ISSUER'),
    TOTP_WINDOW: coerceNumber(withDefault(obj['TOTP_WINDOW'], 1), 'TOTP_WINDOW'),
    CAPTCHA_ENABLED: parseOptional(obj['CAPTCHA_ENABLED'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    CAPTCHA_PROVIDER: parseOptional(obj['CAPTCHA_PROVIDER'], (v: unknown) =>
      createEnumSchema(['turnstile'] as const, 'CAPTCHA_PROVIDER').parse(v),
    ),
    CAPTCHA_SITE_KEY: parseOptional(obj['CAPTCHA_SITE_KEY'], (v: unknown) =>
      parseString(v, 'CAPTCHA_SITE_KEY'),
    ),
    CAPTCHA_SECRET_KEY: parseOptional(obj['CAPTCHA_SECRET_KEY'], (v: unknown) =>
      parseString(v, 'CAPTCHA_SECRET_KEY'),
    ),
  };
});
