// main/server/core/src/data-export/service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DataExportAlreadyPendingError,
  DataExportNotFoundError,
  getExportStatus,
  processDataExport,
  requestDataExport,
} from './service';

import type {
  DataExportRequest,
  DataExportRequestRepository,
  User,
  UserRepository,
} from '../../../db/src';

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

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: null,
    lockedUntil: null,
    lockReason: null,
    failedLoginAttempts: 0,
    totpSecret: null,
    totpEnabled: false,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    city: null,
    state: null,
    country: null,
    bio: null,
    language: null,
    website: null,
    lastUsernameChange: null,
    deactivatedAt: null,
    deletedAt: null,
    deletionGracePeriodEnds: null,
    tokenVersion: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    version: 1,
    ...overrides,
  };
}

// ============================================================================
// requestDataExport
// ============================================================================

describe('requestDataExport', () => {
  let exportRepo: DataExportRequestRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    exportRepo = createMockExportRepo();
  });

  it('should create a new export request', async () => {
    vi.mocked(exportRepo.findByUserId).mockResolvedValue([]);
    const created = createMockExportRequest();
    vi.mocked(exportRepo.create).mockResolvedValue(created);

    const result = await requestDataExport(exportRepo, 'user-1');

    expect(result).toBe(created);
    expect(exportRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'export',
        status: 'pending',
        format: 'json',
      }),
    );
  });

  it('should throw when user has pending request', async () => {
    vi.mocked(exportRepo.findByUserId).mockResolvedValue([
      createMockExportRequest({ status: 'pending' }),
    ]);

    await expect(requestDataExport(exportRepo, 'user-1')).rejects.toThrow(
      DataExportAlreadyPendingError,
    );
  });

  it('should throw when user has processing request', async () => {
    vi.mocked(exportRepo.findByUserId).mockResolvedValue([
      createMockExportRequest({ status: 'processing' }),
    ]);

    await expect(requestDataExport(exportRepo, 'user-1')).rejects.toThrow(
      DataExportAlreadyPendingError,
    );
  });

  it('should allow new request when only completed requests exist', async () => {
    vi.mocked(exportRepo.findByUserId).mockResolvedValue([
      createMockExportRequest({ status: 'completed' }),
    ]);
    const created = createMockExportRequest();
    vi.mocked(exportRepo.create).mockResolvedValue(created);

    const result = await requestDataExport(exportRepo, 'user-1');

    expect(result).toBe(created);
  });

  it('should allow new request when only failed requests exist', async () => {
    vi.mocked(exportRepo.findByUserId).mockResolvedValue([
      createMockExportRequest({ status: 'failed' }),
    ]);
    const created = createMockExportRequest();
    vi.mocked(exportRepo.create).mockResolvedValue(created);

    const result = await requestDataExport(exportRepo, 'user-1');

    expect(result).toBe(created);
  });
});

// ============================================================================
// getExportStatus
// ============================================================================

describe('getExportStatus', () => {
  let exportRepo: DataExportRequestRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    exportRepo = createMockExportRepo();
  });

  it('should return export request for correct user', async () => {
    const request = createMockExportRequest();
    vi.mocked(exportRepo.findById).mockResolvedValue(request);

    const result = await getExportStatus(exportRepo, 'export-1', 'user-1');

    expect(result).toBe(request);
  });

  it('should throw when request not found', async () => {
    vi.mocked(exportRepo.findById).mockResolvedValue(null);

    await expect(getExportStatus(exportRepo, 'missing-id', 'user-1')).rejects.toThrow(
      DataExportNotFoundError,
    );
  });

  it('should throw when request belongs to different user', async () => {
    const request = createMockExportRequest({ userId: 'other-user' });
    vi.mocked(exportRepo.findById).mockResolvedValue(request);

    await expect(getExportStatus(exportRepo, 'export-1', 'user-1')).rejects.toThrow(
      DataExportNotFoundError,
    );
  });
});

// ============================================================================
// processDataExport
// ============================================================================

describe('processDataExport', () => {
  let exportRepo: DataExportRequestRepository;
  let userRepo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    exportRepo = createMockExportRepo();
    userRepo = createMockUserRepo();
  });

  function makeRepos() {
    return { dataExportRequests: exportRepo, users: userRepo };
  }

  it('should throw when request not found', async () => {
    vi.mocked(exportRepo.findById).mockResolvedValue(null);

    await expect(processDataExport(makeRepos(), 'missing-id')).rejects.toThrow(
      DataExportNotFoundError,
    );
  });

  it('should mark as processing then completed', async () => {
    const request = createMockExportRequest();
    vi.mocked(exportRepo.findById).mockResolvedValue(request);
    vi.mocked(exportRepo.updateStatus).mockResolvedValue(
      createMockExportRequest({ status: 'processing' }),
    );
    vi.mocked(exportRepo.update).mockResolvedValue(
      createMockExportRequest({ status: 'completed' }),
    );
    vi.mocked(userRepo.findById).mockResolvedValue(createMockUser());

    await processDataExport(makeRepos(), 'export-1');

    expect(exportRepo.updateStatus).toHaveBeenCalledWith('export-1', 'processing');
    expect(exportRepo.update).toHaveBeenCalledWith(
      'export-1',
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('should return aggregated user data', async () => {
    const request = createMockExportRequest();
    vi.mocked(exportRepo.findById).mockResolvedValue(request);
    vi.mocked(exportRepo.updateStatus).mockResolvedValue(
      createMockExportRequest({ status: 'processing' }),
    );
    vi.mocked(exportRepo.update).mockResolvedValue(
      createMockExportRequest({ status: 'completed' }),
    );
    vi.mocked(userRepo.findById).mockResolvedValue(createMockUser());

    const result = await processDataExport(makeRepos(), 'export-1');

    expect(result.profile.id).toBe('user-1');
    expect(result.profile.email).toBe('test@example.com');
    expect(result.profile.firstName).toBe('Test');
    expect(result.profile.lastName).toBe('User');
    expect(result.profile.username).toBe('testuser');
    expect(result.format).toBe('json');
    expect(result.exportedAt).toBeDefined();
  });

  it('should include memberships when repo is provided', async () => {
    const request = createMockExportRequest();
    vi.mocked(exportRepo.findById).mockResolvedValue(request);
    vi.mocked(exportRepo.updateStatus).mockResolvedValue(
      createMockExportRequest({ status: 'processing' }),
    );
    vi.mocked(exportRepo.update).mockResolvedValue(
      createMockExportRequest({ status: 'completed' }),
    );
    vi.mocked(userRepo.findById).mockResolvedValue(createMockUser());

    const memberships = {
      findByUserId: vi
        .fn()
        .mockResolvedValue([{ tenantId: 't-1', role: 'admin', createdAt: new Date('2026-01-10') }]),
      findByTenantAndUser: vi.fn(),
      findByTenantId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const result = await processDataExport({ ...makeRepos(), memberships } as never, 'export-1');

    expect(result.memberships).toHaveLength(1);
    expect(result.memberships?.[0]?.tenantId).toBe('t-1');
    expect(result.memberships?.[0]?.role).toBe('admin');
  });

  it('should omit optional data when repos not provided', async () => {
    const request = createMockExportRequest();
    vi.mocked(exportRepo.findById).mockResolvedValue(request);
    vi.mocked(exportRepo.updateStatus).mockResolvedValue(
      createMockExportRequest({ status: 'processing' }),
    );
    vi.mocked(exportRepo.update).mockResolvedValue(
      createMockExportRequest({ status: 'completed' }),
    );
    vi.mocked(userRepo.findById).mockResolvedValue(createMockUser());

    const result = await processDataExport(makeRepos(), 'export-1');

    expect(result.memberships).toBeUndefined();
    expect(result.subscriptions).toBeUndefined();
    expect(result.activities).toBeUndefined();
    expect(result.files).toBeUndefined();
    expect(result.notifications).toBeUndefined();
    expect(result.sessions).toBeUndefined();
    expect(result.consentHistory).toBeUndefined();
  });

  it('should mark as failed when user not found', async () => {
    const request = createMockExportRequest();
    vi.mocked(exportRepo.findById).mockResolvedValue(request);
    vi.mocked(exportRepo.updateStatus).mockResolvedValue(
      createMockExportRequest({ status: 'processing' }),
    );
    vi.mocked(exportRepo.update).mockResolvedValue(createMockExportRequest({ status: 'failed' }));
    vi.mocked(userRepo.findById).mockResolvedValue(null);

    await expect(processDataExport(makeRepos(), 'export-1')).rejects.toThrow('User not found');

    expect(exportRepo.update).toHaveBeenCalledWith(
      'export-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
