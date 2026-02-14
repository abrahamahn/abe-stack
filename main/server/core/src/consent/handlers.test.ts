// main/server/core/src/consent/handlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetConsent, handleUpdateConsent } from './handlers';

import type { ConsentAppContext } from './types';
import type { ConsentLog, ConsentLogRepository, NewConsentLog } from '../../../db/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConsentLogRepo(): ConsentLogRepository {
  return {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findByUserAndType: vi.fn(),
    findLatestByUserAndType: vi.fn(),
  };
}

function createMockCtx(overrides?: { consentLogs?: ConsentLogRepository }): ConsentAppContext {
  return {
    db: {},
    repos: {
      consentLogs: overrides?.consentLogs ?? createMockConsentLogRepo(),
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
}

function createMockConsentLog(overrides?: Partial<ConsentLog>): ConsentLog {
  return {
    id: 'cl-1',
    userId: 'user-1',
    consentType: 'analytics',
    granted: true,
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent',
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
// handleGetConsent
// ============================================================================

describe('handleGetConsent', () => {
  let ctx: ConsentAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockCtx();
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleGetConsent(ctx, undefined, {
      requestInfo: { ipAddress: '127.0.0.1' },
      cookies: {},
      headers: {},
    });

    expect(result.status).toBe(401);
  });

  it('should return consent preferences', async () => {
    vi.mocked(ctx.repos.consentLogs.findLatestByUserAndType).mockResolvedValue(null);

    const result = await handleGetConsent(ctx, undefined, createAuthenticatedRequest());

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('preferences');
    const body = result.body as { preferences: Record<string, boolean | null> };
    expect(body.preferences['analytics']).toBeNull();
    expect(body.preferences['marketing_email']).toBeNull();
  });

  it('should return 500 on unexpected error', async () => {
    vi.mocked(ctx.repos.consentLogs.findLatestByUserAndType).mockRejectedValue(
      new Error('DB error'),
    );

    const result = await handleGetConsent(ctx, undefined, createAuthenticatedRequest());

    expect(result.status).toBe(500);
    expect(result.body).toHaveProperty('message');
  });
});

// ============================================================================
// handleUpdateConsent
// ============================================================================

describe('handleUpdateConsent', () => {
  let ctx: ConsentAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockCtx();
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleUpdateConsent(
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

  it('should return 400 when no preferences specified', async () => {
    const result = await handleUpdateConsent(ctx, {}, createAuthenticatedRequest());

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('At least one');
  });

  it('should update consent and return preferences', async () => {
    vi.mocked(ctx.repos.consentLogs.create).mockImplementation((data: NewConsentLog) =>
      Promise.resolve(
        createMockConsentLog({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );
    vi.mocked(ctx.repos.consentLogs.findLatestByUserAndType).mockImplementation(
      (_userId: string, consentType: string) => {
        if (consentType === 'analytics') {
          return Promise.resolve(createMockConsentLog({ consentType: 'analytics', granted: true }));
        }
        return Promise.resolve(null);
      },
    );

    const result = await handleUpdateConsent(
      ctx,
      { analytics: true },
      createAuthenticatedRequest(),
    );

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('preferences');
    expect(result.body).toHaveProperty('updated');
    const body = result.body as { updated: number };
    expect(body.updated).toBe(1);
  });

  it('should handle multiple preference updates', async () => {
    vi.mocked(ctx.repos.consentLogs.create).mockImplementation((data: NewConsentLog) =>
      Promise.resolve(
        createMockConsentLog({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );
    vi.mocked(ctx.repos.consentLogs.findLatestByUserAndType).mockResolvedValue(null);

    const result = await handleUpdateConsent(
      ctx,
      { analytics: true, marketing_email: false },
      createAuthenticatedRequest(),
    );

    expect(result.status).toBe(200);
    const body = result.body as { updated: number };
    expect(body.updated).toBe(2);
  });

  it('should return 500 on unexpected error', async () => {
    vi.mocked(ctx.repos.consentLogs.create).mockRejectedValue(new Error('DB error'));

    const result = await handleUpdateConsent(
      ctx,
      { analytics: true },
      createAuthenticatedRequest(),
    );

    expect(result.status).toBe(500);
    expect(result.body).toHaveProperty('message');
  });
});
