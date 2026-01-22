// apps/server/src/config/auth.config.ts
/**
 * Authentication Configuration
 * All auth-related settings in one place
 */

export type AuthStrategy =
  | 'local'
  | 'magic'
  | 'webauthn'
  | 'google'
  | 'github'
  | 'facebook'
  | 'microsoft';

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface AuthConfig {
  // Enabled authentication strategies
  strategies: AuthStrategy[];

  // JWT settings
  jwt: {
    secret: string;
    /** Previous secret for rotation support - tokens signed with this are still accepted */
    previousSecret?: string;
    accessTokenExpiry: string | number;
    issuer: string;
    audience: string;
  };

  // Refresh token settings
  refreshToken: {
    expiryDays: number;
    gracePeriodSeconds: number;
  };

  // Password hashing (Argon2id)
  argon2: {
    type: 0 | 1 | 2; // 0=argon2d, 1=argon2i, 2=argon2id
    memoryCost: number; // in KiB
    timeCost: number;
    parallelism: number;
  };

  // Password policy
  password: {
    minLength: number;
    maxLength: number;
    minZxcvbnScore: 0 | 1 | 2 | 3 | 4;
  };

  // Account lockout
  lockout: {
    maxAttempts: number;
    lockoutDurationMs: number;
    progressiveDelay: boolean;
    baseDelayMs: number;
  };

  // BFF mode (tokens never sent to browser)
  bffMode: boolean;

  // Proxy configuration for IP extraction
  proxy: {
    trustProxy: boolean;
    trustedProxies: string[];
    maxProxyDepth: number;
  };

  // Rate limiting per endpoint
  rateLimit: {
    login: { max: number; windowMs: number };
    register: { max: number; windowMs: number };
    forgotPassword: { max: number; windowMs: number };
    verifyEmail: { max: number; windowMs: number };
  };

  // Cookie settings
  cookie: {
    name: string;
    secret: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
  };

  // OAuth providers
  oauth: {
    google?: OAuthProviderConfig;
    github?: OAuthProviderConfig;
    apple?: OAuthProviderConfig & { teamId: string; keyId: string; privateKey: string };
    facebook?: OAuthProviderConfig;
    microsoft?: OAuthProviderConfig & { tenantId: string };
  };

  // Magic link settings
  magicLink: {
    tokenExpiryMinutes: number;
    maxAttempts: number;
  };

  // TOTP 2FA settings
  totp: {
    issuer: string;
    window: number; // Number of intervals to check before/after
  };
}

function parseStrategies(env: Record<string, string | undefined>): AuthStrategy[] {
  const envStrategies = env.AUTH_STRATEGIES || 'local';
  const validStrategies: AuthStrategy[] = [
    'local',
    'magic',
    'webauthn',
    'google',
    'github',
    'facebook',
    'microsoft',
  ];
  return envStrategies
    .split(',')
    .map((s) => s.trim().toLowerCase() as AuthStrategy)
    .filter((s) => validStrategies.includes(s));
}

export function loadAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const isProduction = env.NODE_ENV === 'production';
  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;

  return {
    strategies: parseStrategies(env),

    jwt: {
      secret: env.JWT_SECRET || '',
      previousSecret: env.JWT_SECRET_PREVIOUS || undefined,
      accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY || '15m',
      issuer: env.JWT_ISSUER || 'abe-stack',
      audience: env.JWT_AUDIENCE || 'abe-stack-api',
    },

    refreshToken: {
      expiryDays: parseInt(env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10),
      gracePeriodSeconds: parseInt(env.REFRESH_TOKEN_GRACE_PERIOD || '30', 10),
    },

    // Argon2id with OWASP recommended params
    argon2: {
      type: 2, // argon2id
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    },

    password: {
      minLength: parseInt(env.PASSWORD_MIN_LENGTH || '8', 10),
      maxLength: parseInt(env.PASSWORD_MAX_LENGTH || '64', 10),
      minZxcvbnScore: parseInt(env.PASSWORD_MIN_SCORE || '3', 10) as 0 | 1 | 2 | 3 | 4,
    },

    lockout: {
      maxAttempts: parseInt(env.LOCKOUT_MAX_ATTEMPTS || '10', 10),
      lockoutDurationMs: parseInt(env.LOCKOUT_DURATION_MS || '1800000', 10), // 30 minutes
      progressiveDelay: true,
      baseDelayMs: 1000,
    },

    bffMode: env.AUTH_BFF_MODE === 'true',

    proxy: {
      trustProxy: env.TRUST_PROXY === 'true',
      trustedProxies: env.TRUSTED_PROXIES
        ? env.TRUSTED_PROXIES.split(',').map((ip) => ip.trim())
        : [],
      maxProxyDepth: parseInt(env.MAX_PROXY_DEPTH || '1', 10),
    },

    rateLimit: {
      login: {
        max: isProduction ? 5 : 100,
        windowMs: 15 * MS_PER_MINUTE,
      },
      register: {
        max: isProduction ? 3 : 100,
        windowMs: MS_PER_HOUR,
      },
      forgotPassword: {
        max: isProduction ? 3 : 100,
        windowMs: MS_PER_HOUR,
      },
      verifyEmail: {
        max: isProduction ? 10 : 100,
        windowMs: MS_PER_HOUR,
      },
    },

    cookie: {
      name: 'refreshToken',
      secret: env.COOKIE_SECRET || env.JWT_SECRET || '',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    },

    oauth: {
      ...(env.GOOGLE_CLIENT_ID && {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET || '',
          callbackUrl: env.GOOGLE_CALLBACK_URL || '/api/auth/oauth/google/callback',
        },
      }),
      ...(env.GITHUB_CLIENT_ID && {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET || '',
          callbackUrl: env.GITHUB_CALLBACK_URL || '/api/auth/oauth/github/callback',
        },
      }),
      ...(env.APPLE_CLIENT_ID && {
        apple: {
          clientId: env.APPLE_CLIENT_ID,
          clientSecret: '', // Apple uses JWT client_secret generated at runtime
          callbackUrl: env.APPLE_CALLBACK_URL || '/api/auth/oauth/apple/callback',
          teamId: env.APPLE_TEAM_ID || '',
          keyId: env.APPLE_KEY_ID || '',
          // Private key can be multiline, support both direct value and base64 encoded
          privateKey: env.APPLE_PRIVATE_KEY_BASE64
            ? Buffer.from(env.APPLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
            : env.APPLE_PRIVATE_KEY || '',
        },
      }),
      ...(env.FACEBOOK_CLIENT_ID && {
        facebook: {
          clientId: env.FACEBOOK_CLIENT_ID,
          clientSecret: env.FACEBOOK_CLIENT_SECRET || '',
          callbackUrl: env.FACEBOOK_CALLBACK_URL || '/api/auth/oauth/facebook/callback',
        },
      }),
      ...(env.MICROSOFT_CLIENT_ID && {
        microsoft: {
          clientId: env.MICROSOFT_CLIENT_ID,
          clientSecret: env.MICROSOFT_CLIENT_SECRET || '',
          callbackUrl: env.MICROSOFT_CALLBACK_URL || '/api/auth/oauth/microsoft/callback',
          tenantId: env.MICROSOFT_TENANT_ID || 'common',
        },
      }),
    },

    magicLink: {
      tokenExpiryMinutes: parseInt(env.MAGIC_LINK_EXPIRY_MINUTES || '15', 10),
      maxAttempts: parseInt(env.MAGIC_LINK_MAX_ATTEMPTS || '3', 10),
    },

    totp: {
      issuer: env.TOTP_ISSUER || 'ABE Stack',
      window: parseInt(env.TOTP_WINDOW || '1', 10),
    },
  };
}

// Helper to check if a strategy is enabled
export function isStrategyEnabled(config: AuthConfig, strategy: AuthStrategy): boolean {
  return config.strategies.includes(strategy);
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Common weak secrets that should never be used in production
 */
const WEAK_SECRETS = new Set([
  'secret',
  'password',
  'jwt_secret',
  'jwt-secret',
  'jwtsecret',
  'my_secret',
  'my-secret',
  'mysecret',
  'changeme',
  'change-me',
  'change_me',
  'test',
  'testing',
  'development',
  'dev',
  'prod',
  'production',
  'default',
  'example',
  'sample',
  '12345678901234567890123456789012', // 32 character numeric pattern
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // 32 character repeated pattern
]);

/**
 * Error thrown when auth configuration validation fails
 */
export class AuthConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = 'AuthConfigValidationError';
  }
}

/**
 * Validates auth configuration at startup
 *
 * Throws AuthConfigValidationError with descriptive messages for:
 * - JWT secret too short (< 32 chars)
 * - JWT secret is a common weak value
 * - Cookie secret too short if set (< 32 chars)
 * - Lockout max attempts out of range (must be 3-20)
 * - Lockout duration too short (< 60000ms / 1 minute)
 * - Refresh token expiry out of range (must be 1-30 days)
 * - Password min length too short (< 8)
 *
 * @param config - The auth configuration to validate
 * @throws AuthConfigValidationError if validation fails
 */
export function validateAuthConfig(config: AuthConfig): void {
  // Validate JWT secret length
  if (config.jwt.secret.length < 32) {
    throw new AuthConfigValidationError(
      `JWT secret must be at least 32 characters long (current: ${config.jwt.secret.length} characters). ` +
        'Use a cryptographically secure random string for production.',
      'jwt.secret',
    );
  }

  // Validate JWT secret is not a weak value
  const normalizedSecret = config.jwt.secret.toLowerCase().trim();
  if (WEAK_SECRETS.has(normalizedSecret)) {
    throw new AuthConfigValidationError(
      'JWT secret is a common weak value and must not be used. ' +
        'Use a cryptographically secure random string for production.',
      'jwt.secret',
    );
  }

  // Check for repeating character patterns (e.g., "aaaa..." or "1111...")
  if (/^(.)\1{31,}$/.test(config.jwt.secret)) {
    throw new AuthConfigValidationError(
      'JWT secret contains a repeating character pattern and is not secure. ' +
        'Use a cryptographically secure random string for production.',
      'jwt.secret',
    );
  }

  // Validate cookie secret if set (not empty)
  if (config.cookie.secret && config.cookie.secret.length > 0 && config.cookie.secret.length < 32) {
    throw new AuthConfigValidationError(
      `Cookie secret must be at least 32 characters long if set (current: ${config.cookie.secret.length} characters). ` +
        'Use a cryptographically secure random string for production.',
      'cookie.secret',
    );
  }

  // Validate lockout max attempts (3-20)
  if (config.lockout.maxAttempts < 3 || config.lockout.maxAttempts > 20) {
    throw new AuthConfigValidationError(
      `Lockout max attempts must be between 3 and 20 (current: ${config.lockout.maxAttempts}). ` +
        'Too few attempts frustrate users; too many allow brute force attacks.',
      'lockout.maxAttempts',
    );
  }

  // Validate lockout duration (>= 60000ms / 1 minute)
  if (config.lockout.lockoutDurationMs < 60000) {
    throw new AuthConfigValidationError(
      `Lockout duration must be at least 60000ms (1 minute) (current: ${config.lockout.lockoutDurationMs}ms). ` +
        'Short lockout durations do not effectively prevent brute force attacks.',
      'lockout.lockoutDurationMs',
    );
  }

  // Validate refresh token expiry (1-30 days)
  if (config.refreshToken.expiryDays < 1 || config.refreshToken.expiryDays > 30) {
    throw new AuthConfigValidationError(
      `Refresh token expiry must be between 1 and 30 days (current: ${config.refreshToken.expiryDays} days). ` +
        'Shorter expiry improves security; longer expiry improves user experience.',
      'refreshToken.expiryDays',
    );
  }

  // Validate password min length (>= 8)
  if (config.password.minLength < 8) {
    throw new AuthConfigValidationError(
      `Password minimum length must be at least 8 characters (current: ${config.password.minLength}). ` +
        'NIST guidelines recommend a minimum of 8 characters for user-chosen passwords.',
      'password.minLength',
    );
  }
}

// Helper to get cookie options for refresh token
export function getRefreshCookieOptions(config: AuthConfig) {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.refreshToken.expiryDays * 24 * 60 * 60, // days to seconds
  };
}
