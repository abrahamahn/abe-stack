// src/server/db/src/factory.test.ts
/**
 * Tests for Repository Factory
 *
 * Validates that createRepositories returns all 37 repository keys
 * and that getRepositoryContext provides singleton behavior in development.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the postgres module before importing factory
vi.mock('postgres', () => {
  const mockSql = Object.assign(() => Promise.resolve([{ result: 1 }]), {
    unsafe: vi.fn().mockResolvedValue([]),
    begin: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  });
  return { default: vi.fn(() => mockSql) };
});

import { createRepositories, getRepositoryContext, closeRepositories } from './factory';

import type { Repositories } from './factory';

// ============================================================================
// Tests
// ============================================================================

describe('createRepositories', () => {
  const testConnectionString = 'postgres://test:test@localhost:5432/test_db';

  it('should return a RepositoryContext with raw and repos', () => {
    const ctx = createRepositories(testConnectionString);

    expect(ctx).toHaveProperty('raw');
    expect(ctx).toHaveProperty('repos');
    expect(ctx.raw).toBeDefined();
    expect(ctx.repos).toBeDefined();
  });

  it('should create all 37 repository keys', () => {
    const ctx = createRepositories(testConnectionString);
    const repos = ctx.repos;

    // Core entities
    expect(repos.users).toBeDefined();
    expect(repos.refreshTokens).toBeDefined();

    // Auth
    expect(repos.refreshTokenFamilies).toBeDefined();
    expect(repos.loginAttempts).toBeDefined();
    expect(repos.passwordResetTokens).toBeDefined();
    expect(repos.emailVerificationTokens).toBeDefined();
    expect(repos.securityEvents).toBeDefined();
    expect(repos.totpBackupCodes).toBeDefined();
    expect(repos.emailChangeTokens).toBeDefined();

    // Magic Link
    expect(repos.magicLinkTokens).toBeDefined();

    // OAuth
    expect(repos.oauthConnections).toBeDefined();

    // API Keys
    expect(repos.apiKeys).toBeDefined();

    // Push Notifications
    expect(repos.pushSubscriptions).toBeDefined();
    expect(repos.notificationPreferences).toBeDefined();

    // Billing
    expect(repos.plans).toBeDefined();
    expect(repos.subscriptions).toBeDefined();
    expect(repos.customerMappings).toBeDefined();
    expect(repos.invoices).toBeDefined();
    expect(repos.paymentMethods).toBeDefined();
    expect(repos.billingEvents).toBeDefined();

    // Sessions
    expect(repos.userSessions).toBeDefined();

    // Tenant
    expect(repos.tenants).toBeDefined();
    expect(repos.memberships).toBeDefined();
    expect(repos.invitations).toBeDefined();

    // In-App Notifications
    expect(repos.notifications).toBeDefined();

    // System
    expect(repos.auditEvents).toBeDefined();
    expect(repos.jobs).toBeDefined();
    expect(repos.webhooks).toBeDefined();
    expect(repos.webhookDeliveries).toBeDefined();

    // Features
    expect(repos.featureFlags).toBeDefined();
    expect(repos.tenantFeatureOverrides).toBeDefined();

    // Metering
    expect(repos.usageMetrics).toBeDefined();
    expect(repos.usageSnapshots).toBeDefined();

    // Compliance
    expect(repos.legalDocuments).toBeDefined();
    expect(repos.userAgreements).toBeDefined();
    expect(repos.consentLogs).toBeDefined();
    expect(repos.dataExportRequests).toBeDefined();
  });

  it('should have exactly 37 keys in repos', () => {
    const ctx = createRepositories(testConnectionString);
    const repoKeys = Object.keys(ctx.repos);

    expect(repoKeys).toHaveLength(37);
  });

  it('should expose repository methods', () => {
    const ctx = createRepositories(testConnectionString);

    // Spot-check key methods exist
    expect(typeof ctx.repos.users.findByEmail).toBe('function');
    expect(typeof ctx.repos.users.findById).toBe('function');
    expect(typeof ctx.repos.users.update).toBe('function');
    expect(typeof ctx.repos.refreshTokens.deleteByToken).toBe('function');
    expect(typeof ctx.repos.plans.listActive).toBe('function');
    expect(typeof ctx.repos.oauthConnections.findByProviderUserId).toBe('function');
    expect(typeof ctx.repos.magicLinkTokens.create).toBe('function');
  });

  it('should expose raw database client methods', () => {
    const ctx = createRepositories(testConnectionString);

    expect(typeof ctx.raw.query).toBe('function');
    expect(typeof ctx.raw.queryOne).toBe('function');
    expect(typeof ctx.raw.execute).toBe('function');
    expect(typeof ctx.raw.transaction).toBe('function');
    expect(typeof ctx.raw.healthCheck).toBe('function');
    expect(typeof ctx.raw.close).toBe('function');
  });
});

describe('getRepositoryContext', () => {
  const testConnectionString = 'postgres://test:test@localhost:5432/test_db';
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
    // Clean up global singleton
    const globalWithRepos = globalThis as typeof globalThis & { repositoryContext?: unknown };
    delete globalWithRepos.repositoryContext;
  });

  it('should return a RepositoryContext in development', () => {
    process.env['NODE_ENV'] = 'development';

    const ctx = getRepositoryContext(testConnectionString);

    expect(ctx).toHaveProperty('raw');
    expect(ctx).toHaveProperty('repos');
  });

  it('should return singleton in development', () => {
    process.env['NODE_ENV'] = 'development';

    const ctx1 = getRepositoryContext(testConnectionString);
    const ctx2 = getRepositoryContext(testConnectionString);

    expect(ctx1).toBe(ctx2);
  });

  it('should return new instance in production', () => {
    process.env['NODE_ENV'] = 'production';

    const ctx1 = getRepositoryContext(testConnectionString);
    const ctx2 = getRepositoryContext(testConnectionString);

    expect(ctx1).not.toBe(ctx2);
  });
});

describe('closeRepositories', () => {
  const testConnectionString = 'postgres://test:test@localhost:5432/test_db';

  it('should close the database connection', async () => {
    const ctx = createRepositories(testConnectionString);
    const closeSpy = vi.spyOn(ctx.raw, 'close');

    await closeRepositories(ctx);

    expect(closeSpy).toHaveBeenCalledOnce();
  });
});

describe('Repositories type completeness', () => {
  it('should satisfy the Repositories interface', () => {
    const testConnectionString = 'postgres://test:test@localhost:5432/test_db';
    const ctx = createRepositories(testConnectionString);

    // This is a compile-time check - if Repositories interface changes,
    // factory.ts must be updated to match
    const repos: Repositories = ctx.repos;
    expect(repos).toBeDefined();
  });
});
