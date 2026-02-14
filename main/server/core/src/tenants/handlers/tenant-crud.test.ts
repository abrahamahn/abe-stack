// main/server/core/src/tenants/handlers/tenant-crud.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    handleCreateTenant,
    handleDeleteTenant,
    handleGetTenant,
    handleListTenants,
    handleUpdateTenant,
} from './tenant-crud';

import type { DbClient, Repositories } from '../../../../db/src';
import type { TenantsModuleDeps, TenantsRequest } from '../types';

// ============================================================================
// Mocks
// ============================================================================

const {
  mockCreateTenant,
  mockGetUserTenants,
  mockGetTenantById,
  mockUpdateTenant,
  mockDeleteTenant,
} = vi.hoisted(() => ({
  mockCreateTenant: vi.fn(),
  mockGetUserTenants: vi.fn(),
  mockGetTenantById: vi.fn(),
  mockUpdateTenant: vi.fn(),
  mockDeleteTenant: vi.fn(),
}));

vi.mock('../service', () => ({
  createTenant: mockCreateTenant,
  getUserTenants: mockGetUserTenants,
  getTenantById: mockGetTenantById,
  updateTenant: mockUpdateTenant,
  deleteTenant: mockDeleteTenant,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDeps(): TenantsModuleDeps {
  return {
    db: {} as DbClient,
    repos: {} as Repositories,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    },
  } as unknown as TenantsModuleDeps;
}

function createMockRequest(user?: { userId: string }): TenantsRequest {
  return {
    user,
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    cookies: {},
    headers: {},
  } as TenantsRequest;
}

// ============================================================================
// handleCreateTenant
// ============================================================================

describe('handleCreateTenant', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleCreateTenant(deps, { name: 'Test' }, request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 201 on success', async () => {
    const tenant = { id: 'tenant-1', name: 'Test Workspace' };
    mockCreateTenant.mockResolvedValue(tenant);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleCreateTenant(
      deps,
      { name: 'Test Workspace', slug: 'test' },
      request,
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual(tenant);
    expect(mockCreateTenant).toHaveBeenCalledWith(deps.db, deps.repos, 'user-1', {
      name: 'Test Workspace',
      slug: 'test',
    });
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockCreateTenant.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleCreateTenant(deps, { name: 'Test' }, request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleListTenants
// ============================================================================

describe('handleListTenants', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListTenants(deps, request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with tenants list', async () => {
    const tenants = [{ id: 'tenant-1', name: 'Workspace A' }];
    mockGetUserTenants.mockResolvedValue(tenants);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenants(deps, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(tenants);
    expect(mockGetUserTenants).toHaveBeenCalledWith(deps.db, 'user-1');
  });

  it('should return 500 on service error', async () => {
    mockGetUserTenants.mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenants(deps, request);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Internal server error' });
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleGetTenant
// ============================================================================

describe('handleGetTenant', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleGetTenant(deps, 'tenant-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with tenant data', async () => {
    const tenant = { id: 'tenant-1', name: 'My Workspace' };
    mockGetTenantById.mockResolvedValue(tenant);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleGetTenant(deps, 'tenant-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(tenant);
    expect(mockGetTenantById).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'user-1');
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockGetTenantById.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleGetTenant(deps, 'tenant-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleUpdateTenant
// ============================================================================

describe('handleUpdateTenant', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleUpdateTenant(deps, 'tenant-1', { name: 'New Name' }, request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with updated tenant', async () => {
    const updated = { id: 'tenant-1', name: 'New Name' };
    mockUpdateTenant.mockResolvedValue(updated);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleUpdateTenant(deps, 'tenant-1', { name: 'New Name' }, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(updated);
    expect(mockUpdateTenant).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'user-1', {
      name: 'New Name',
    });
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockUpdateTenant.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleUpdateTenant(deps, 'tenant-1', { name: 'New Name' }, request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleDeleteTenant
// ============================================================================

describe('handleDeleteTenant', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleDeleteTenant(deps, 'tenant-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with success message', async () => {
    mockDeleteTenant.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleDeleteTenant(deps, 'tenant-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Workspace deleted' });
    expect(mockDeleteTenant).toHaveBeenCalledWith(deps.db, deps.repos, 'tenant-1', 'user-1');
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    mockDeleteTenant.mockRejectedValue(new Error('Service failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleDeleteTenant(deps, 'tenant-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});
