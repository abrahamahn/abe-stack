// backend/server/src/env.ts
/**
 * ServerEnvironment - Unified Dependency Injection Container
 *
 * This is the single source of truth for all server dependencies.
 * Initialize once at startup, pass to all services/routes via function arguments.
 *
 * Benefits:
 * - No singletons or global state
 * - Testing is trivial (inject MockEnvironment)
 * - All configuration in one place
 * - Type-safe dependency access
 */

import { createDbClient } from '@db';
import { createStorage, toStorageConfig } from '@storage';

import type { DbClient } from '@db';
import type { StorageProvider } from '@storage';
import type { ServerEnv } from '@abe-stack/shared';

// ============================================================================
// Token Types
// ============================================================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export type AuthStrategy = 'local' | 'magic' | 'webauthn' | 'google' | 'github' | 'apple';

export interface ServerConfig {
  /** Application environment from process.env */
  app: ServerEnv;

  /** Whether running in production mode */
  isProduction: boolean;

  /** Authentication configuration */
  auth: {
    strategies: AuthStrategy[];
    accessTokenExpiry: string | number;
    refreshTokenExpiryDays: number;
    refreshTokenGracePeriodSeconds: number;
    bffMode: boolean;
  };

  /** Password hashing (Argon2id) */
  argon2: {
    type: 0 | 1 | 2;
    memoryCost: number;
    timeCost: number;
    parallelism: number;
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

  /** OAuth providers */
  oauth: {
    google?: { clientId: string; clientSecret: string; callbackUrl: string };
    github?: { clientId: string; clientSecret: string; callbackUrl: string };
    apple?: { clientId: string; teamId: string; keyId: string; privateKey: string; callbackUrl: string };
  };
}

// ============================================================================
// Email Service Types
// ============================================================================

export interface EmailService {
  sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string }>;
}

// ============================================================================
// Security Service Types
// ============================================================================

export interface LockoutStatus {
  isLocked: boolean;
  failedAttempts: number;
  remainingMs: number;
}

export interface SecurityService {
  // Token management
  createAccessToken(userId: string, email: string, role: string): string;
  createRefreshToken(): string;
  verifyToken(token: string): { userId: string; email: string; role: string };

  // Password hashing
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  verifyPasswordSafe(password: string, hash: string | null | undefined): Promise<boolean>;
  needsRehash(hash: string): boolean;

  // Account lockout
  isAccountLocked(db: DbClient, email: string): Promise<boolean>;
  getFailedAttemptCount(db: DbClient, email: string): Promise<number>;
  getAccountLockoutStatus(db: DbClient, email: string): Promise<LockoutStatus>;
  calculateDelay(attemptCount: number): number;
  applyProgressiveDelay(db: DbClient, email: string): Promise<void>;

  // Login attempt logging
  logLoginAttempt(
    db: DbClient,
    email: string,
    success: boolean,
    ipAddress?: string | null,
    userAgent?: string | null,
    failureReason?: string | null,
  ): Promise<void>;

  // Refresh token helpers
  getRefreshTokenExpiry(): Date;

  // Account management
  unlockAccount(
    db: DbClient,
    email: string,
    adminUserId: string,
    onUnlock: (
      userId: string,
      email: string,
      adminUserId: string,
      ip?: string | null,
      ua?: string | null,
    ) => Promise<void>,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void>;
}

// ============================================================================
// ServerEnvironment Interface
// ============================================================================

export interface ServerEnvironment {
  /** Unified configuration */
  config: ServerConfig;

  /** Database client */
  db: DbClient;

  /** Storage provider (S3/Local) */
  storage: StorageProvider;

  /** Email service */
  mailer: EmailService;

  /** Security utilities */
  security: SecurityService;
}

// ============================================================================
// Configuration Factory
// ============================================================================

function parseStrategies(): AuthStrategy[] {
  const envStrategies = process.env.AUTH_STRATEGIES || 'local';
  const valid: AuthStrategy[] = ['local', 'magic', 'webauthn', 'google', 'github', 'apple'];
  return envStrategies
    .split(',')
    .map((s) => s.trim().toLowerCase() as AuthStrategy)
    .filter((s) => valid.includes(s));
}

export function createConfig(app: ServerEnv, isProduction: boolean): ServerConfig {
  return {
    app,
    isProduction,

    auth: {
      strategies: parseStrategies(),
      accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
      refreshTokenExpiryDays: parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10),
      refreshTokenGracePeriodSeconds: parseInt(process.env.REFRESH_TOKEN_GRACE_PERIOD || '30', 10),
      bffMode: process.env.AUTH_BFF_MODE === 'true',
    },

    argon2: {
      type: 2, // argon2id
      memoryCost: 19456, // 19 MiB (OWASP minimum)
      timeCost: 2,
      parallelism: 1,
    },

    lockout: {
      maxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '10', 10),
      lockoutDurationMs: parseInt(process.env.LOCKOUT_DURATION_MS || '1800000', 10),
      progressiveDelay: true,
      baseDelayMs: 1000,
    },

    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
      maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '64', 10),
      minZxcvbnScore: parseInt(process.env.PASSWORD_MIN_SCORE || '3', 10) as 0 | 1 | 2 | 3 | 4,
    },

    cookie: {
      name: 'refreshToken',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    },

    proxy: {
      trustProxy: process.env.TRUST_PROXY === 'true',
      trustedProxies: process.env.TRUSTED_PROXIES
        ? process.env.TRUSTED_PROXIES.split(',').map((ip) => ip.trim())
        : [],
      maxProxyDepth: parseInt(process.env.MAX_PROXY_DEPTH || '1', 10),
    },

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

// ============================================================================
// Email Service Factory
// ============================================================================

function createEmailService(isProduction: boolean): EmailService {
  return {
    sendEmail: async (options) => {
      if (!isProduction) {
        // eslint-disable-next-line no-console
        console.log('[DEV EMAIL]', options.to, options.subject);
        return { success: true, messageId: 'dev-' + Date.now() };
      }
      // TODO: Implement production email (SendGrid, SES, etc.)
      return { success: true, messageId: 'prod-' + Date.now() };
    },
  };
}

// ============================================================================
// Security Service Factory
// ============================================================================

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loginAttempts, users } from '@db';
import { count, eq, and, gte } from 'drizzle-orm';

function createSecurityService(config: ServerConfig): SecurityService {
  const jwtSecret = process.env.JWT_SECRET || '';

  const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$dW5yZWFjaGFibGVkdW1teWhhc2g$N8Z0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0';

  return {
    createAccessToken(userId, email, role) {
      return jwt.sign({ userId, email, role }, jwtSecret, {
        expiresIn: config.auth.accessTokenExpiry as jwt.SignOptions['expiresIn'],
      });
    },

    createRefreshToken() {
      return crypto.randomBytes(32).toString('hex');
    },

    verifyToken(token) {
      const payload = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
      return { userId: payload.userId, email: payload.email, role: payload.role };
    },

    async hashPassword(password) {
      return argon2.hash(password, {
        memoryCost: config.argon2.memoryCost,
        timeCost: config.argon2.timeCost,
        parallelism: config.argon2.parallelism,
      });
    },

    async verifyPassword(password, hash) {
      try {
        return await argon2.verify(hash, password);
      } catch {
        return false;
      }
    },

    async verifyPasswordSafe(password, hash) {
      const hashToVerify = hash || DUMMY_HASH;
      const isValid = await argon2.verify(hashToVerify, password).catch(() => false);
      return hash ? isValid : false;
    },

    needsRehash(hash) {
      return argon2.needsRehash(hash, {
        memoryCost: config.argon2.memoryCost,
        timeCost: config.argon2.timeCost,
        parallelism: config.argon2.parallelism,
      });
    },

    async isAccountLocked(db, email) {
      const failedCount = await this.getFailedAttemptCount(db, email);
      return failedCount >= config.lockout.maxAttempts;
    },

    async getFailedAttemptCount(db, email) {
      const windowStart = new Date(Date.now() - config.lockout.lockoutDurationMs);
      const result = await db
        .select({ count: count() })
        .from(loginAttempts)
        .where(
          and(
            eq(loginAttempts.email, email),
            eq(loginAttempts.success, false),
            gte(loginAttempts.createdAt, windowStart),
          ),
        );
      return result[0]?.count ?? 0;
    },

    calculateDelay(attemptCount) {
      if (!config.lockout.progressiveDelay || attemptCount <= 1) return 0;
      return Math.min(config.lockout.baseDelayMs * Math.pow(2, attemptCount - 2), 30000);
    },

    async getAccountLockoutStatus(db, email) {
      const failedAttempts = await this.getFailedAttemptCount(db, email);
      const isLocked = failedAttempts >= config.lockout.maxAttempts;
      const remainingMs = isLocked ? config.lockout.lockoutDurationMs : 0;
      return { isLocked, failedAttempts, remainingMs };
    },

    async applyProgressiveDelay(db, email) {
      const attemptCount = await this.getFailedAttemptCount(db, email);
      const delay = this.calculateDelay(attemptCount);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    },

    async logLoginAttempt(db, email, success, ipAddress, userAgent, failureReason) {
      await db.insert(loginAttempts).values({
        email,
        success,
        ipAddress,
        userAgent,
        failureReason: failureReason ?? null,
      });
    },

    getRefreshTokenExpiry() {
      const days = config.auth.refreshTokenExpiryDays;
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    },

    async unlockAccount(db, email, adminUserId, onUnlock, ipAddress, userAgent) {
      // Delete failed login attempts for this email
      await db.delete(loginAttempts).where(
        and(
          eq(loginAttempts.email, email),
          eq(loginAttempts.success, false),
        ),
      );

      // Get user ID for logging
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (user) {
        await onUnlock(user.id, email, adminUserId, ipAddress, userAgent);
      }
    },
  };
}

// ============================================================================
// Environment Factory
// ============================================================================

export interface CreateEnvOptions {
  app: ServerEnv;
  connectionString: string;
  db?: DbClient;
}

export function createEnv(options: CreateEnvOptions): ServerEnvironment {
  const isProduction = process.env.NODE_ENV === 'production';
  const config = createConfig(options.app, isProduction);

  const db = options.db ?? createDbClient(options.connectionString);
  const storage = createStorage(toStorageConfig(options.app));
  const mailer = createEmailService(isProduction);
  const security = createSecurityService(config);

  return { config, db, storage, mailer, security };
}

// ============================================================================
// Mock Environment for Testing
// ============================================================================

export function createMockEnv(overrides: Partial<ServerEnvironment> = {}): ServerEnvironment {
  const config = createConfig({} as ServerEnv, false);

  const defaults: ServerEnvironment = {
    config,
    db: {} as DbClient,
    storage: {} as StorageProvider,
    mailer: createEmailService(false),
    security: createSecurityService(config),
  };

  return { ...defaults, ...overrides };
}

// ============================================================================
// Environment Validation
// ============================================================================

const MIN_JWT_SECRET_LENGTH = 32;

export function validateEnv(): void {
  const errors: string[] = [];

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (errors.length > 0) {
    throw new Error('Environment validation failed:\n  - ' + errors.join('\n  - '));
  }
}

// ============================================================================
// Cookie Helpers
// ============================================================================

export function getRefreshCookieOptions(config: ServerConfig) {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.auth.refreshTokenExpiryDays * 24 * 60 * 60,
  };
}
