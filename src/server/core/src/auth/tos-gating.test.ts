// src/server/core/src/auth/tos-gating.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { acceptTos, checkTosAcceptance, createRequireTosAcceptance } from './tos-gating';

import type { Repositories } from '@abe-stack/db';

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

function createMockRequest(userId?: string) {
  return {
    user: userId !== undefined ? { userId, email: 'test@example.com', role: 'user' } : undefined,
    headers: {},
  };
}

function createMockReply() {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

// ============================================================================
// Tests: checkTosAcceptance
// ============================================================================

describe('checkTosAcceptance', () => {
  let repos: Repositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should return accepted=true if no ToS document exists', async () => {
    vi.mocked(repos.legalDocuments.findLatestByType).mockResolvedValue(null);

    const status = await checkTosAcceptance(repos, 'user-123');

    expect(status).toEqual({ accepted: true, requiredVersion: null, documentId: null });
    expect(repos.legalDocuments.findLatestByType).toHaveBeenCalledWith('terms_of_service');
  });

  it('should return accepted=true if user has agreed to latest ToS', async () => {
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
      ipAddress: '192.168.1.1',
    });

    const status = await checkTosAcceptance(repos, 'user-123');

    expect(status).toEqual({ accepted: true, requiredVersion: 2, documentId: 'doc-1' });
    expect(repos.userAgreements.findByUserAndDocument).toHaveBeenCalledWith('user-123', 'doc-1');
  });

  it('should return accepted=false if user has NOT agreed to latest ToS', async () => {
    const tosDoc = {
      id: 'doc-2',
      type: 'terms_of_service',
      version: 3,
      title: 'ToS v3',
      content: '',
      effectiveAt: new Date(),
      createdAt: new Date(),
    };
    vi.mocked(repos.legalDocuments.findLatestByType).mockResolvedValue(tosDoc);
    vi.mocked(repos.userAgreements.findByUserAndDocument).mockResolvedValue(null);

    const status = await checkTosAcceptance(repos, 'user-123');

    expect(status).toEqual({ accepted: false, requiredVersion: 3, documentId: 'doc-2' });
  });
});

// ============================================================================
// Tests: acceptTos
// ============================================================================

describe('acceptTos', () => {
  let repos: Repositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should create a user agreement record', async () => {
    const agreedAt = new Date();
    vi.mocked(repos.userAgreements.create).mockResolvedValue({
      id: 'agr-1',
      userId: 'user-123',
      documentId: 'doc-1',
      agreedAt,
      ipAddress: '10.0.0.1',
    });

    const result = await acceptTos(repos, 'user-123', 'doc-1', '10.0.0.1');

    expect(result).toEqual({ agreedAt });
    expect(repos.userAgreements.create).toHaveBeenCalledWith({
      userId: 'user-123',
      documentId: 'doc-1',
      ipAddress: '10.0.0.1',
    });
  });

  it('should handle missing IP address gracefully', async () => {
    const agreedAt = new Date();
    vi.mocked(repos.userAgreements.create).mockResolvedValue({
      id: 'agr-2',
      userId: 'user-456',
      documentId: 'doc-2',
      agreedAt,
      ipAddress: null,
    });

    await acceptTos(repos, 'user-456', 'doc-2');

    expect(repos.userAgreements.create).toHaveBeenCalledWith({
      userId: 'user-456',
      documentId: 'doc-2',
      ipAddress: null,
    });
  });
});

// ============================================================================
// Tests: createRequireTosAcceptance
// ============================================================================

describe('createRequireTosAcceptance', () => {
  let repos: Repositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should pass through if user has accepted latest ToS', async () => {
    const tosDoc = {
      id: 'doc-1',
      type: 'terms_of_service',
      version: 1,
      title: 'ToS v1',
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

    const hook = createRequireTosAcceptance(repos);
    const req = createMockRequest('user-123');
    const reply = createMockReply();

    await hook(req as never, reply as never);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('should pass through if no ToS document exists', async () => {
    vi.mocked(repos.legalDocuments.findLatestByType).mockResolvedValue(null);

    const hook = createRequireTosAcceptance(repos);
    const req = createMockRequest('user-123');
    const reply = createMockReply();

    await hook(req as never, reply as never);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should return 403 if user has NOT accepted latest ToS', async () => {
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

    const hook = createRequireTosAcceptance(repos);
    const req = createMockRequest('user-123');
    const reply = createMockReply();

    await hook(req as never, reply as never);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      code: 'TOS_ACCEPTANCE_REQUIRED',
      message: 'You must accept the latest Terms of Service to continue.',
      requiredVersion: 5,
      documentId: 'doc-5',
    });
  });

  it('should return 401 if no user is attached to request', async () => {
    const hook = createRequireTosAcceptance(repos);
    const req = createMockRequest(); // No user
    const reply = createMockReply();

    await hook(req as never, reply as never);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });
});
