// src/server/core/src/legal/handlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetCurrentLegal, handleGetUserAgreements, handlePublishLegal } from './handlers';

import type { LegalAppContext } from './types';
import type {
  LegalDocument,
  LegalDocumentRepository,
  UserAgreement,
  UserAgreementRepository,
} from '@abe-stack/db';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockLegalDocRepo(): LegalDocumentRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByType: vi.fn(),
    findLatestByType: vi.fn(),
    findAllLatest: vi.fn(),
    update: vi.fn(),
  };
}

function createMockUserAgreementRepo(): UserAgreementRepository {
  return {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findByUserAndDocument: vi.fn(),
    findByDocumentId: vi.fn(),
  };
}

function createMockCtx(overrides?: {
  legalDocs?: LegalDocumentRepository;
  userAgreements?: UserAgreementRepository;
}): LegalAppContext {
  return {
    db: {},
    repos: {
      legalDocuments: overrides?.legalDocs ?? createMockLegalDocRepo(),
      userAgreements: overrides?.userAgreements ?? createMockUserAgreementRepo(),
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
}

function createMockDocument(overrides?: Partial<LegalDocument>): LegalDocument {
  return {
    id: 'doc-1',
    type: 'terms_of_service',
    title: 'Terms of Service',
    content: 'Terms content...',
    version: 1,
    effectiveAt: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockAgreement(overrides?: Partial<UserAgreement>): UserAgreement {
  return {
    id: 'agreement-1',
    userId: 'user-1',
    documentId: 'doc-1',
    agreedAt: new Date('2026-01-15T10:00:00Z'),
    ipAddress: '127.0.0.1',
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

function createAdminRequest(userId = 'admin-1') {
  return {
    user: { userId, email: 'admin@example.com', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'TestAgent' },
    cookies: {},
    headers: { 'user-agent': 'TestAgent' },
  };
}

// ============================================================================
// handleGetCurrentLegal
// ============================================================================

describe('handleGetCurrentLegal', () => {
  let ctx: LegalAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockCtx();
  });

  it('should return current legal documents', async () => {
    const docs = [createMockDocument()];
    vi.mocked(ctx.repos.legalDocuments.findAllLatest).mockResolvedValue(docs);

    const result = await handleGetCurrentLegal(ctx, undefined, {});

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('documents');
    const body = result.body as { documents: unknown[] };
    expect(body.documents).toHaveLength(1);
  });

  it('should format dates as ISO strings', async () => {
    const docs = [createMockDocument()];
    vi.mocked(ctx.repos.legalDocuments.findAllLatest).mockResolvedValue(docs);

    const result = await handleGetCurrentLegal(ctx, undefined, {});

    const body = result.body as { documents: Array<{ effectiveAt: string; createdAt: string }> };
    expect(body.documents[0]?.effectiveAt).toBe('2026-01-01T00:00:00.000Z');
    expect(body.documents[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should return empty array when no documents exist', async () => {
    vi.mocked(ctx.repos.legalDocuments.findAllLatest).mockResolvedValue([]);

    const result = await handleGetCurrentLegal(ctx, undefined, {});

    expect(result.status).toBe(200);
    const body = result.body as { documents: unknown[] };
    expect(body.documents).toEqual([]);
  });

  it('should return 500 on unexpected error', async () => {
    vi.mocked(ctx.repos.legalDocuments.findAllLatest).mockRejectedValue(new Error('DB error'));

    const result = await handleGetCurrentLegal(ctx, undefined, {});

    expect(result.status).toBe(500);
    expect(result.body).toHaveProperty('message');
  });
});

// ============================================================================
// handleGetUserAgreements
// ============================================================================

describe('handleGetUserAgreements', () => {
  let ctx: LegalAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockCtx();
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleGetUserAgreements(ctx, undefined, {
      requestInfo: { ipAddress: '127.0.0.1' },
      cookies: {},
      headers: {},
    });

    expect(result.status).toBe(401);
  });

  it('should return user agreements', async () => {
    const agreements = [createMockAgreement()];
    vi.mocked(ctx.repos.userAgreements.findByUserId).mockResolvedValue(agreements);

    const result = await handleGetUserAgreements(ctx, undefined, createAuthenticatedRequest());

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('agreements');
    const body = result.body as { agreements: unknown[] };
    expect(body.agreements).toHaveLength(1);
  });

  it('should format dates as ISO strings in agreements', async () => {
    const agreements = [createMockAgreement()];
    vi.mocked(ctx.repos.userAgreements.findByUserId).mockResolvedValue(agreements);

    const result = await handleGetUserAgreements(ctx, undefined, createAuthenticatedRequest());

    const body = result.body as { agreements: Array<{ agreedAt: string }> };
    expect(body.agreements[0]?.agreedAt).toBe('2026-01-15T10:00:00.000Z');
  });
});

// ============================================================================
// handlePublishLegal
// ============================================================================

describe('handlePublishLegal', () => {
  let ctx: LegalAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockCtx();
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handlePublishLegal(
      ctx,
      {},
      {
        requestInfo: { ipAddress: '127.0.0.1' },
        cookies: {},
        headers: {},
      },
    );

    expect(result.status).toBe(401);
  });

  it('should return 400 when type is missing', async () => {
    const result = await handlePublishLegal(
      ctx,
      { title: 'T', content: 'C', effectiveAt: '2026-01-01' },
      createAdminRequest(),
    );

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('type');
  });

  it('should return 400 when title is missing', async () => {
    const result = await handlePublishLegal(
      ctx,
      { type: 'terms_of_service', content: 'C', effectiveAt: '2026-01-01' },
      createAdminRequest(),
    );

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('title');
  });

  it('should return 400 when content is missing', async () => {
    const result = await handlePublishLegal(
      ctx,
      { type: 'terms_of_service', title: 'T', effectiveAt: '2026-01-01' },
      createAdminRequest(),
    );

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('content');
  });

  it('should return 400 when effectiveAt is missing', async () => {
    const result = await handlePublishLegal(
      ctx,
      { type: 'terms_of_service', title: 'T', content: 'C' },
      createAdminRequest(),
    );

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('effectiveAt');
  });

  it('should return 400 when effectiveAt is invalid date', async () => {
    const result = await handlePublishLegal(
      ctx,
      { type: 'terms_of_service', title: 'T', content: 'C', effectiveAt: 'not-a-date' },
      createAdminRequest(),
    );

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('valid date');
  });

  it('should create and return a legal document', async () => {
    vi.mocked(ctx.repos.legalDocuments.findLatestByType).mockResolvedValue(null);
    const created = createMockDocument();
    vi.mocked(ctx.repos.legalDocuments.create).mockResolvedValue(created);

    const result = await handlePublishLegal(
      ctx,
      {
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Content...',
        effectiveAt: '2026-01-01T00:00:00Z',
      },
      createAdminRequest(),
    );

    expect(result.status).toBe(201);
    expect(result.body).toHaveProperty('document');
    const body = result.body as { document: { type: string; version: number } };
    expect(body.document.type).toBe('terms_of_service');
  });
});
