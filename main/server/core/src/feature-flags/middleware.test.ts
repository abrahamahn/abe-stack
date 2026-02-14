// main/server/core/src/feature-flags/middleware.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFeatureFlagGuard } from './middleware';

import type { FeatureFlagRepository, TenantFeatureOverrideRepository } from '../../../db/src';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockFlagRepo(): FeatureFlagRepository {
  return {
    create: vi.fn(),
    findByKey: vi.fn(),
    findAll: vi.fn(),
    findEnabled: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockOverrideRepo(): TenantFeatureOverrideRepository {
  return {
    create: vi.fn(),
    findByTenantAndKey: vi.fn(),
    findByTenantId: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockRequest(
  headers: Record<string, string | undefined> = {},
  user?: { userId: string },
): FastifyRequest & { user?: { userId: string } } {
  return {
    headers,
    user,
  } as FastifyRequest & { user?: { userId: string } };
}

function createMockReply(): FastifyReply & { _statusCode: number; _body: unknown } {
  const reply = {
    _statusCode: 200,
    _body: undefined as unknown,
    code(status: number) {
      reply._statusCode = status;
      return reply;
    },
    send(body: unknown) {
      reply._body = body;
      return reply;
    },
  };
  return reply as unknown as FastifyReply & { _statusCode: number; _body: unknown };
}

// ============================================================================
// createFeatureFlagGuard
// ============================================================================

describe('createFeatureFlagGuard', () => {
  let flagRepo: FeatureFlagRepository;
  let overrideRepo: TenantFeatureOverrideRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    flagRepo = createMockFlagRepo();
    overrideRepo = createMockOverrideRepo();
  });

  // --------------------------------------------------------------------------
  // Flag enabled -- request proceeds
  // --------------------------------------------------------------------------

  it('should proceed when flag is globally enabled', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'billing.seats',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const guard = createFeatureFlagGuard('billing.seats', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest();
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200); // unchanged -- no error sent
    expect(reply._body).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Flag disabled -- returns 404
  // --------------------------------------------------------------------------

  it('should return 404 when flag is globally disabled', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'billing.seats',
      description: null,
      isEnabled: false,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const guard = createFeatureFlagGuard('billing.seats', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest();
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(404);
    expect(reply._body).toEqual({
      message: 'Feature not available',
      code: 'FEATURE_DISABLED',
    });
  });

  // --------------------------------------------------------------------------
  // Unknown flag -- returns 404 (default to disabled)
  // --------------------------------------------------------------------------

  it('should return 404 when flag key does not exist', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue(null);

    const guard = createFeatureFlagGuard('nonexistent.feature', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest();
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(404);
    expect(reply._body).toEqual({
      message: 'Feature not available',
      code: 'FEATURE_DISABLED',
    });
  });

  // --------------------------------------------------------------------------
  // Tenant override enabled -- proceeds for that tenant
  // --------------------------------------------------------------------------

  it('should proceed when tenant override enables a globally disabled flag', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'beta.feature',
      description: null,
      isEnabled: false,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(overrideRepo.findByTenantAndKey).mockResolvedValue({
      tenantId: 'tenant-1',
      key: 'beta.feature',
      value: null,
      isEnabled: true,
    });

    const guard = createFeatureFlagGuard('beta.feature', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({ 'x-workspace-id': 'tenant-1' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
    expect(reply._body).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Tenant override disabled -- returns 404 for that tenant
  // --------------------------------------------------------------------------

  it('should return 404 when tenant override disables a globally enabled flag', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'billing.seats',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(overrideRepo.findByTenantAndKey).mockResolvedValue({
      tenantId: 'tenant-2',
      key: 'billing.seats',
      value: null,
      isEnabled: false,
    });

    const guard = createFeatureFlagGuard('billing.seats', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({ 'x-workspace-id': 'tenant-2' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(404);
    expect(reply._body).toEqual({
      message: 'Feature not available',
      code: 'FEATURE_DISABLED',
    });
  });

  // --------------------------------------------------------------------------
  // No tenant header -- evaluates global flag only
  // --------------------------------------------------------------------------

  it('should not look up tenant overrides when no workspace header is present', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'global.feature',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const guard = createFeatureFlagGuard('global.feature', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest();
    const reply = createMockReply();

    await guard(request, reply);

    expect(overrideRepo.findByTenantAndKey).not.toHaveBeenCalled();
    expect(reply._statusCode).toBe(200);
  });

  // --------------------------------------------------------------------------
  // Rollout percentage -- test with mock
  // --------------------------------------------------------------------------

  it('should proceed when rollout percentage includes the user', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'rollout.feature',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: { rolloutPercentage: 100 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const guard = createFeatureFlagGuard('rollout.feature', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({}, { userId: 'user-1' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
    expect(reply._body).toBeUndefined();
  });

  it('should return 404 when rollout percentage is 0', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'rollout.zero',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: { rolloutPercentage: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const guard = createFeatureFlagGuard('rollout.zero', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({}, { userId: 'user-1' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(404);
    expect(reply._body).toEqual({
      message: 'Feature not available',
      code: 'FEATURE_DISABLED',
    });
  });

  // --------------------------------------------------------------------------
  // User targeting -- allowed user proceeds
  // --------------------------------------------------------------------------

  it('should proceed when user is in allowedUserIds', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'targeted.feature',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: { allowedUserIds: ['user-1', 'user-2'] },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const guard = createFeatureFlagGuard('targeted.feature', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({}, { userId: 'user-1' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
    expect(reply._body).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Tenant targeting -- allowed tenant proceeds
  // --------------------------------------------------------------------------

  it('should proceed when tenant is in allowedTenantIds', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'tenant.targeted',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: { allowedTenantIds: ['tenant-1'] },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // No tenant-level override
    vi.mocked(overrideRepo.findByTenantAndKey).mockResolvedValue(null);

    const guard = createFeatureFlagGuard('tenant.targeted', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({ 'x-workspace-id': 'tenant-1' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
    expect(reply._body).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Repository error -- returns 500
  // --------------------------------------------------------------------------

  it('should return 500 when flag repository throws', async () => {
    vi.mocked(flagRepo.findByKey).mockRejectedValue(new Error('DB connection lost'));

    const guard = createFeatureFlagGuard('billing.seats', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest();
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(500);
    expect(reply._body).toEqual({
      message: 'Internal server error',
      code: 'FEATURE_FLAG_ERROR',
    });
  });

  it('should return 500 when override repository throws', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'billing.seats',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(overrideRepo.findByTenantAndKey).mockRejectedValue(new Error('DB timeout'));

    const guard = createFeatureFlagGuard('billing.seats', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({ 'x-workspace-id': 'tenant-1' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(500);
    expect(reply._body).toEqual({
      message: 'Internal server error',
      code: 'FEATURE_FLAG_ERROR',
    });
  });

  // --------------------------------------------------------------------------
  // Empty workspace header -- treated as no tenant
  // --------------------------------------------------------------------------

  it('should ignore empty workspace header', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'global.feature',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const guard = createFeatureFlagGuard('global.feature', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({ 'x-workspace-id': '' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(overrideRepo.findByTenantAndKey).not.toHaveBeenCalled();
    expect(reply._statusCode).toBe(200);
  });

  // --------------------------------------------------------------------------
  // No override exists for tenant -- falls through to global evaluation
  // --------------------------------------------------------------------------

  it('should fall through to global evaluation when no tenant override exists', async () => {
    vi.mocked(flagRepo.findByKey).mockResolvedValue({
      key: 'billing.seats',
      description: null,
      isEnabled: true,
      defaultValue: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(overrideRepo.findByTenantAndKey).mockResolvedValue(null);

    const guard = createFeatureFlagGuard('billing.seats', {
      repos: { featureFlags: flagRepo, tenantFeatureOverrides: overrideRepo },
    });

    const request = createMockRequest({ 'x-workspace-id': 'tenant-1' });
    const reply = createMockReply();

    await guard(request, reply);

    expect(overrideRepo.findByTenantAndKey).toHaveBeenCalledWith('tenant-1', 'billing.seats');
    expect(reply._statusCode).toBe(200);
  });
});
