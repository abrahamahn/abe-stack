// main/server/core/src/auth/handlers/tos.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleAcceptTos, handleTosStatus } from './tos';

import type { Repositories } from '../../../../db/src';
import type { AppContext, RequestWithCookies } from '../types';

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockRepos(): Repositories {
  return {
    legalDocuments: {
      findLatestByType: vi.fn(),
    },
    userAgreements: {
      findByUserAndDocument: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as Repositories;
}

function createMockContext(repos: Repositories): AppContext {
  return {
    repos,
    db: {} as AppContext['db'],
    config: {
      auth: {} as AppContext['config']['auth'],
      server: { appBaseUrl: 'https://example.com' },
    } as AppContext['config'],
    email: {} as AppContext['email'],
    emailTemplates: {} as AppContext['emailTemplates'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as AppContext['log'],
  } as unknown as AppContext;
}

function createMockRequest(userId?: string): RequestWithCookies {
  return {
    user: userId !== undefined ? { userId, email: 'test@example.com', role: 'user' } : undefined,
    requestInfo: {
      ipAddress: '192.168.1.1',
      userAgent: 'TestAgent/1.0',
    },
    cookies: {},
    headers: {},
  } as unknown as RequestWithCookies;
}

// ============================================================================
// Tests: handleAcceptTos
// ============================================================================

describe('handleAcceptTos', () => {
  let repos: Repositories;
  let ctx: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    ctx = createMockContext(repos);
  });

  it('should return 200 with agreedAt on success', async () => {
    const agreedAt = new Date('2026-02-08T12:00:00Z');
    vi.mocked(repos.userAgreements.create).mockResolvedValue({
      id: 'agr-1',
      userId: 'user-123',
      documentId: 'doc-1',
      agreedAt,
      ipAddress: '192.168.1.1',
    });

    const request = createMockRequest('user-123');
    const result = await handleAcceptTos(ctx, { documentId: 'doc-1' }, request);

    expect(result).toEqual({
      status: 200,
      body: { agreedAt: '2026-02-08T12:00:00.000Z' },
    });
    expect(repos.userAgreements.create).toHaveBeenCalledWith({
      userId: 'user-123',
      documentId: 'doc-1',
      ipAddress: '192.168.1.1',
    });
  });

  it('should return 401 when no user is authenticated', async () => {
    const request = createMockRequest(); // No userId
    const result = await handleAcceptTos(ctx, { documentId: 'doc-1' }, request);

    expect(result).toEqual({
      status: 401,
      body: { message: 'Authentication required' },
    });
  });

  it('should pass ipAddress from request info', async () => {
    const agreedAt = new Date();
    vi.mocked(repos.userAgreements.create).mockResolvedValue({
      id: 'agr-2',
      userId: 'user-456',
      documentId: 'doc-2',
      agreedAt,
      ipAddress: '192.168.1.1',
    });

    const request = createMockRequest('user-456');
    await handleAcceptTos(ctx, { documentId: 'doc-2' }, request);

    expect(repos.userAgreements.create).toHaveBeenCalledWith({
      userId: 'user-456',
      documentId: 'doc-2',
      ipAddress: '192.168.1.1',
    });
  });
});

// ============================================================================
// Tests: handleTosStatus
// ============================================================================

describe('handleTosStatus', () => {
  let repos: Repositories;
  let ctx: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    ctx = createMockContext(repos);
  });

  it('should return accepted=true when user has accepted latest ToS', async () => {
    const tosDoc = {
      id: 'doc-1',
      type: 'terms_of_service',
      version: 2,
      title: 'ToS v2',
      content: '',
      effectiveAt: new Date(),
      createdAt: new Date(),
    };
    vi.mocked(repos.legalDocuments.findLatestByType).mockResolvedValue(tosDoc);
    vi.mocked(repos.userAgreements.findByUserAndDocument).mockResolvedValue({
      id: 'agr-1',
      userId: 'user-123',
      documentId: 'doc-1',
      agreedAt: new Date(),
      ipAddress: null,
    });

    const request = createMockRequest('user-123');
    const result = await handleTosStatus(ctx, undefined, request);

    expect(result).toEqual({
      status: 200,
      body: { accepted: true, requiredVersion: 2, documentId: 'doc-1' },
    });
  });

  it('should return accepted=false when user has NOT accepted latest ToS', async () => {
    const tosDoc = {
      id: 'doc-5',
      type: 'terms_of_service',
      version: 5,
      title: 'ToS v5',
      content: '',
      effectiveAt: new Date(),
      createdAt: new Date(),
    };
    vi.mocked(repos.legalDocuments.findLatestByType).mockResolvedValue(tosDoc);
    vi.mocked(repos.userAgreements.findByUserAndDocument).mockResolvedValue(null);

    const request = createMockRequest('user-123');
    const result = await handleTosStatus(ctx, undefined, request);

    expect(result).toEqual({
      status: 200,
      body: { accepted: false, requiredVersion: 5, documentId: 'doc-5' },
    });
  });

  it('should return accepted=true with null version when no ToS document exists', async () => {
    vi.mocked(repos.legalDocuments.findLatestByType).mockResolvedValue(null);

    const request = createMockRequest('user-123');
    const result = await handleTosStatus(ctx, undefined, request);

    expect(result).toEqual({
      status: 200,
      body: { accepted: true, requiredVersion: null, documentId: null },
    });
  });

  it('should return 401 when no user is authenticated', async () => {
    const request = createMockRequest(); // No userId
    const result = await handleTosStatus(ctx, undefined, request);

    expect(result).toEqual({
      status: 401,
      body: { message: 'Authentication required' },
    });
  });
});
