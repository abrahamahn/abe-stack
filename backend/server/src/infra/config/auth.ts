// backend/server/src/infra/config/auth.ts
/**
 * Authentication configuration for the server
 * Centralized configuration for all auth-related settings
 */

export type AuthStrategy = 'local' | 'magic' | 'webauthn' | 'google' | 'github' | 'apple';

export interface AuthConfig {
  /** Enabled authentication strategies */
  strategies: AuthStrategy[];

  /** Password hashing (Argon2id) */
  argon2: {
    type: 0 | 1 | 2; // 0=argon2d, 1=argon2i, 2=argon2id
    memoryCost: number; // in KiB
    timeCost: number;
    parallelism: number;
  };

  /** Token expiry settings */
  accessTokenExpiry: string | number;
  refreshTokenExpiryDays: number;
  refreshTokenGracePeriodSeconds: number;

  /** Rate limiting per endpoint */
  rateLimit: {
    login: { max: number; windowMs: number };
    register: { max: number; windowMs: number };
    forgotPassword: { max: number; windowMs: number };
    verifyEmail: { max: number; windowMs: number };
  };

  /** Account lockout settings */
  lockout: {
    maxAttempts: number;
    lockoutDurationMs: number;
    progressiveDelay: boolean;
    baseDelayMs: number;
  };

  /** Password policy */
  password: {
    minLength: number;
    maxLength: number;
    minZxcvbnScore: 0 | 1 | 2 | 3 | 4;
  };

  /** BFF mode (tokens never in browser) */
  bffMode: boolean;

  /** Cookie settings */
  cookie: {
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
  };

  /** Proxy configuration for IP extraction */
  proxy: {
    trustProxy: boolean;
    trustedProxies: string[];
    maxProxyDepth: number;
  };

  /** OAuth providers (only loaded if strategy enabled) */
  oauth: {
    google?: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    apple?: {
      clientId: string;
      teamId: string;
      keyId: string;
      privateKey: string;
      callbackUrl: string;
    };
  };
}

/**
 * Parse enabled strategies from environment
 */
function parseStrategies(): AuthStrategy[] {
  const envStrategies = process.env.AUTH_STRATEGIES || 'local';
  const validStrategies: AuthStrategy[] = [
    'local',
    'magic',
    'webauthn',
    'google',
    'github',
    'apple',
  ];
  return envStrategies
    .split(',')
    .map((s) => s.trim().toLowerCase() as AuthStrategy)
    .filter((s) => validStrategies.includes(s));
}

/**
 * Create authentication configuration from environment
 * @param isProduction - Whether running in production mode
 */
export function createAuthConfig(isProduction: boolean): AuthConfig {
  return {
    strategies: parseStrategies(),

    // Password hashing - Argon2id with OWASP recommended params
    argon2: {
      type: 2, // argon2id (recommended)
      memoryCost: 19456, // 19 MiB (OWASP minimum)
      timeCost: 2, // 2 iterations
      parallelism: 1, // 1 thread
    },

    // Token expiry
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiryDays: parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10),
    refreshTokenGracePeriodSeconds: parseInt(process.env.REFRESH_TOKEN_GRACE_PERIOD || '30', 10),

    // Rate limiting - stricter in production
    rateLimit: {
      login: {
        max: isProduction ? 5 : 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
      },
      register: {
        max: isProduction ? 3 : 100,
        windowMs: 60 * 60 * 1000, // 1 hour
      },
      forgotPassword: {
        max: isProduction ? 3 : 100,
        windowMs: 60 * 60 * 1000, // 1 hour
      },
      verifyEmail: {
        max: isProduction ? 10 : 100,
        windowMs: 60 * 60 * 1000, // 1 hour
      },
    },

    // Account lockout
    lockout: {
      maxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '10', 10),
      lockoutDurationMs: parseInt(process.env.LOCKOUT_DURATION_MS || '1800000', 10), // 30 minutes
      progressiveDelay: true,
      baseDelayMs: 1000, // Start with 1 second delay
    },

    // Password policy (NIST guidelines)
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
      maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '64', 10),
      minZxcvbnScore: parseInt(process.env.PASSWORD_MIN_SCORE || '3', 10) as 0 | 1 | 2 | 3 | 4,
    },

    // BFF mode
    bffMode: process.env.AUTH_BFF_MODE === 'true',

    // Cookie configuration
    cookie: {
      name: 'refreshToken',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    },

    // Proxy configuration
    proxy: {
      trustProxy: process.env.TRUST_PROXY === 'true',
      trustedProxies: process.env.TRUSTED_PROXIES
        ? process.env.TRUSTED_PROXIES.split(',').map((ip) => ip.trim())
        : [],
      maxProxyDepth: parseInt(process.env.MAX_PROXY_DEPTH || '1', 10),
    },

    // OAuth providers
    oauth: {
      ...(process.env.GOOGLE_CLIENT_ID && {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        },
      }),
      ...(process.env.GITHUB_CLIENT_ID && {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
          callbackUrl: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
        },
      }),
      ...(process.env.APPLE_CLIENT_ID && {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          teamId: process.env.APPLE_TEAM_ID || '',
          keyId: process.env.APPLE_KEY_ID || '',
          privateKey: process.env.APPLE_PRIVATE_KEY || '',
          callbackUrl: process.env.APPLE_CALLBACK_URL || '/auth/apple/callback',
        },
      }),
    },
  };
}

/**
 * Check if a strategy is enabled
 */
export function isStrategyEnabled(config: AuthConfig, strategy: AuthStrategy): boolean {
  return config.strategies.includes(strategy);
}

/**
 * Get cookie options for refresh token
 */
export function getRefreshCookieOptions(config: AuthConfig) {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.refreshTokenExpiryDays * 24 * 60 * 60, // days to seconds
  };
}

// Legacy export for backwards compatibility during migration
const isProduction = process.env.NODE_ENV === 'production';
export const authConfig: AuthConfig = createAuthConfig(isProduction);
