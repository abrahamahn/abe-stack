// src/server/core/src/legal/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentLegalDocuments, getUserAgreements, publishLegalDocument } from './service';

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

// ============================================================================
// getCurrentLegalDocuments
// ============================================================================

describe('getCurrentLegalDocuments', () => {
  let legalDocRepo: LegalDocumentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    legalDocRepo = createMockLegalDocRepo();
  });

  it('should return result from repo.findAllLatest', async () => {
    const docs = [
      createMockDocument(),
      createMockDocument({ id: 'doc-2', type: 'privacy_policy', title: 'Privacy Policy' }),
    ];
    vi.mocked(legalDocRepo.findAllLatest).mockResolvedValue(docs);

    const result = await getCurrentLegalDocuments(legalDocRepo);

    expect(result).toBe(docs);
    expect(legalDocRepo.findAllLatest).toHaveBeenCalledOnce();
  });

  it('should return empty array when no documents exist', async () => {
    vi.mocked(legalDocRepo.findAllLatest).mockResolvedValue([]);

    const result = await getCurrentLegalDocuments(legalDocRepo);

    expect(result).toEqual([]);
  });
});

// ============================================================================
// getUserAgreements
// ============================================================================

describe('getUserAgreements', () => {
  let agreementRepo: UserAgreementRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    agreementRepo = createMockUserAgreementRepo();
  });

  it('should return agreements for user', async () => {
    const agreements = [createMockAgreement()];
    vi.mocked(agreementRepo.findByUserId).mockResolvedValue(agreements);

    const result = await getUserAgreements(agreementRepo, 'user-1');

    expect(result).toBe(agreements);
    expect(agreementRepo.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('should return empty array when no agreements exist', async () => {
    vi.mocked(agreementRepo.findByUserId).mockResolvedValue([]);

    const result = await getUserAgreements(agreementRepo, 'user-1');

    expect(result).toEqual([]);
  });
});

// ============================================================================
// publishLegalDocument
// ============================================================================

describe('publishLegalDocument', () => {
  let legalDocRepo: LegalDocumentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    legalDocRepo = createMockLegalDocRepo();
  });

  it('should create first version when no existing documents', async () => {
    vi.mocked(legalDocRepo.findLatestByType).mockResolvedValue(null);
    const created = createMockDocument({ version: 1 });
    vi.mocked(legalDocRepo.create).mockResolvedValue(created);

    const result = await publishLegalDocument(
      legalDocRepo,
      'terms_of_service',
      'Terms of Service',
      'Content...',
      new Date('2026-02-01T00:00:00Z'),
    );

    expect(legalDocRepo.findLatestByType).toHaveBeenCalledWith('terms_of_service');
    expect(legalDocRepo.create).toHaveBeenCalledWith({
      type: 'terms_of_service',
      title: 'Terms of Service',
      content: 'Content...',
      version: 1,
      effectiveAt: new Date('2026-02-01T00:00:00Z'),
    });
    expect(result).toBe(created);
  });

  it('should auto-increment version when existing documents exist', async () => {
    const existing = createMockDocument({ version: 3 });
    vi.mocked(legalDocRepo.findLatestByType).mockResolvedValue(existing);
    const created = createMockDocument({ version: 4 });
    vi.mocked(legalDocRepo.create).mockResolvedValue(created);

    await publishLegalDocument(
      legalDocRepo,
      'terms_of_service',
      'Updated Terms',
      'Updated content...',
      new Date('2026-03-01T00:00:00Z'),
    );

    expect(legalDocRepo.create).toHaveBeenCalledWith(expect.objectContaining({ version: 4 }));
  });

  it('should propagate errors from repository', async () => {
    vi.mocked(legalDocRepo.findLatestByType).mockResolvedValue(null);
    vi.mocked(legalDocRepo.create).mockRejectedValue(new Error('Database error'));

    await expect(
      publishLegalDocument(
        legalDocRepo,
        'terms_of_service',
        'Terms',
        'Content',
        new Date('2026-01-01'),
      ),
    ).rejects.toThrow('Database error');
  });
});
