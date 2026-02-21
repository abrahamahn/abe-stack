// main/apps/server/src/config/auth/auth.ts
import { BaseError, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from '@bslt/shared';
import {
  ARGON2_DEFAULTS,
  AUTH_STRATEGIES,
  AUTH_VALIDATION,
  RATE_LIMIT_DEFAULTS,
  REPEATING_SECRET_PATTERN,
  WEAK_SECRETS,
  getList,
} from '@bslt/shared/config';

import type { AuthConfig, AuthStrategy, FullEnv, OAuthProviderConfig } from '@bslt/shared/config';

const VALID_STRATEGIES = new Set<string>(AUTH_STRATEGIES);
const STRATEGY_ALIASES: Readonly<Record<string, AuthStrategy>> = {
  'magic-link': 'magic',
  passkey: 'webauthn',
  passkeys: 'webauthn',
};

function parseAuthStrategies(raw: string): AuthStrategy[] {
  const normalized = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
    .map((s) => STRATEGY_ALIASES[s] ?? s);

  const invalid = normalized.filter((s) => !VALID_STRATEGIES.has(s));
  if (invalid.length > 0) {
    throw new AuthValidationError(
      `Invalid auth strategies: ${invalid.join(', ')}. Valid values: ${AUTH_STRATEGIES.join(', ')}`,
      'strategies',
    );
  }

  const deduped = [...new Set(normalized)];
  if (deduped.length === 0) {
    throw new AuthValidationError('At least one auth strategy must be configured', 'strategies');
  }

  return deduped as AuthStrategy[];
}

export class AuthValidationError extends BaseError {
  public readonly code = 'AUTH_VALIDATION_ERROR';
  public readonly statusCode = 400;
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.field = field;
  }
}

/**
 * Load complete Authentication Configuration.
 *
 * Configures all auth strategies, session policies, and password rules.
 *
 * @param env - Validated Environment Variables
 * @param apiBaseUrl - Public API URL (needed for OAuth callbacks)
 */
export function loadAuthConfig(env: FullEnv, apiBaseUrl: string): AuthConfig {
  const isProduction = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET;

  const buildUrl = (path: string): string => `${apiBaseUrl.replace(/\/$/, '')}${path}`;

  // Helper to build OAuth config object conditionally
  const buildOAuthProviders = (): AuthConfig['oauth'] => {
    const providers: AuthConfig['oauth'] = {};

    const googleConfig = createOAuth(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL ?? buildUrl('/api/auth/oauth/google/callback'),
    );
    if (googleConfig !== undefined) {
      providers.google = googleConfig;
    }

    const githubConfig = createOAuth(
      env.GITHUB_CLIENT_ID,
      env.GITHUB_CLIENT_SECRET,
      env.GITHUB_CALLBACK_URL ?? buildUrl('/api/auth/oauth/github/callback'),
    );
    if (githubConfig !== undefined) {
      providers.github = githubConfig;
    }

    const facebookConfig = createOAuth(
      env.FACEBOOK_CLIENT_ID,
      env.FACEBOOK_CLIENT_SECRET,
      env.FACEBOOK_CALLBACK_URL ?? buildUrl('/api/auth/oauth/facebook/callback'),
    );
    if (facebookConfig !== undefined) {
      providers.facebook = facebookConfig;
    }

    if (env.MICROSOFT_CLIENT_ID !== undefined && env.MICROSOFT_CLIENT_ID !== '') {
      providers.microsoft = {
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET ?? '',
        callbackUrl: env.MICROSOFT_CALLBACK_URL ?? buildUrl('/api/auth/oauth/microsoft/callback'),
        tenantId: env.MICROSOFT_TENANT_ID ?? 'common',
      };
    }

    if (env.APPLE_CLIENT_ID !== undefined && env.APPLE_CLIENT_ID !== '') {
      providers.apple = {
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: '',
        callbackUrl: env.APPLE_CALLBACK_URL ?? buildUrl('/api/auth/oauth/apple/callback'),
        teamId: env.APPLE_TEAM_ID ?? '',
        keyId: env.APPLE_KEY_ID ?? '',
        privateKey:
          env.APPLE_PRIVATE_KEY_BASE64 !== undefined && env.APPLE_PRIVATE_KEY_BASE64 !== ''
            ? Buffer.from(env.APPLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
            : (env.APPLE_PRIVATE_KEY ?? ''),
      };
    }

    return providers;
  };

  const config: AuthConfig = {
    strategies: parseAuthStrategies(env.AUTH_STRATEGIES ?? 'local'),

    jwt: {
      secret: jwtSecret,
      ...(env.JWT_SECRET_PREVIOUS !== undefined && {
        previousSecret: env.JWT_SECRET_PREVIOUS,
      }),
      accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },

    refreshToken: {
      expiryDays: env.REFRESH_TOKEN_EXPIRY_DAYS,
      gracePeriodSeconds: env.REFRESH_TOKEN_GRACE_PERIOD,
    },

    argon2: {
      type: ARGON2_DEFAULTS.TYPE,
      memoryCost: ARGON2_DEFAULTS.MEMORY_COST,
      timeCost: ARGON2_DEFAULTS.TIME_COST,
      parallelism: ARGON2_DEFAULTS.PARALLELISM,
    },

    password: {
      minLength: env.PASSWORD_MIN_LENGTH,
      maxLength: env.PASSWORD_MAX_LENGTH,
      minZxcvbnScore: env.PASSWORD_MIN_SCORE as 0 | 1 | 2 | 3 | 4,
    },

    lockout: {
      maxAttempts: env.LOCKOUT_MAX_ATTEMPTS,
      lockoutDurationMs: env.LOCKOUT_DURATION_MS,
      progressiveDelay: true,
      baseDelayMs: MS_PER_SECOND,
    },

    proxy: {
      trustProxy: env.TRUST_PROXY === 'true',
      trustedProxies: getList(env.TRUSTED_PROXIES),
      maxProxyDepth: env.MAX_PROXY_DEPTH ?? 1,
    },

    rateLimit: {
      login: {
        max:
          env.RATE_LIMIT_LOGIN_MAX ??
          (isProduction ? RATE_LIMIT_DEFAULTS.LOGIN_MAX_PROD : RATE_LIMIT_DEFAULTS.LOGIN_MAX_DEV),
        windowMs: 15 * MS_PER_MINUTE,
      },
      register: {
        max:
          env.RATE_LIMIT_REGISTER_MAX ??
          (isProduction
            ? RATE_LIMIT_DEFAULTS.REGISTER_MAX_PROD
            : RATE_LIMIT_DEFAULTS.REGISTER_MAX_DEV),
        windowMs: MS_PER_HOUR,
      },
      forgotPassword: {
        max:
          env.RATE_LIMIT_FORGOT_PASSWORD_MAX ??
          (isProduction
            ? RATE_LIMIT_DEFAULTS.FORGOT_PASSWORD_MAX_PROD
            : RATE_LIMIT_DEFAULTS.FORGOT_PASSWORD_MAX_DEV),
        windowMs: MS_PER_HOUR,
      },
      verifyEmail: {
        max:
          env.RATE_LIMIT_VERIFY_EMAIL_MAX ??
          (isProduction
            ? RATE_LIMIT_DEFAULTS.VERIFY_EMAIL_MAX_PROD
            : RATE_LIMIT_DEFAULTS.VERIFY_EMAIL_MAX_DEV),
        windowMs: MS_PER_HOUR,
      },
    },

    cookie: {
      name: 'refreshToken',
      secret: env.COOKIE_SECRET ?? jwtSecret,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    },

    // Dedicated key for AES-256-GCM encryption of stored OAuth tokens.
    // Falls back to cookie.secret for backwards-compatibility with existing encrypted data.
    oauthTokenEncryptionKey: env.OAUTH_TOKEN_ENCRYPTION_KEY ?? env.COOKIE_SECRET ?? jwtSecret,

    oauth: buildOAuthProviders(),

    magicLink: {
      tokenExpiryMinutes: env.MAGIC_LINK_EXPIRY_MINUTES,
      maxAttempts: env.MAGIC_LINK_MAX_ATTEMPTS,
    },

    totp: {
      issuer: env.TOTP_ISSUER,
      window: env.TOTP_WINDOW,
    },

    ...(env.CAPTCHA_ENABLED === 'true' &&
    env.CAPTCHA_SITE_KEY !== undefined &&
    env.CAPTCHA_SECRET_KEY !== undefined
      ? {
          captcha: {
            enabled: true as const,
            provider: (env.CAPTCHA_PROVIDER ?? 'turnstile') as 'turnstile',
            siteKey: env.CAPTCHA_SITE_KEY,
            secretKey: env.CAPTCHA_SECRET_KEY,
          },
        }
      : {}),
  };

  // Run validation before returning
  validateAuthConfig(config);
  return config;
}

/**
 * Validates critical security constraints.
 *
 * Enforces:
 * - Minimum secret lengths (32+ chars)
 * - Complexity requirements
 * - Safe limits for Lockout/RateLimiting
 *
 * @throws {AuthValidationError} If any security policy is violated.
 */
export function validateAuthConfig(config: AuthConfig): void {
  const { jwt, cookie, lockout, refreshToken, password, oauthTokenEncryptionKey } = config;

  if (jwt.secret.length < AUTH_VALIDATION.MIN_SECRET_LENGTH)
    throw new AuthValidationError('JWT secret must be at least 32 characters', 'jwt.secret');

  if (WEAK_SECRETS.has(jwt.secret.toLowerCase().trim()))
    throw new AuthValidationError('JWT secret is a weak value', 'jwt.secret');

  if (REPEATING_SECRET_PATTERN.test(jwt.secret))
    throw new AuthValidationError('JWT secret is a repeating pattern', 'jwt.secret');

  if (cookie.secret.length < AUTH_VALIDATION.MIN_SECRET_LENGTH)
    throw new AuthValidationError('Cookie secret must be >= 32 chars', 'cookie.secret');

  if (oauthTokenEncryptionKey.length < AUTH_VALIDATION.MIN_SECRET_LENGTH)
    throw new AuthValidationError(
      'OAuth token encryption key must be at least 32 characters',
      'oauthTokenEncryptionKey',
    );

  if (
    lockout.maxAttempts < AUTH_VALIDATION.LOCKOUT_MIN_ATTEMPTS ||
    lockout.maxAttempts > AUTH_VALIDATION.LOCKOUT_MAX_ATTEMPTS
  )
    throw new AuthValidationError(
      'Lockout attempts must be between 3 and 20',
      'lockout.maxAttempts',
    );

  if (lockout.lockoutDurationMs < AUTH_VALIDATION.LOCKOUT_MIN_DURATION_MS)
    throw new AuthValidationError(
      'Lockout duration must be at least 60000ms',
      'lockout.lockoutDurationMs',
    );

  if (
    refreshToken.expiryDays < AUTH_VALIDATION.REFRESH_TOKEN_MIN_DAYS ||
    refreshToken.expiryDays > AUTH_VALIDATION.REFRESH_TOKEN_MAX_DAYS
  )
    throw new AuthValidationError(
      'Refresh expiry must be between 1 and 30 days',
      'refreshToken.expiryDays',
    );

  if (password.minLength < AUTH_VALIDATION.PASSWORD_MIN_LENGTH)
    throw new AuthValidationError(
      'Min password length must be at least 8 characters',
      'password.minLength',
    );
}

function createOAuth<T = Record<string, unknown>>(
  id: string | undefined,
  secret: string | undefined,
  callbackUrl: string,
  extra?: T,
): (OAuthProviderConfig & T) | undefined {
  if (id === undefined || id === '') return undefined;
  return {
    clientId: id,
    clientSecret: secret ?? '',
    callbackUrl,
    ...(extra as T),
  };
}
