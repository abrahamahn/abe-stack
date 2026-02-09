// src/apps/server/src/config/auth/auth.ts
import { BaseError } from '@abe-stack/shared';
import { getList } from '@abe-stack/shared/config';

import type {
  AuthConfig,
  AuthStrategy,
  OAuthProviderConfig,
  FullEnv,
} from '@abe-stack/shared/config';

const WEAK_SECRETS = new Set([
  'secret',
  'password',
  'jwt_secret',
  'changeme',
  'test',
  'dev',
  'prod',
]);

const REPEATING_PATTERN = /^(.)\1{31,}$/;

const VALID_STRATEGIES = new Set([
  'local',
  'magic',
  'webauthn',
  'google',
  'github',
  'facebook',
  'microsoft',
  'apple',
]);

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
    strategies: (env.AUTH_STRATEGIES ?? 'local')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is AuthStrategy => VALID_STRATEGIES.has(s)),

    jwt: {
      secret: jwtSecret,
      ...(env.JWT_SECRET_PREVIOUS !== undefined && { previousSecret: env.JWT_SECRET_PREVIOUS }),
      accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },

    refreshToken: {
      expiryDays: env.REFRESH_TOKEN_EXPIRY_DAYS,
      gracePeriodSeconds: env.REFRESH_TOKEN_GRACE_PERIOD,
    },

    argon2: {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
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
      baseDelayMs: 1000,
    },

    bffMode: env.AUTH_BFF_MODE === 'true',

    proxy: {
      trustProxy: env.TRUST_PROXY === 'true',
      trustedProxies: getList(env.TRUSTED_PROXIES),
      maxProxyDepth: env.MAX_PROXY_DEPTH ?? 1,
    },

    rateLimit: {
      login: {
        max: env.RATE_LIMIT_LOGIN_MAX ?? (isProduction ? 5 : 100),
        windowMs: 15 * 60 * 1000,
      },
      register: {
        max: env.RATE_LIMIT_REGISTER_MAX ?? (isProduction ? 3 : 100),
        windowMs: 60 * 60 * 1000,
      },
      forgotPassword: {
        max: env.RATE_LIMIT_FORGOT_PASSWORD_MAX ?? (isProduction ? 3 : 100),
        windowMs: 60 * 60 * 1000,
      },
      verifyEmail: {
        max: env.RATE_LIMIT_VERIFY_EMAIL_MAX ?? (isProduction ? 10 : 100),
        windowMs: 60 * 60 * 1000,
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
  const { jwt, cookie, lockout, refreshToken, password } = config;

  if (jwt.secret.length < 32)
    throw new AuthValidationError('JWT secret must be at least 32 characters', 'jwt.secret');

  if (WEAK_SECRETS.has(jwt.secret.toLowerCase().trim()))
    throw new AuthValidationError('JWT secret is a weak value', 'jwt.secret');

  if (REPEATING_PATTERN.test(jwt.secret))
    throw new AuthValidationError('JWT secret is a repeating pattern', 'jwt.secret');

  if (cookie.secret.length < 32)
    throw new AuthValidationError('Cookie secret must be >= 32 chars', 'cookie.secret');

  if (lockout.maxAttempts < 3 || lockout.maxAttempts > 20)
    throw new AuthValidationError(
      'Lockout attempts must be between 3 and 20',
      'lockout.maxAttempts',
    );

  if (lockout.lockoutDurationMs < 60000)
    throw new AuthValidationError(
      'Lockout duration must be at least 60000ms',
      'lockout.lockoutDurationMs',
    );

  if (refreshToken.expiryDays < 1 || refreshToken.expiryDays > 30)
    throw new AuthValidationError(
      'Refresh expiry must be between 1 and 30 days',
      'refreshToken.expiryDays',
    );

  if (password.minLength < 8)
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
