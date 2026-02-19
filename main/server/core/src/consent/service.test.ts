// main/server/core/src/consent/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserConsent, updateUserConsent } from './service';

import type { ConsentRecord, ConsentRecordRepository } from '../../../db/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConsentRecordRepo(): ConsentRecordRepository {
  return {
    recordConsent: vi.fn(),
    findConsentsByUserId: vi.fn(),
    findLatestConsentByUserAndType: vi.fn(),
    recordAgreement: vi.fn(),
    findAgreementsByUserId: vi.fn(),
    findAgreementByUserAndDocument: vi.fn(),
  };
}

function createMockConsentRecord(overrides?: Partial<ConsentRecord>): ConsentRecord {
  return {
    id: 'cr-1',
    userId: 'user-1',
    recordType: 'consent_preference' as const,
    documentId: null,
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
  let consentRecordRepo: ConsentRecordRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    consentRecordRepo = createMockConsentRecordRepo();
  });

  it('should return null for all types when no consent records exist', async () => {
    vi.mocked(consentRecordRepo.findLatestConsentByUserAndType).mockResolvedValue(null);

    const result = await getUserConsent(consentRecordRepo, 'user-1');

    expect(result.analytics).toBeNull();
    expect(result.marketing_email).toBeNull();
    expect(result.third_party_sharing).toBeNull();
    expect(result.profiling).toBeNull();
  });

  it('should return granted state from latest consent record', async () => {
    vi.mocked(consentRecordRepo.findLatestConsentByUserAndType).mockImplementation(
      (_userId: string, consentType: string) => {
        if (consentType === 'analytics') {
          return Promise.resolve(
            createMockConsentRecord({ consentType: 'analytics', granted: true }),
          );
        }
        if (consentType === 'marketing_email') {
          return Promise.resolve(
            createMockConsentRecord({ consentType: 'marketing_email', granted: false }),
          );
        }
        return Promise.resolve(null);
      },
    );

    const result = await getUserConsent(consentRecordRepo, 'user-1');

    expect(result.analytics).toBe(true);
    expect(result.marketing_email).toBe(false);
    expect(result.third_party_sharing).toBeNull();
    expect(result.profiling).toBeNull();
  });

  it('should query all consent types', async () => {
    vi.mocked(consentRecordRepo.findLatestConsentByUserAndType).mockResolvedValue(null);

    await getUserConsent(consentRecordRepo, 'user-1');

    expect(consentRecordRepo.findLatestConsentByUserAndType).toHaveBeenCalledWith(
      'user-1',
      'marketing_email',
    );
    expect(consentRecordRepo.findLatestConsentByUserAndType).toHaveBeenCalledWith(
      'user-1',
      'analytics',
    );
    expect(consentRecordRepo.findLatestConsentByUserAndType).toHaveBeenCalledWith(
      'user-1',
      'third_party_sharing',
    );
    expect(consentRecordRepo.findLatestConsentByUserAndType).toHaveBeenCalledWith(
      'user-1',
      'profiling',
    );
  });
});

// ============================================================================
// updateUserConsent
// ============================================================================

describe('updateUserConsent', () => {
  let consentRecordRepo: ConsentRecordRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    consentRecordRepo = createMockConsentRecordRepo();
  });

  it('should create consent record entries for each specified preference', async () => {
    vi.mocked(consentRecordRepo.recordConsent).mockImplementation((data) =>
      Promise.resolve(
        createMockConsentRecord({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    const entries = await updateUserConsent(
      consentRecordRepo,
      'user-1',
      { analytics: true, marketing_email: false },
      '127.0.0.1',
      'TestAgent',
    );

    expect(entries).toHaveLength(2);
    expect(consentRecordRepo.recordConsent).toHaveBeenCalledTimes(2);
  });

  it('should not create entries for unspecified preferences', async () => {
    vi.mocked(consentRecordRepo.recordConsent).mockImplementation((data) =>
      Promise.resolve(
        createMockConsentRecord({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    await updateUserConsent(consentRecordRepo, 'user-1', { analytics: true }, '127.0.0.1', null);

    expect(consentRecordRepo.recordConsent).toHaveBeenCalledTimes(1);
    expect(consentRecordRepo.recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        consentType: 'analytics',
        granted: true,
      }),
    );
  });

  it('should pass ip address and user agent to consent record', async () => {
    vi.mocked(consentRecordRepo.recordConsent).mockImplementation((data) =>
      Promise.resolve(
        createMockConsentRecord({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    await updateUserConsent(
      consentRecordRepo,
      'user-1',
      { analytics: true },
      '10.0.0.1',
      'Mozilla/5.0',
    );

    expect(consentRecordRepo.recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      }),
    );
  });

  it('should return empty array when no preferences specified', async () => {
    const entries = await updateUserConsent(consentRecordRepo, 'user-1', {}, null, null);

    expect(entries).toEqual([]);
    expect(consentRecordRepo.recordConsent).not.toHaveBeenCalled();
  });

  it('should handle all four consent types', async () => {
    vi.mocked(consentRecordRepo.recordConsent).mockImplementation((data) =>
      Promise.resolve(
        createMockConsentRecord({
          consentType: data.consentType,
          granted: data.granted,
        }),
      ),
    );

    const entries = await updateUserConsent(
      consentRecordRepo,
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
    expect(consentRecordRepo.recordConsent).toHaveBeenCalledTimes(4);
  });
});
