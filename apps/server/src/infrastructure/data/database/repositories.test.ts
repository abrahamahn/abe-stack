// apps/server/src/infrastructure/data/database/repositories.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createRepositories,
  getRepositoryContext,
  closeRepositories,
  type RepositoryContext,
} from './repositories';

// Mock all repository factory functions and RawDb
vi.mock('@abe-stack/db', () => {
  const mockRawDb = {
    close: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
    raw: vi.fn(),
  };

  return {
    createRawDb: vi.fn(() => mockRawDb),
    createUserRepository: vi.fn(() => ({ name: 'users' })),
    createRefreshTokenRepository: vi.fn(() => ({ name: 'refreshTokens' })),
    createRefreshTokenFamilyRepository: vi.fn(() => ({ name: 'refreshTokenFamilies' })),
    createLoginAttemptRepository: vi.fn(() => ({ name: 'loginAttempts' })),
    createPasswordResetTokenRepository: vi.fn(() => ({ name: 'passwordResetTokens' })),
    createEmailVerificationTokenRepository: vi.fn(() => ({ name: 'emailVerificationTokens' })),
    createSecurityEventRepository: vi.fn(() => ({ name: 'securityEvents' })),
    createMagicLinkTokenRepository: vi.fn(() => ({ name: 'magicLinkTokens' })),
    createOAuthConnectionRepository: vi.fn(() => ({ name: 'oauthConnections' })),
    createPushSubscriptionRepository: vi.fn(() => ({ name: 'pushSubscriptions' })),
    createNotificationPreferenceRepository: vi.fn(() => ({ name: 'notificationPreferences' })),
    createPlanRepository: vi.fn(() => ({ name: 'plans' })),
    createSubscriptionRepository: vi.fn(() => ({ name: 'subscriptions' })),
    createCustomerMappingRepository: vi.fn(() => ({ name: 'customerMappings' })),
    createInvoiceRepository: vi.fn(() => ({ name: 'invoices' })),
    createPaymentMethodRepository: vi.fn(() => ({ name: 'paymentMethods' })),
    createBillingEventRepository: vi.fn(() => ({ name: 'billingEvents' })),
  };
});

describe('createRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create RawDb instance with connection string', () => {
    const { createRawDb } = await import('@abe-stack/db');
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    createRepositories(connectionString);

    expect(createRawDb).toHaveBeenCalledWith(connectionString);
  });

  it('should create all core repositories', () => {
    const {
      createUserRepository,
      createRefreshTokenRepository,
      createRefreshTokenFamilyRepository,
      createLoginAttemptRepository,
      createPasswordResetTokenRepository,
      createEmailVerificationTokenRepository,
      createSecurityEventRepository,
    } = await import('@abe-stack/db');

    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(createUserRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createRefreshTokenRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createRefreshTokenFamilyRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createLoginAttemptRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createPasswordResetTokenRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createEmailVerificationTokenRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createSecurityEventRepository).toHaveBeenCalledWith(ctx.raw);
  });

  it('should create all auth-related repositories', () => {
    const { createMagicLinkTokenRepository, createOAuthConnectionRepository } =
      await import('@abe-stack/db');

    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(createMagicLinkTokenRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createOAuthConnectionRepository).toHaveBeenCalledWith(ctx.raw);
  });

  it('should create all notification repositories', () => {
    const { createPushSubscriptionRepository, createNotificationPreferenceRepository } =
      await import('@abe-stack/db');

    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(createPushSubscriptionRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createNotificationPreferenceRepository).toHaveBeenCalledWith(ctx.raw);
  });

  it('should create all billing repositories', () => {
    const {
      createPlanRepository,
      createSubscriptionRepository,
      createCustomerMappingRepository,
      createInvoiceRepository,
      createPaymentMethodRepository,
      createBillingEventRepository,
    } = await import('@abe-stack/db');

    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(createPlanRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createSubscriptionRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createCustomerMappingRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createInvoiceRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createPaymentMethodRepository).toHaveBeenCalledWith(ctx.raw);
    expect(createBillingEventRepository).toHaveBeenCalledWith(ctx.raw);
  });

  it('should return context with raw client and all repositories', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx).toHaveProperty('raw');
    expect(ctx).toHaveProperty('repos');

    // Check core repos
    expect(ctx.repos).toHaveProperty('users');
    expect(ctx.repos).toHaveProperty('refreshTokens');
    expect(ctx.repos).toHaveProperty('refreshTokenFamilies');

    // Check auth repos
    expect(ctx.repos).toHaveProperty('loginAttempts');
    expect(ctx.repos).toHaveProperty('passwordResetTokens');
    expect(ctx.repos).toHaveProperty('emailVerificationTokens');
    expect(ctx.repos).toHaveProperty('securityEvents');
    expect(ctx.repos).toHaveProperty('magicLinkTokens');
    expect(ctx.repos).toHaveProperty('oauthConnections');

    // Check notification repos
    expect(ctx.repos).toHaveProperty('pushSubscriptions');
    expect(ctx.repos).toHaveProperty('notificationPreferences');

    // Check billing repos
    expect(ctx.repos).toHaveProperty('plans');
    expect(ctx.repos).toHaveProperty('subscriptions');
    expect(ctx.repos).toHaveProperty('customerMappings');
    expect(ctx.repos).toHaveProperty('invoices');
    expect(ctx.repos).toHaveProperty('paymentMethods');
    expect(ctx.repos).toHaveProperty('billingEvents');
  });
});

describe('getRepositoryContext', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    vi.clearAllMocks();
    // Clear global state
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  it('should create new context in production mode', () => {
    process.env.NODE_ENV = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    const ctx2 = getRepositoryContext(connectionString);

    // In production, should create new instances
    expect(ctx1).not.toBe(ctx2);
  });

  it('should reuse global context in development mode', () => {
    process.env.NODE_ENV = 'development';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    const ctx2 = getRepositoryContext(connectionString);

    // In development, should reuse the same instance
    expect(ctx1).toBe(ctx2);
  });

  it('should reuse global context in test mode', () => {
    process.env.NODE_ENV = 'test';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    const ctx2 = getRepositoryContext(connectionString);

    // In test, should reuse the same instance
    expect(ctx1).toBe(ctx2);
  });

  it('should store context on global object in development', () => {
    process.env.NODE_ENV = 'development';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    expect(
      (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext,
    ).toBeUndefined();

    getRepositoryContext(connectionString);

    expect(
      (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext,
    ).toBeDefined();
  });

  it('should not store context on global object in production', () => {
    process.env.NODE_ENV = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    getRepositoryContext(connectionString);

    // Global should still be undefined in production
    expect(
      (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext,
    ).toBeUndefined();
  });

  it('should return context with all expected properties', () => {
    process.env.NODE_ENV = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx = getRepositoryContext(connectionString);

    expect(ctx).toHaveProperty('raw');
    expect(ctx).toHaveProperty('repos');
    expect(typeof ctx.raw.close).toBe('function');
  });
});

describe('closeRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call close on raw database client', async () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    await closeRepositories(ctx);

    expect(ctx.raw.close).toHaveBeenCalledTimes(1);
  });

  it('should handle close errors gracefully', async () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    vi.mocked(ctx.raw.close).mockRejectedValue(new Error('Close failed'));

    await expect(closeRepositories(ctx)).rejects.toThrow('Close failed');
  });

  it('should return void on successful close', async () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    const result = await closeRepositories(ctx);

    expect(result).toBeUndefined();
  });
});

describe('integration', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    vi.clearAllMocks();
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  it('should create and close repositories successfully', async () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx.repos.users).toBeDefined();
    expect(ctx.repos.plans).toBeDefined();

    await closeRepositories(ctx);

    expect(ctx.raw.close).toHaveBeenCalled();
  });

  it('should handle multiple repository context lifecycles in development', async () => {
    process.env.NODE_ENV = 'development';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    await closeRepositories(ctx1);

    // Even after closing, the global reference remains (by design in dev mode)
    const ctx2 = getRepositoryContext(connectionString);
    expect(ctx2).toBe(ctx1); // Same instance in dev mode
  });
});
