// apps/server/src/infrastructure/data/database/repositories.test.ts
/**
 * Tests for repository factory.
 *
 * These tests verify the behavior of repository creation and management
 * by checking outputs and structure rather than mock call counts, since
 * the @abe-stack/db package is resolved differently in the vitest environment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createRepositories,
  getRepositoryContext,
  closeRepositories,
  type RepositoryContext,
} from './repositories';

describe('createRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create repository context with raw client', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx).toHaveProperty('raw');
    expect(ctx.raw).toBeDefined();
    expect(typeof ctx.raw.close).toBe('function');
  });

  it('should create all core repositories', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx.repos.users).toBeDefined();
    expect(ctx.repos.refreshTokens).toBeDefined();
    expect(ctx.repos.refreshTokenFamilies).toBeDefined();
    expect(ctx.repos.loginAttempts).toBeDefined();
    expect(ctx.repos.passwordResetTokens).toBeDefined();
    expect(ctx.repos.emailVerificationTokens).toBeDefined();
    expect(ctx.repos.securityEvents).toBeDefined();
  });

  it('should create all auth-related repositories', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx.repos.magicLinkTokens).toBeDefined();
    expect(ctx.repos.oauthConnections).toBeDefined();
  });

  it('should create all notification repositories', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx.repos.pushSubscriptions).toBeDefined();
    expect(ctx.repos.notificationPreferences).toBeDefined();
  });

  it('should create all billing repositories', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx.repos.plans).toBeDefined();
    expect(ctx.repos.subscriptions).toBeDefined();
    expect(ctx.repos.customerMappings).toBeDefined();
    expect(ctx.repos.invoices).toBeDefined();
    expect(ctx.repos.paymentMethods).toBeDefined();
    expect(ctx.repos.billingEvents).toBeDefined();
  });

  it('should return context with raw client and all repositories', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx).toHaveProperty('raw');
    expect(ctx).toHaveProperty('repos');

    // Verify structure
    const repoKeys = Object.keys(ctx.repos);
    expect(repoKeys).toContain('users');
    expect(repoKeys).toContain('refreshTokens');
    expect(repoKeys).toContain('refreshTokenFamilies');
    expect(repoKeys).toContain('loginAttempts');
    expect(repoKeys).toContain('passwordResetTokens');
    expect(repoKeys).toContain('emailVerificationTokens');
    expect(repoKeys).toContain('securityEvents');
    expect(repoKeys).toContain('magicLinkTokens');
    expect(repoKeys).toContain('oauthConnections');
    expect(repoKeys).toContain('pushSubscriptions');
    expect(repoKeys).toContain('notificationPreferences');
    expect(repoKeys).toContain('plans');
    expect(repoKeys).toContain('subscriptions');
    expect(repoKeys).toContain('customerMappings');
    expect(repoKeys).toContain('invoices');
    expect(repoKeys).toContain('paymentMethods');
    expect(repoKeys).toContain('billingEvents');
  });
});

describe('getRepositoryContext', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env['NODE_ENV'];
    vi.clearAllMocks();
    // Clear global state
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv;
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  it('should create new context in production mode', () => {
    process.env['NODE_ENV'] = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    const ctx2 = getRepositoryContext(connectionString);

    // In production, should create new instances
    expect(ctx1).not.toBe(ctx2);
  });

  it('should reuse global context in development mode', () => {
    process.env['NODE_ENV'] = 'development';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    const ctx2 = getRepositoryContext(connectionString);

    // In development, should reuse the same instance
    expect(ctx1).toBe(ctx2);
  });

  it('should reuse global context in test mode', () => {
    process.env['NODE_ENV'] = 'test';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    const ctx2 = getRepositoryContext(connectionString);

    // In test, should reuse the same instance
    expect(ctx1).toBe(ctx2);
  });

  it('should store context on global object in development', () => {
    process.env['NODE_ENV'] = 'development';
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
    process.env['NODE_ENV'] = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    getRepositoryContext(connectionString);

    // Global should still be undefined in production
    expect(
      (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext,
    ).toBeUndefined();
  });

  it('should return context with all expected properties', () => {
    process.env['NODE_ENV'] = 'production';
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

  it('should close the raw database client', async () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    // Spy on the close method to verify it's called
    const closeSpy = vi.spyOn(ctx.raw, 'close');

    await closeRepositories(ctx);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    closeSpy.mockRestore();
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
    originalEnv = process.env['NODE_ENV'];
    vi.clearAllMocks();
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv;
    delete (globalThis as { repositoryContext?: RepositoryContext }).repositoryContext;
  });

  it('should create and close repositories successfully', async () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const ctx = createRepositories(connectionString);

    expect(ctx.repos.users).toBeDefined();
    expect(ctx.repos.plans).toBeDefined();

    const closeSpy = vi.spyOn(ctx.raw, 'close');

    await closeRepositories(ctx);

    expect(closeSpy).toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it('should handle multiple repository context lifecycles in development', async () => {
    process.env['NODE_ENV'] = 'development';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const ctx1 = getRepositoryContext(connectionString);
    await closeRepositories(ctx1);

    // Even after closing, the global reference remains (by design in dev mode)
    const ctx2 = getRepositoryContext(connectionString);
    expect(ctx2).toBe(ctx1); // Same instance in dev mode
  });
});
