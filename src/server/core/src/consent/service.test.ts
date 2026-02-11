// src/server/core/src/consent/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserConsent, updateUserConsent } from './service';

import type { ConsentLog, ConsentLogRepository, NewConsentLog } from '@abe-stack/db';

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

// ============================================================================
// getUserConsent
// ============================================================================

describe('getUserConsent', () => {
  let consentLogRepo: ConsentLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    consentLogRepo = createMockConsentLogRepo();
  });

  it('should return null for all types when no consent logs exist', async () => {
    vi.mocked(consentLogRepo.findLatestByUserAndType).mockResolvedValue(null);

    const result = await getUserConsent(consentLogRepo, 'user-1');

    expect(result.analytics).toBeNull();
    expect(result.marketing_email).toBeNull();
    expect(result.third_party_sharing).toBeNull();
    expect(result.profiling).toBeNull();
  });

  it('should return granted state from latest consent log', async () => {
    vi.mocked(consentLogRepo.findLatestByUserAndType).mockImplementation(
      (_userId: string, consentType: string) => {
        if (consentType === 'analytics') {
          return Promise.resolve(createMockConsentLog({ consentType: 'analytics', granted: true }));
        }
        if (consentType === 'marketing_email') {
          return Promise.resolve(
            createMockConsentLog({ consentType: 'marketing_email', granted: false }),
          );
        }
        return Promise.resolve(null);
      },
    );

    const result = await getUserConsent(consentLogRepo, 'user-1');

    expect(result.analytics).toBe(true);
    expect(result.marketing_email).toBe(false);
    expect(result.third_party_sharing).toBeNull();
    expect(result.profiling).toBeNull();
  });

  it('should query all consent types', async () => {
    vi.mocked(consentLogRepo.findLatestByUserAndType).mockResolvedValue(null);

    await getUserConsent(consentLogRepo, 'user-1');

    expect(consentLogRepo.findLatestByUserAndType).toHaveBeenCalledWith(
      'user-1',
      'marketing_email',
    );
    expect(consentLogRepo.findLatestByUserAndType).toHaveBeenCalledWith('user-1', 'analytics');
    expect(consentLogRepo.findLatestByUserAndType).toHaveBeenCalledWith(
      'user-1',
      'third_party_sharing',
    );
    expect(consentLogRepo.findLatestByUserAndType).toHaveBeenCalledWith('user-1', 'profiling');
  });
});

// ============================================================================
// updateUserConsent
// ============================================================================

describe('updateUserConsent', () => {
  let consentLogRepo: ConsentLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    consentLogRepo = createMockConsentLogRepo();
  });

  it('should create consent log entries for each specified preference', async () => {
    vi.mocked(consentLogRepo.create).mockImplementation((data: NewConsentLog) =>
      Promise.resolve(
        createMockConsentLog({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    const entries = await updateUserConsent(
      consentLogRepo,
      'user-1',
      { analytics: true, marketing_email: false },
      '127.0.0.1',
      'TestAgent',
    );

    expect(entries).toHaveLength(2);
    expect(consentLogRepo.create).toHaveBeenCalledTimes(2);
  });

  it('should not create entries for unspecified preferences', async () => {
    vi.mocked(consentLogRepo.create).mockImplementation((data: NewConsentLog) =>
      Promise.resolve(
        createMockConsentLog({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    await updateUserConsent(consentLogRepo, 'user-1', { analytics: true }, '127.0.0.1', null);

    expect(consentLogRepo.create).toHaveBeenCalledTimes(1);
    expect(consentLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        consentType: 'analytics',
        granted: true,
      }),
    );
  });

  it('should pass ip address and user agent to consent log', async () => {
    vi.mocked(consentLogRepo.create).mockImplementation((data: NewConsentLog) =>
      Promise.resolve(
        createMockConsentLog({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    await updateUserConsent(
      consentLogRepo,
      'user-1',
      { analytics: true },
      '10.0.0.1',
      'Mozilla/5.0',
    );

    expect(consentLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      }),
    );
  });

  it('should return empty array when no preferences specified', async () => {
    const entries = await updateUserConsent(consentLogRepo, 'user-1', {}, null, null);

    expect(entries).toEqual([]);
    expect(consentLogRepo.create).not.toHaveBeenCalled();
  });

  it('should handle all four consent types', async () => {
    vi.mocked(consentLogRepo.create).mockImplementation((data: NewConsentLog) =>
      Promise.resolve(
        createMockConsentLog({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    const entries = await updateUserConsent(
      consentLogRepo,
      'user-1',
      {
        analytics: true,
        marketing_email: false,
        third_party_sharing: true,
        profiling: false,
      },
      '127.0.0.1',
      'TestAgent',
    );

    expect(entries).toHaveLength(4);
    expect(consentLogRepo.create).toHaveBeenCalledTimes(4);
  });
});
