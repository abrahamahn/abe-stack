// src/server/core/src/data-export/handlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetExportStatus, handleRequestExport } from './handlers';

import type { DataExportAppContext } from './types';
import type { DataExportRequest, DataExportRequestRepository, UserRepository } from '@abe-stack/db';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockExportRepo(): DataExportRequestRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function createMockUserRepo(): UserRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
  } as unknown as UserRepository;
}

function createMockCtx(overrides?: {
  exportRequests?: DataExportRequestRepository;
  users?: UserRepository;
}): DataExportAppContext {
  return {
    db: {},
    repos: {
      dataExportRequests: overrides?.exportRequests ?? createMockExportRepo(),
      users: overrides?.users ?? createMockUserRepo(),
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
}

function createMockExportRequest(overrides?: Partial<DataExportRequest>): DataExportRequest {
  return {
    id: 'export-1',
    userId: 'user-1',
    type: 'export',
    status: 'pending',
    format: 'json',
    downloadUrl: null,
    expiresAt: null,
    completedAt: null,
    errorMessage: null,
    metadata: {},
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function createAuthenticatedRequest(userId = 'user-1') {
  return {
    user: { userId, email: 'test@example.com', role: 'user' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'TestAgent' },
    cookies: {},
    headers: { 'user-agent': 'TestAgent' },
  };
}

// ============================================================================
// handleRequestExport
// ============================================================================

describe('handleRequestExport', () => {
  let ctx: DataExportAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockCtx();
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleRequestExport(ctx, undefined, {
      requestInfo: { ipAddress: '127.0.0.1' },
      cookies: {},
      headers: {},
    });

    expect(result.status).toBe(401);
  });

  it('should create and return an export request', async () => {
    const created = createMockExportRequest();
    vi.mocked(ctx.repos.dataExportRequests.findByUserId).mockResolvedValue([]);
    vi.mocked(ctx.repos.dataExportRequests.create).mockResolvedValue(created);

    const result = await handleRequestExport(ctx, undefined, createAuthenticatedRequest());

    expect(result.status).toBe(201);
    expect(result.body).toHaveProperty('exportRequest');
    const body = result.body as { exportRequest: { id: string; status: string } };
    expect(body.exportRequest.id).toBe('export-1');
    expect(body.exportRequest.status).toBe('pending');
  });

  it('should format dates as ISO strings', async () => {
    const created = createMockExportRequest({
      completedAt: new Date('2026-01-16T10:00:00Z'),
      expiresAt: new Date('2026-02-16T10:00:00Z'),
    });
    vi.mocked(ctx.repos.dataExportRequests.findByUserId).mockResolvedValue([]);
    vi.mocked(ctx.repos.dataExportRequests.create).mockResolvedValue(created);

    const result = await handleRequestExport(ctx, undefined, createAuthenticatedRequest());

    const body = result.body as {
      exportRequest: { completedAt: string; expiresAt: string; createdAt: string };
    };
    expect(body.exportRequest.createdAt).toBe('2026-01-15T10:00:00.000Z');
    expect(body.exportRequest.completedAt).toBe('2026-01-16T10:00:00.000Z');
    expect(body.exportRequest.expiresAt).toBe('2026-02-16T10:00:00.000Z');
  });

  it('should return 409 when user has pending request', async () => {
    vi.mocked(ctx.repos.dataExportRequests.findByUserId).mockResolvedValue([
      createMockExportRequest({ status: 'pending' }),
    ]);

    const result = await handleRequestExport(ctx, undefined, createAuthenticatedRequest());

    expect(result.status).toBe(409);
    expect(result.body).toHaveProperty('message');
  });
});

// ============================================================================
// handleGetExportStatus
// ============================================================================

describe('handleGetExportStatus', () => {
  let ctx: DataExportAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockCtx();
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleGetExportStatus(ctx, undefined, {
      requestInfo: { ipAddress: '127.0.0.1' },
      cookies: {},
      headers: {},
    });

    expect(result.status).toBe(401);
  });

  it('should return 400 when export ID is missing', async () => {
    const result = await handleGetExportStatus(ctx, undefined, {
      ...createAuthenticatedRequest(),
      params: {},
    });

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('required');
  });

  it('should return export request status', async () => {
    const request = createMockExportRequest();
    vi.mocked(ctx.repos.dataExportRequests.findById).mockResolvedValue(request);

    const result = await handleGetExportStatus(ctx, undefined, {
      ...createAuthenticatedRequest(),
      params: { id: 'export-1' },
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('exportRequest');
    const body = result.body as { exportRequest: { id: string } };
    expect(body.exportRequest.id).toBe('export-1');
  });

  it('should return 404 when request not found', async () => {
    vi.mocked(ctx.repos.dataExportRequests.findById).mockResolvedValue(null);

    const result = await handleGetExportStatus(ctx, undefined, {
      ...createAuthenticatedRequest(),
      params: { id: 'missing-id' },
    });

    expect(result.status).toBe(404);
  });

  it('should return 404 when request belongs to different user', async () => {
    const request = createMockExportRequest({ userId: 'other-user' });
    vi.mocked(ctx.repos.dataExportRequests.findById).mockResolvedValue(request);

    const result = await handleGetExportStatus(ctx, undefined, {
      ...createAuthenticatedRequest(),
      params: { id: 'export-1' },
    });

    expect(result.status).toBe(404);
  });
});
