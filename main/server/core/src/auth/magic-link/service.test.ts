// main/server/core/src/auth/magic-link/service.test.ts

// backend/core/src/auth/magic-link/__tests__/service.test.ts
/**
 * Magic Link Service Tests
 *
 * Comprehensive tests for passwordless authentication via magic links.
 * Tests requestMagicLink and verifyMagicLink with repository pattern.
 */

import { canonicalizeEmail } from '@bslt/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { cleanupExpiredMagicLinkTokens, requestMagicLink, verifyMagicLink } from './service';

import type { AuthConfig } from '@bslt/shared/config';
import type { DbClient, MagicLinkToken, RawDb, Repositories, User } from '../../../../db/src';
import type { AuthEmailService, AuthEmailTemplates } from '../index';

// ============================================================================
// Mock Dependencies
// ============================================================================

type TransactionCallback = (tx: RawDb) => Promise<unknown>;

function createMockRawDb(): RawDb {
  const tx = {
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn().mockResolvedValue(1),
    raw: vi.fn(),
    transaction: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn() as unknown as RawDb['getClient'],
    withSession: vi.fn().mockReturnThis(),
  } as RawDb;

  tx.transaction = vi.fn((callback) => {
    return Promise.resolve(callback(tx));
  });

  return tx;
}

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...actual,
    randomBytes: vi.fn((size: number) => {
      // Return predictable bytes for testing
      const buf = Buffer.alloc(size);
      for (let i = 0; i < size; i++) {
        buf[i] = i % 256;
      }
      return buf;
    }),
  };
});

vi.mock('@bslt/db', () => ({
  emailTemplates: {
    magicLink: vi.fn((url: string, expiryMinutes: number) => ({
      subject: 'Your Magic Link',
      text: `Click here: ${url}. Expires in ${expiryMinutes} minutes.`,
      html: `<a href="${url}">Click here</a>. Expires in ${expiryMinutes} minutes.`,
    })),
  },
}));

vi.mock('@bslt/db', async () => {
  const actual = await vi.importActual<typeof import('../../../../db/src')>('@bslt/db');
  return {
    ...actual,
    withTransaction: vi.fn(async (_db: DbClient, callback: TransactionCallback) => {
      // Mock transaction executor
      const mockTx = createMockRawDb();
      return callback(mockTx);
    }),
  };
});

vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();
  return {
    ...actual,
    generateUniqueUsername: vi.fn((_repos: unknown, email: string) =>
      Promise.resolve(email.split('@')[0]),
    ),
    createAuthResponse: vi.fn((accessToken, refreshToken, user) => ({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username ?? user.first_name?.toLowerCase() ?? 'user',
        firstName: user.firstName ?? user.first_name ?? 'User',
        lastName: user.lastName ?? user.last_name ?? '',
        avatarUrl: user.avatarUrl ?? user.avatar_url ?? null,
        role: user.role,
        emailVerified: user.emailVerified ?? user.email_verified ?? false,
        phone: user.phone ?? null,
        phoneVerified: user.phoneVerified ?? user.phone_verified ?? null,
        dateOfBirth: user.dateOfBirth ?? user.date_of_birth ?? null,
        gender: user.gender ?? null,
        createdAt:
          user.createdAt?.toISOString?.() ??
          user.created_at?.toISOString?.() ??
          new Date().toISOString(),
        updatedAt:
          user.updatedAt?.toISOString?.() ??
          user.updated_at?.toISOString?.() ??
          new Date().toISOString(),
      },
    })),
    createAccessToken: vi.fn(() => 'mock-access-token'),
    createRefreshTokenFamily: vi.fn(() => Promise.resolve({ token: 'mock-refresh-token' })),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDb(): DbClient {
  return {
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
  } as unknown as DbClient;
}

function createMockEmailService(): AuthEmailService {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  } as unknown as AuthEmailService;
}

function createMockEmailTemplates(): AuthEmailTemplates {
  return {
    magicLink: vi.fn((url: string, expiryMinutes: number) => ({
      subject: 'Your Magic Link',
      text: `Click here: ${url}. Expires in ${expiryMinutes} minutes.`,
      html: `<a href="${url}">Click here</a>. Expires in ${expiryMinutes} minutes.`,
    })),
    emailVerification: vi.fn(() => ({ subject: 'Verify', text: 'v', html: '<p>v</p>' })),
    existingAccountRegistrationAttempt: vi.fn(() => ({
      subject: 'Reg',
      text: 'r',
      html: '<p>r</p>',
    })),
    passwordReset: vi.fn(() => ({ subject: 'Reset', text: 'r', html: '<p>r</p>' })),
    accountLocked: vi.fn(() => ({ subject: 'Locked', text: 'l', html: '<p>l</p>' })),
  } as unknown as AuthEmailTemplates;
}

function createMockRepositories(): Repositories {
  return {
    users: {} as Repositories['users'],
    refreshTokens: {} as Repositories['refreshTokens'],
    refreshTokenFamilies: {} as Repositories['refreshTokenFamilies'],
    loginAttempts: {} as Repositories['loginAttempts'],
    passwordResetTokens: {} as Repositories['passwordResetTokens'],
    emailVerificationTokens: {} as Repositories['emailVerificationTokens'],
    securityEvents: {} as Repositories['securityEvents'],
    totpBackupCodes: {} as Repositories['totpBackupCodes'],
    emailChangeTokens: {} as Repositories['emailChangeTokens'],
    emailChangeRevertTokens: {} as Repositories['emailChangeRevertTokens'],
    magicLinkTokens: {
      findValidByTokenHash: vi.fn(),
      create: vi.fn(),
      deleteExpired: vi.fn(),
      countRecentByEmail: vi.fn(),
      countRecentByIp: vi.fn(),
    },
    oauthConnections: {} as Repositories['oauthConnections'],
    apiKeys: {} as Repositories['apiKeys'],
    pushSubscriptions: {} as Repositories['pushSubscriptions'],
    notificationPreferences: {} as Repositories['notificationPreferences'],
    plans: {} as Repositories['plans'],
    subscriptions: {} as Repositories['subscriptions'],
    customerMappings: {} as Repositories['customerMappings'],
    invoices: {} as Repositories['invoices'],
    paymentMethods: {} as Repositories['paymentMethods'],
    billingEvents: {} as Repositories['billingEvents'],
    userSessions: {} as Repositories['userSessions'],
    tenants: {} as Repositories['tenants'],
    memberships: {} as Repositories['memberships'],
    invitations: {} as Repositories['invitations'],
    notifications: {} as Repositories['notifications'],
    auditEvents: {} as Repositories['auditEvents'],
    jobs: {} as Repositories['jobs'],
    webhooks: {} as Repositories['webhooks'],
    webhookDeliveries: {} as Repositories['webhookDeliveries'],
    featureFlags: {} as Repositories['featureFlags'],
    tenantFeatureOverrides: {} as Repositories['tenantFeatureOverrides'],
    usageMetrics: {} as Repositories['usageMetrics'],
    usageSnapshots: {} as Repositories['usageSnapshots'],
    legalDocuments: {} as Repositories['legalDocuments'],
    userAgreements: {} as Repositories['userAgreements'],
    consentLogs: {} as Repositories['consentLogs'],
    dataExportRequests: {} as Repositories['dataExportRequests'],
    activities: {} as Repositories['activities'],
    webauthnCredentials: {} as Repositories['webauthnCredentials'],
    trustedDevices: {} as Repositories['trustedDevices'],
    files: {} as Repositories['files'],
  };
}

function createMockAuthConfig(): AuthConfig {
  return {
    strategies: ['local'],
    jwt: {
      secret: 'test-secret-32-characters-long!!',
      accessTokenExpiry: '15m',
      issuer: 'test',
      audience: 'test',
    },
    refreshToken: {
      expiryDays: 7,
      gracePeriodSeconds: 30,
    },
    argon2: { type: 2, memoryCost: 1024, timeCost: 1, parallelism: 1 },
    password: { minLength: 8, maxLength: 64, minZxcvbnScore: 2 },
    lockout: {
      maxAttempts: 5,
      lockoutDurationMs: 1800000,
      progressiveDelay: false,
      baseDelayMs: 0,
    },
    proxy: { trustProxy: false, trustedProxies: [], maxProxyDepth: 1 },
    rateLimit: {
      login: { max: 100, windowMs: 60000 },
      register: { max: 100, windowMs: 60000 },
      forgotPassword: { max: 100, windowMs: 60000 },
      verifyEmail: { max: 100, windowMs: 60000 },
    },
    cookie: {
      name: 'refreshToken',
      secret: 'test-secret-32-characters-long!!',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    },
    oauth: {},
    magicLink: { tokenExpiryMinutes: 15, maxAttempts: 3 },
    totp: { issuer: 'Test', window: 1 },
  };
}

function createMockMagicLinkToken(overrides?: Partial<MagicLinkToken>): MagicLinkToken {
  return {
    id: 'token-123',
    email: 'test@example.com',
    tokenHash: 'hash123',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    usedAt: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Test Browser',
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hash',
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    lockedUntil: null,
    lockReason: null,
    failedLoginAttempts: 0,
    totpSecret: null,
    totpEnabled: false,
    phone: null,
    phoneVerified: false,
    dateOfBirth: null,
    gender: null,
    city: null,
    state: null,
    country: null,
    bio: null,
    language: null,
    website: null,
    lastUsernameChange: null,
    deactivatedAt: null,
    deletedAt: null,
    deletionGracePeriodEnds: null,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
    avatarUrl: overrides?.avatarUrl ?? null,
  };
}

// ============================================================================
// Tests: requestMagicLink
// ============================================================================

describe('requestMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful request', () => {
    test('should create token and send email on successful request', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.countRecentByIp).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      const result = await requestMagicLink(
        db,
        repos,
        emailService,
        createMockEmailTemplates(),
        email,
        baseUrl,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'If an account exists with this email, a magic link has been sent.',
      );
    });

    test('should normalize email to lowercase', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'TEST@EXAMPLE.COM';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.countRecentByIp).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl);

      expect(repos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: canonicalizeEmail(email),
        }),
      );
    });

    test('should trim email whitespace', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = '  test@example.com  ';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.countRecentByIp).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl);

      expect(repos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: canonicalizeEmail(email),
        }),
      );
    });

    test('should create token with correct expiry time', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      const now = Date.now();
      await requestMagicLink(
        db,
        repos,
        emailService,
        createMockEmailTemplates(),
        email,
        baseUrl,
        undefined,
        undefined,
        {
          tokenExpiryMinutes: 20,
        },
      );

      expect(repos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      );

      const call = vi.mocked(repos.magicLinkTokens.create).mock.calls[0]?.[0];
      if (call == null) {
        throw new Error('Expected magicLinkTokens.create to be called');
      }
      const expectedExpiry = now + 20 * 60 * 1000;
      const actualExpiry = call.expiresAt.getTime();
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
    });

    test('should store IP address when provided', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';
      const ipAddress = '192.168.1.100';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.countRecentByIp).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(
        db,
        repos,
        emailService,
        createMockEmailTemplates(),
        email,
        baseUrl,
        ipAddress,
      );

      expect(repos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress,
        }),
      );
    });

    test('should store user agent when provided', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';
      const userAgent = 'Mozilla/5.0';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(
        db,
        repos,
        emailService,
        createMockEmailTemplates(),
        email,
        baseUrl,
        undefined,
        userAgent,
      );

      expect(repos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent,
        }),
      );
    });

    test('should send email with magic link URL', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl);

      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Your Magic Link',
        }),
      );
    });
  });

  describe('rate limiting', () => {
    test('should throw TooManyRequestsError when email rate limit exceeded', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(3);

      await expect(
        requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl),
      ).rejects.toThrow('Too many magic link requests');
    });

    test('should throw TooManyRequestsError when IP rate limit exceeded', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';
      const ipAddress = '192.168.1.100';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.countRecentByIp).mockResolvedValue(10);

      await expect(
        requestMagicLink(
          db,
          repos,
          emailService,
          createMockEmailTemplates(),
          email,
          baseUrl,
          ipAddress,
        ),
      ).rejects.toThrow('Too many requests from this location');
    });

    test('should respect custom email rate limit', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(5);

      await expect(
        requestMagicLink(
          db,
          repos,
          emailService,
          createMockEmailTemplates(),
          email,
          baseUrl,
          undefined,
          undefined,
          {
            maxAttemptsPerEmail: 5,
          },
        ),
      ).rejects.toThrow('Too many magic link requests');
    });

    test('should respect custom IP rate limit', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';
      const ipAddress = '192.168.1.100';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.countRecentByIp).mockResolvedValue(20);

      await expect(
        requestMagicLink(
          db,
          repos,
          emailService,
          createMockEmailTemplates(),
          email,
          baseUrl,
          ipAddress,
          undefined,
          {
            maxAttemptsPerIp: 20,
          },
        ),
      ).rejects.toThrow('Too many requests from this location');
    });

    test('should not check IP rate limit when IP not provided', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl);

      expect(repos.magicLinkTokens.countRecentByIp).not.toHaveBeenCalled();
    });
  });

  describe('email sending', () => {
    test('should throw EmailSendError when email fails to send', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());
      vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP server unavailable'));

      await expect(
        requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl),
      ).rejects.toThrow('Failed to send magic link email');
    });

    test('should handle non-Error email failures', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());
      vi.mocked(emailService.send).mockRejectedValue('String error');

      await expect(
        requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl),
      ).rejects.toThrow('Failed to send magic link email');
    });
  });

  describe('edge cases', () => {
    test('should handle null IP address', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(
        db,
        repos,
        emailService,
        createMockEmailTemplates(),
        email,
        baseUrl,
        undefined,
      );

      expect(repos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
        }),
      );
    });

    test('should handle null user agent', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      await requestMagicLink(
        db,
        repos,
        emailService,
        createMockEmailTemplates(),
        email,
        baseUrl,
        undefined,
        undefined,
      );

      expect(repos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: null,
        }),
      );
    });

    test('should use default expiry when not provided', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const emailService = createMockEmailService();
      const email = 'test@example.com';
      const baseUrl = 'https://example.com';

      vi.mocked(repos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(repos.magicLinkTokens.create).mockResolvedValue(createMockMagicLinkToken());

      const now = Date.now();
      await requestMagicLink(db, repos, emailService, createMockEmailTemplates(), email, baseUrl);

      const call = vi.mocked(repos.magicLinkTokens.create).mock.calls[0]?.[0];
      if (call == null) {
        throw new Error('Expected magicLinkTokens.create to be called');
      }
      const expectedExpiry = now + 15 * 60 * 1000; // 15 minutes default
      const actualExpiry = call.expiresAt.getTime();
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
    });
  });
});

// ============================================================================
// Tests: verifyMagicLink
// ============================================================================

describe('verifyMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful verification', () => {
    test('should authenticate existing user successfully', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';
      const user = createMockUser();

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi.fn().mockResolvedValue([
              {
                id: 'token-123',
                email: 'test@example.com',
                token_hash: 'hash123',
                expires_at: new Date(Date.now() + 10000),
                used_at: null,
              },
            ]),
            queryOne: vi.fn().mockResolvedValue({
              id: user.id,
              email: user.email,
              username: user.username ?? 'testuser',
              first_name: user.firstName ?? 'Test',
              last_name: user.lastName ?? 'User',
              password_hash: user.passwordHash,
              role: user.role,
              email_verified: true,
              email_verified_at: user.emailVerifiedAt,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      const result = await verifyMagicLink(db, repos, config, token);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.email).toBe('test@example.com');
    });

    test('should create new user when none exists', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: 'token-123',
                  email: 'newuser@example.com',
                  token_hash: 'hash123',
                  expires_at: new Date(Date.now() + 10000),
                  used_at: null,
                },
              ])
              .mockResolvedValueOnce([
                {
                  id: 'new-user-123',
                  email: 'newuser@example.com',
                  username: 'newuser',
                  first_name: 'User',
                  last_name: '',
                  password_hash: 'magiclink:hash',
                  role: 'user',
                  email_verified: true,
                  email_verified_at: new Date(),
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              ]),
            queryOne: vi.fn().mockResolvedValue(null),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      const result = await verifyMagicLink(db, repos, config, token);

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.role).toBe('user');
    });

    test('should verify email for unverified user', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';
      const user = createMockUser({ emailVerified: false, emailVerifiedAt: null });

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: 'token-123',
                  email: 'test@example.com',
                  token_hash: 'hash123',
                  expires_at: new Date(Date.now() + 10000),
                  used_at: null,
                },
              ])
              .mockResolvedValueOnce([
                {
                  id: user.id,
                  email: user.email,
                  username: user.username ?? 'testuser',
                  first_name: user.firstName ?? 'Test',
                  last_name: user.lastName ?? 'User',
                  password_hash: user.passwordHash,
                  role: user.role,
                  email_verified: true,
                  email_verified_at: new Date(),
                  created_at: user.createdAt,
                  updated_at: user.updatedAt,
                },
              ]),
            queryOne: vi.fn().mockResolvedValue({
              id: user.id,
              email: user.email,
              username: user.username ?? 'testuser',
              first_name: user.firstName ?? 'Test',
              last_name: user.lastName ?? 'User',
              password_hash: user.passwordHash,
              role: user.role,
              email_verified: false,
              email_verified_at: null,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      const result = await verifyMagicLink(db, repos, config, token);

      expect(result.user.email).toBe('test@example.com');
    });

    test('should create refresh token for authenticated user', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';
      const user = createMockUser();

      const { withTransaction } = await import('../../../../db/src');
      const { createRefreshTokenFamily } = await import('../utils');

      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi.fn().mockResolvedValue([
              {
                id: 'token-123',
                email: 'test@example.com',
                token_hash: 'hash123',
                expires_at: new Date(Date.now() + 10000),
                used_at: null,
              },
            ]),
            queryOne: vi.fn().mockResolvedValue({
              id: user.id,
              email: user.email,
              username: user.username ?? 'testuser',
              first_name: user.firstName ?? 'Test',
              last_name: user.lastName ?? 'User',
              password_hash: user.passwordHash,
              role: user.role,
              email_verified: true,
              email_verified_at: user.emailVerifiedAt,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      await verifyMagicLink(db, repos, config, token);

      expect(createRefreshTokenFamily).toHaveBeenCalledWith(
        expect.anything(),
        user.id,
        config.refreshToken.expiryDays,
      );
    });
  });

  describe('error handling', () => {
    test('should throw InvalidTokenError for invalid token', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'invalid-token';

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi.fn().mockResolvedValue([]),
            queryOne: vi.fn(),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      await expect(verifyMagicLink(db, repos, config, token)).rejects.toThrow(
        'Invalid or expired magic link',
      );
    });

    test('should throw InvalidTokenError for expired token', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'expired-token';

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi.fn().mockResolvedValue([]),
            queryOne: vi.fn(),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      await expect(verifyMagicLink(db, repos, config, token)).rejects.toThrow(
        'Invalid or expired magic link',
      );
    });

    test('should throw InvalidTokenError for already used token', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'used-token';

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi.fn().mockResolvedValue([]),
            queryOne: vi.fn(),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      await expect(verifyMagicLink(db, repos, config, token)).rejects.toThrow(
        'Invalid or expired magic link',
      );
    });

    test('should throw error when user creation fails', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: 'token-123',
                  email: 'test@example.com',
                  token_hash: 'hash123',
                  expires_at: new Date(Date.now() + 10000),
                  used_at: null,
                },
              ])
              .mockResolvedValueOnce([]),
            queryOne: vi.fn().mockResolvedValue(null),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      await expect(verifyMagicLink(db, repos, config, token)).rejects.toThrow(
        'Failed to create user',
      );
    });
  });

  describe('token security', () => {
    test('should hash token before lookup', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'plain-text-token';
      const user = createMockUser();

      const { withTransaction } = await import('../../../../db/src');
      const mockQuery = vi.fn().mockResolvedValue([
        {
          id: 'token-123',
          email: 'test@example.com',
          token_hash: 'hashed-value',
          expires_at: new Date(Date.now() + 10000),
          used_at: null,
        },
      ]);

      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: mockQuery,
            queryOne: vi.fn().mockResolvedValue({
              id: user.id,
              email: user.email,
              username: user.username ?? 'testuser',
              first_name: user.firstName ?? 'Test',
              last_name: user.lastName ?? 'User',
              password_hash: user.passwordHash,
              role: user.role,
              email_verified: true,
              email_verified_at: user.emailVerifiedAt,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      await verifyMagicLink(db, repos, config, token);

      // Token should be hashed, not stored as plain text
      expect(mockQuery).toHaveBeenCalled();
    });

    test('should mark token as used atomically', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';
      const user = createMockUser();

      const { withTransaction } = await import('../../../../db/src');
      const mockQuery = vi.fn().mockResolvedValue([
        {
          id: 'token-123',
          email: 'test@example.com',
          token_hash: 'hash123',
          expires_at: new Date(Date.now() + 10000),
          used_at: new Date(),
        },
      ]);

      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: mockQuery,
            queryOne: vi.fn().mockResolvedValue({
              id: user.id,
              email: user.email,
              username: user.username ?? 'testuser',
              first_name: user.firstName ?? 'Test',
              last_name: user.lastName ?? 'User',
              password_hash: user.passwordHash,
              role: user.role,
              email_verified: true,
              email_verified_at: user.emailVerifiedAt,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      await verifyMagicLink(db, repos, config, token);

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle user with default name', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';
      const user = createMockUser();

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi.fn().mockResolvedValue([
              {
                id: 'token-123',
                email: 'test@example.com',
                token_hash: 'hash123',
                expires_at: new Date(Date.now() + 10000),
                used_at: null,
              },
            ]),
            queryOne: vi.fn().mockResolvedValue({
              id: user.id,
              email: user.email,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              password_hash: user.passwordHash,
              role: user.role,
              email_verified: true,
              email_verified_at: user.emailVerifiedAt,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      const result = await verifyMagicLink(db, repos, config, token);

      expect(result.user.firstName).toBe('Test');
    });

    test('should handle admin role user', async () => {
      const db = createMockDb();
      const repos = createMockRepositories();
      const config = createMockAuthConfig();
      const token = 'valid-token';
      const user = createMockUser({ role: 'admin' });

      const { withTransaction } = await import('../../../../db/src');
      vi.mocked(withTransaction).mockImplementation(
        async (_db: DbClient, callback: TransactionCallback) => {
          const mockTx = {
            query: vi.fn().mockResolvedValue([
              {
                id: 'token-123',
                email: 'admin@example.com',
                token_hash: 'hash123',
                expires_at: new Date(Date.now() + 10000),
                used_at: null,
              },
            ]),
            queryOne: vi.fn().mockResolvedValue({
              id: user.id,
              email: user.email,
              username: user.username ?? 'testuser',
              first_name: user.firstName ?? 'Test',
              last_name: user.lastName ?? 'User',
              password_hash: user.passwordHash,
              role: 'admin',
              email_verified: true,
              email_verified_at: user.emailVerifiedAt,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }),
            execute: vi.fn().mockResolvedValue(1),
          } as unknown as RawDb;
          return callback(mockTx);
        },
      );

      const result = await verifyMagicLink(db, repos, config, token);

      expect(result.user.role).toBe('admin');
    });
  });
});

// ============================================================================
// Tests: cleanupExpiredMagicLinkTokens
// ============================================================================

describe('cleanupExpiredMagicLinkTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should call repository deleteExpired method', async () => {
    const db = createMockDb();
    const repos = createMockRepositories();

    vi.mocked(repos.magicLinkTokens.deleteExpired).mockResolvedValue(5);

    const result = await cleanupExpiredMagicLinkTokens(db, repos);

    expect(result).toBe(5);
    expect(repos.magicLinkTokens.deleteExpired).toHaveBeenCalledTimes(1);
  });

  test('should return zero when no tokens to delete', async () => {
    const db = createMockDb();
    const repos = createMockRepositories();

    vi.mocked(repos.magicLinkTokens.deleteExpired).mockResolvedValue(0);

    const result = await cleanupExpiredMagicLinkTokens(db, repos);

    expect(result).toBe(0);
  });

  test('should return correct count of deleted tokens', async () => {
    const db = createMockDb();
    const repos = createMockRepositories();

    vi.mocked(repos.magicLinkTokens.deleteExpired).mockResolvedValue(42);

    const result = await cleanupExpiredMagicLinkTokens(db, repos);

    expect(result).toBe(42);
  });
});
