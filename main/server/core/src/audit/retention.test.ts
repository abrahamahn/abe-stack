// main/server/core/src/audit/retention.test.ts
/**
 * Audit Retention Service Tests
 *
 * Tests for archiving to cold storage, purging old entries,
 * and the full retention cycle.
 *
 * Sprint 3.3 — Audit Retention
 *
 * @module audit/retention.test
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { archiveOldAuditEntries, purgeArchivedEntries, runRetentionCycle } from './retention';

import type { AuditEventRepository } from '../../../db/src';
import type { FileStorageProvider } from '../files/types';
import type { ServerLogger } from '@bslt/shared';

// ============================================================================
// Mock Factories
// ============================================================================

function createMockAuditRepo(): AuditEventRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn().mockResolvedValue([]),
    findRecent: vi.fn().mockResolvedValue([]),
    findByActorId: vi.fn().mockResolvedValue([]),
    findByTenantId: vi.fn().mockResolvedValue([]),
    findByAction: vi.fn().mockResolvedValue([]),
    findByResource: vi.fn().mockResolvedValue([]),
    deleteOlderThan: vi.fn().mockResolvedValue(0),
  } as unknown as AuditEventRepository;
}

function createMockStorage(): FileStorageProvider {
  return {
    upload: vi.fn().mockResolvedValue('uploaded-key'),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed'),
  };
}

function createMockLogger(): ServerLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as ServerLogger;
}

// ============================================================================
// Test Data
// ============================================================================

function makeAuditEvent(id: string) {
  return {
    id,
    tenantId: null,
    actorId: 'user-1',
    action: 'billing.plan_changed',
    category: 'billing',
    severity: 'info',
    resource: 'subscription',
    resourceId: 'sub-1',
    metadata: { oldPlan: 'free', newPlan: 'pro' },
    ipAddress: null,
    userAgent: null,
    createdAt: new Date('2025-10-01'),
  };
}

// ============================================================================
// Tests: archiveOldAuditEntries
// ============================================================================

describe('archiveOldAuditEntries', () => {
  let auditRepo: AuditEventRepository;
  let storage: FileStorageProvider;
  let log: ServerLogger;

  beforeEach(() => {
    auditRepo = createMockAuditRepo();
    storage = createMockStorage();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should archive entries older than the specified days', async () => {
    const entries = [makeAuditEvent('ae-1'), makeAuditEvent('ae-2')];
    vi.mocked(auditRepo.find).mockResolvedValueOnce(entries as never);

    const result = await archiveOldAuditEntries(auditRepo, 90, storage, log);

    expect(result.archivedCount).toBe(2);
    expect(result.archiveKey).not.toBeNull();
    expect(result.archiveKey).toContain('audit-archives/');
    expect(result.archiveKey).toContain('2-entries.ndjson');

    // Verify storage upload was called with NDJSON content
    expect(storage.upload).toHaveBeenCalledTimes(1);
    const uploadCall = vi.mocked(storage.upload).mock.calls[0]!;
    expect(uploadCall[2]).toBe('application/x-ndjson');

    // Verify the content is valid NDJSON
    const content = uploadCall[1] as string;
    const lines = content.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toHaveProperty('id', 'ae-1');
    expect(JSON.parse(lines[1]!)).toHaveProperty('id', 'ae-2');
  });

  test('should return zero count when no entries to archive', async () => {
    vi.mocked(auditRepo.find).mockResolvedValueOnce([]);

    const result = await archiveOldAuditEntries(auditRepo, 90, storage, log);

    expect(result.archivedCount).toBe(0);
    expect(result.archiveKey).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(log.debug).toHaveBeenCalled();
  });

  test('should log info on successful archive', async () => {
    const entries = [makeAuditEvent('ae-1')];
    vi.mocked(auditRepo.find).mockResolvedValueOnce(entries as never);

    await archiveOldAuditEntries(auditRepo, 90, storage, log);

    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        archivedCount: 1,
        olderThanDays: 90,
      }),
      'Audit entries archived to cold storage',
    );
  });
});

// ============================================================================
// Tests: purgeArchivedEntries
// ============================================================================

describe('purgeArchivedEntries', () => {
  let auditRepo: AuditEventRepository;
  let log: ServerLogger;

  beforeEach(() => {
    auditRepo = createMockAuditRepo();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should purge entries older than the specified days', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(42);

    const result = await purgeArchivedEntries(auditRepo, 90, log);

    expect(result.purgedCount).toBe(42);
    expect(auditRepo.deleteOlderThan).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ purgedCount: 42, olderThanDays: 90 }),
      'Audit entries purged',
    );
  });

  test('should return zero when no entries to purge', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(0);

    const result = await purgeArchivedEntries(auditRepo, 90, log);

    expect(result.purgedCount).toBe(0);
    expect(log.debug).toHaveBeenCalled();
  });

  test('should pass correct cutoff date to repository', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(0);

    await purgeArchivedEntries(auditRepo, 30, log);

    const cutoffArg = vi.mocked(auditRepo.deleteOlderThan).mock.calls[0]![0];
    const cutoffDate = new Date(cutoffArg);
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 30);

    // Allow 1 second tolerance for test execution time
    expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
  });
});

// ============================================================================
// Tests: runRetentionCycle
// ============================================================================

describe('runRetentionCycle', () => {
  let auditRepo: AuditEventRepository;
  let storage: FileStorageProvider;
  let log: ServerLogger;

  beforeEach(() => {
    auditRepo = createMockAuditRepo();
    storage = createMockStorage();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should only purge when archive is disabled (default)', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(10);

    const result = await runRetentionCycle(auditRepo, log);

    expect(result.archive).toBeNull();
    expect(result.purge.purgedCount).toBe(10);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  test('should archive then purge when archive is enabled', async () => {
    const entries = [makeAuditEvent('ae-1')];
    vi.mocked(auditRepo.find).mockResolvedValueOnce(entries as never);
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(5);

    const result = await runRetentionCycle(
      auditRepo,
      log,
      { archiveEnabled: true, retentionDays: 60 },
      storage,
    );

    expect(result.archive).not.toBeNull();
    expect(result.archive!.archivedCount).toBe(1);
    expect(result.purge.purgedCount).toBe(5);
    expect(storage.upload).toHaveBeenCalledTimes(1);
  });

  test('should use default retention days when not specified', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(0);

    await runRetentionCycle(auditRepo, log);

    // Default is 90 days (RETENTION_PERIODS.AUDIT_DAYS)
    const cutoffArg = vi.mocked(auditRepo.deleteOlderThan).mock.calls[0]![0];
    const cutoffDate = new Date(cutoffArg);
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 90);

    expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
  });

  test('should use custom retention days when specified', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(0);

    await runRetentionCycle(auditRepo, log, { retentionDays: 30 });

    const cutoffArg = vi.mocked(auditRepo.deleteOlderThan).mock.calls[0]![0];
    const cutoffDate = new Date(cutoffArg);
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 30);

    expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
  });

  test('should warn when archive enabled but no storage provider', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(0);

    const result = await runRetentionCycle(
      auditRepo,
      log,
      { archiveEnabled: true },
      // No storage provider
    );

    expect(result.archive).toBeNull();
    expect(log.warn).toHaveBeenCalledWith(
      'Audit archive enabled but no storage provider configured — skipping archive',
    );
  });

  test('should continue with purge if archive fails', async () => {
    vi.mocked(auditRepo.find).mockRejectedValueOnce(new Error('Storage failure'));
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(3);

    const result = await runRetentionCycle(auditRepo, log, { archiveEnabled: true }, storage);

    // Archive failed but purge should still work
    expect(result.archive).toBeNull();
    expect(result.purge.purgedCount).toBe(3);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Storage failure' }),
      'Audit archive failed — proceeding with purge',
    );
  });

  test('should log completion summary', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockResolvedValueOnce(0);

    await runRetentionCycle(auditRepo, log, { retentionDays: 90 });

    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionDays: 90,
        archiveEnabled: false,
        archived: 0,
        purged: 0,
      }),
      'Audit retention cycle completed',
    );
  });
});
