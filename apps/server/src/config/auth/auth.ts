// apps/server/src/config/auth.config.ts
import type { AuthConfig, AuthStrategy, OAuthProviderConfig } from '@abe-stack/core';
import { getBool, getInt, getList } from '@abe-stack/core/config/utils';

/**
 * Common weak secrets and patterns
 */
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

export class AuthValidationError extends Error {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.field = field;
    this.name = 'AuthValidationError';
  }
}

// --- CORE LOGIC ---

export function loadAuth(env: Record<string, string | undefined>, apiBaseUrl: string): AuthConfig {
  const isProduction = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET || '';

  // Helper to ensure we don't have double slashes if apiBaseUrl ends in /
  const buildUrl = (path: string): string => `${apiBaseUrl.replace(/\/$/, '')}${path}`;

  const config: AuthConfig = {
    strategies: (env.AUTH_STRATEGIES || 'local')
      .split(',')
      .map((s) => s.trim().toLowerCase() as AuthStrategy),

    jwt: {
      secret: jwtSecret,
      previousSecret: env.JWT_SECRET_PREVIOUS,
      accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY || '15m',
      issuer: env.JWT_ISSUER || 'abe-stack',
      audience: env.JWT_AUDIENCE || 'abe-stack-api',
    },

    refreshToken: {
      expiryDays: getInt(env.REFRESH_TOKEN_EXPIRY_DAYS, 7),
      gracePeriodSeconds: getInt(env.REFRESH_TOKEN_GRACE_PERIOD, 30),
    },

    argon2: {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    },

    password: {
      minLength: getInt(env.PASSWORD_MIN_LENGTH, 8),
      maxLength: getInt(env.PASSWORD_MAX_LENGTH, 64),
      minZxcvbnScore: getInt(env.PASSWORD_MIN_SCORE, 3) as 0 | 1 | 2 | 3 | 4,
    },

    lockout: {
      maxAttempts: getInt(env.LOCKOUT_MAX_ATTEMPTS, 10),
      lockoutDurationMs: getInt(env.LOCKOUT_DURATION_MS, 1800000),
      progressiveDelay: true,
      baseDelayMs: 1000,
    },

    bffMode: getBool(env.AUTH_BFF_MODE),

    proxy: {
      trustProxy: getBool(env.TRUST_PROXY),
      trustedProxies: getList(env.TRUSTED_PROXIES),
      maxProxyDepth: getInt(env.MAX_PROXY_DEPTH, 1),
    },

    rateLimit: {
      login: { max: isProduction ? 5 : 100, windowMs: 15 * 60 * 1000 },
      register: { max: isProduction ? 3 : 100, windowMs: 60 * 60 * 1000 },
      forgotPassword: { max: isProduction ? 3 : 100, windowMs: 60 * 60 * 1000 },
      verifyEmail: { max: isProduction ? 10 : 100, windowMs: 60 * 60 * 1000 },
    },

    cookie: {
      name: 'refreshToken',
      secret: env.COOKIE_SECRET || jwtSecret,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    },

    oauth: {
      google: createOAuth(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_CALLBACK_URL || buildUrl('/api/auth/oauth/google/callback')
      ),
      github: createOAuth(
        env.GITHUB_CLIENT_ID,
        env.GITHUB_CLIENT_SECRET,
        env.GITHUB_CALLBACK_URL || buildUrl('/api/auth/oauth/github/callback')
      ),
      facebook: createOAuth(
        env.FACEBOOK_CLIENT_ID,
        env.FACEBOOK_CLIENT_SECRET,
        env.FACEBOOK_CALLBACK_URL || buildUrl('/api/auth/oauth/facebook/callback')
      ),
      microsoft: env.MICROSOFT_CLIENT_ID
        ? {
            clientId: env.MICROSOFT_CLIENT_ID,
            clientSecret: env.MICROSOFT_CLIENT_SECRET || '',
            callbackUrl:
              env.MICROSOFT_CALLBACK_URL || buildUrl('/api/auth/oauth/microsoft/callback'),
            tenantId: env.MICROSOFT_TENANT_ID || 'common',
          }
        : undefined,
      ...(env.APPLE_CLIENT_ID && {
        apple: {
          clientId: env.APPLE_CLIENT_ID,
          clientSecret: '',
          callbackUrl: env.APPLE_CALLBACK_URL || buildUrl('/api/auth/oauth/apple/callback'),
          teamId: env.APPLE_TEAM_ID || '',
          keyId: env.APPLE_KEY_ID || '',
          privateKey: env.APPLE_PRIVATE_KEY_BASE64
            ? Buffer.from(env.APPLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
            : env.APPLE_PRIVATE_KEY || '',
        },
      }),
    },

    magicLink: {
      tokenExpiryMinutes: getInt(env.MAGIC_LINK_EXPIRY_MINUTES, 15),
      maxAttempts: getInt(env.MAGIC_LINK_MAX_ATTEMPTS, 3),
    },

    totp: {
      issuer: env.TOTP_ISSUER || 'ABE Stack',
      window: getInt(env.TOTP_WINDOW, 1),
    },
  };

  // Run validation before returning
  validateAuth(config);
  return config;
}

export function validateAuth(config: AuthConfig): void {
  const { jwt, cookie, lockout, refreshToken, password } = config;

  if (jwt.secret.length < 32)
    throw new AuthValidationError('JWT secret must be >= 32 chars', 'jwt.secret');

  if (WEAK_SECRETS.has(jwt.secret.toLowerCase().trim()))
    throw new AuthValidationError('JWT secret is a weak value', 'jwt.secret');

  if (REPEATING_PATTERN.test(jwt.secret))
    throw new AuthValidationError('JWT secret is a repeating pattern', 'jwt.secret');

  if (cookie.secret && cookie.secret.length < 32)
    throw new AuthValidationError('Cookie secret must be >= 32 chars', 'cookie.secret');

  if (lockout.maxAttempts < 3 || lockout.maxAttempts > 20)
    throw new AuthValidationError('Lockout attempts must be between 3-20', 'lockout.maxAttempts');

  if (refreshToken.expiryDays < 1 || refreshToken.expiryDays > 30)
    throw new AuthValidationError('Refresh expiry must be 1-30 days', 'refreshToken.expiryDays');

  if (password.minLength < 8)
    throw new AuthValidationError('Min password length must be 8', 'password.minLength');
}

/**
 * Gets refresh token cookie options based on auth config
 */
export function getRefreshCookieOptions(config: AuthConfig): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite as 'strict' | 'lax' | 'none',
    path: config.cookie.path,
    maxAge: config.refreshToken.expiryDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
  };
}

/**
 * Checks if a specific auth strategy is enabled
 */
export function isStrategyEnabled(config: AuthConfig, strategy: AuthStrategy): boolean {
  return config.strategies.includes(strategy);
}

function createOAuth<T = Record<string, any>>(
  id: string | undefined,
  secret: string | undefined,
  callbackUrl: string,
  extra?: T
): (OAuthProviderConfig & T) | undefined {
  if (!id) return undefined;
  return {
    clientId: id,
    clientSecret: secret || '',
    callbackUrl,
    ...(extra as T),
  };
}
