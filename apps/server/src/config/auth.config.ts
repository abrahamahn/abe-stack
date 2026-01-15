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
