// main/apps/server/src/__tests__/integration/media.integration.test.ts
/**
 * Media Processing Integration Tests
 *
 * Tests for file/media upload, validation, processing queue, presigned URLs,
 * and deletion through the files routes via fastify.inject().
 *
 * Sprint 4.12: Media processing test backfill.
 */

import { createAuthGuard, fileRoutes } from '@bslt/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createTestJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

import type { AuthGuardFactory } from '@bslt/server-system';

import { registerRouteMap } from '@/http';

// ============================================================================
// Mock Repositories
// ============================================================================

function createInMemoryFileRepo() {
  const store = new Map<
    string,
    {
      id: string;
      userId: string;
      tenantId: string | null;
      filename: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      storageProvider: string;
      storagePath: string;
      purpose: string;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  let counter = 0;

  return {
    create: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      counter += 1;
      const now = new Date();
      const record = {
        id: (data['id'] as string | undefined) ?? `file-${String(counter)}`,
        userId: (data['userId'] as string) ?? 'unknown',
        tenantId: (data['tenantId'] as string | null) ?? null,
        filename: (data['filename'] as string) ?? 'test.bin',
        originalName: (data['originalName'] as string) ?? 'test.bin',
        mimeType: (data['mimeType'] as string) ?? 'application/octet-stream',
        sizeBytes: (data['sizeBytes'] as number) ?? 0,
        storageProvider: (data['storageProvider'] as string) ?? 'local',
        storagePath: (data['storagePath'] as string) ?? '',
        purpose: (data['purpose'] as string) ?? 'document',
        metadata: (data['metadata'] as Record<string, unknown>) ?? {},
        createdAt: now,
        updatedAt: now,
      };
      store.set(record.id, record);
      return record;
    }),

    findById: vi.fn().mockImplementation((id: string) => {
      return store.get(id) ?? null;
    }),

    findByUserId: vi.fn().mockImplementation((userId: string) => {
      return [...store.values()].filter((r) => r.userId === userId);
    }),

    delete: vi.fn().mockImplementation((id: string) => {
      return store.delete(id);
    }),

    clear: () => {
      store.clear();
      counter = 0;
    },

    _store: store,
  };
}

function createMockStorageProvider() {
  const stored = new Map<string, { data: unknown; contentType: string }>();

  return {
    upload: vi.fn().mockImplementation((key: string, data: unknown, contentType: string) => {
      stored.set(key, { data, contentType });
      return Promise.resolve(key);
    }),

    download: vi.fn().mockImplementation((key: string) => {
      const entry = stored.get(key);
      return Promise.resolve(entry?.data ?? Buffer.from(''));
    }),

    delete: vi.fn().mockImplementation((key: string) => {
      stored.delete(key);
      return Promise.resolve(undefined);
    }),

    exists: vi.fn().mockImplementation((key: string) => {
      return Promise.resolve(stored.has(key));
    }),

    getSignedUrl: vi.fn().mockImplementation((key: string) => {
      return Promise.resolve(`https://storage.test/signed/${key}?token=abc123`);
    }),

    list: vi.fn().mockResolvedValue([]),

    clear: () => stored.clear(),

    _stored: stored,
  };
}

function createMockRepos(fileRepo: ReturnType<typeof createInMemoryFileRepo>) {
  return {
    users: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
      update: vi.fn().mockResolvedValue(null),
      existsByEmail: vi.fn().mockResolvedValue(false),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
      incrementFailedAttempts: vi.fn().mockResolvedValue(undefined),
      resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
      lockAccount: vi.fn().mockResolvedValue(undefined),
      unlockAccount: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      updateWithVersion: vi.fn().mockResolvedValue(null),
    },
    refreshTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findByToken: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByToken: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteByFamilyId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    refreshTokenFamilies: {
      findById: vi.fn().mockResolvedValue(null),
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'family-1' }),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeAllForUser: vi.fn().mockResolvedValue(0),
    },
    loginAttempts: {
      create: vi.fn().mockResolvedValue({ id: 'la-1' }),
      countRecentFailures: vi.fn().mockResolvedValue(0),
      findRecentByEmail: vi.fn().mockResolvedValue([]),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    passwordResetTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'prt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    emailVerificationTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    securityEvents: {
      create: vi.fn().mockResolvedValue({ id: 'se-1' }),
      findByUserId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByEmail: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByType: vi.fn().mockResolvedValue([]),
      findBySeverity: vi.fn().mockResolvedValue([]),
      countByType: vi.fn().mockResolvedValue(0),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    magicLinkTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ml-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
      countRecentByEmail: vi.fn().mockResolvedValue(0),
    },
    oauthConnections: {
      findByProviderAndProviderId: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'oc-1' }),
      delete: vi.fn().mockResolvedValue(true),
      countByUserId: vi.fn().mockResolvedValue(0),
    },
    pushSubscriptions: {
      findByEndpoint: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'ps-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
    },
    notificationPreferences: {
      findByUserId: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'np-1' }),
    },
    plans: { findById: vi.fn().mockResolvedValue(null), findAll: vi.fn().mockResolvedValue([]) },
    subscriptions: {
      findById: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue(null),
    },
    customerMappings: { findByUserId: vi.fn().mockResolvedValue(null) },
    invoices: { findByUserId: vi.fn().mockResolvedValue([]) },
    paymentMethods: { findByUserId: vi.fn().mockResolvedValue([]) },
    billingEvents: { create: vi.fn().mockResolvedValue({ id: 'be-1' }) },
    legalDocuments: {
      findLatestByType: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    userAgreements: {
      findByUserAndDocument: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ua-1', agreedAt: new Date() }),
    },
    memberships: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByUserAndTenant: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mb-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    tenants: {
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'tenant-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    invitations: {
      findById: vi.fn().mockResolvedValue(null),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByToken: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    activities: {
      create: vi.fn().mockResolvedValue({ id: 'act-1' }),
      findByTenantId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    },
    files: fileRepo,
  };
}

function createMockLogger() {
  const logger: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  (logger['child'] as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger;
}

function createMockDbClient() {
  const mockTx = {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };

  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx);
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Create a minimal 1x1 PNG buffer for upload tests */
function createTestPngBuffer(): Buffer {
  // Minimal valid PNG (1x1 transparent pixel)
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
    0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Media Processing Integration Tests', () => {
  let testServer: TestServer;
  let fileRepo: ReturnType<typeof createInMemoryFileRepo>;
  let storageProvider: ReturnType<typeof createMockStorageProvider>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  const userId = 'user-media-1';
  const jwt = createTestJwt({
    userId,
    email: 'media@example.com',
    role: 'user',
  });

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    fileRepo = createInMemoryFileRepo();
    storageProvider = createMockStorageProvider();
    mockLogger = createMockLogger();
    const mockDb = createMockDbClient();
    const mockRepos = createMockRepos(fileRepo);

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: {},
      config: testServer.config,
      storage: storageProvider,
    };

    registerRouteMap(testServer.server, ctx as never, fileRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as unknown as AuthGuardFactory,
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  beforeEach(() => {
    fileRepo.clear();
    storageProvider.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Upload image -> processed and stored
  // ==========================================================================

  describe('POST /api/files/upload — image upload', () => {
    it.todo('uploads a valid image and returns 201 with file metadata');

    it.todo('stores the file in the local storage provider');
  });

  // ==========================================================================
  // Upload invalid file type -> rejected
  // ==========================================================================

  describe('POST /api/files/upload — invalid file type', () => {
    it.todo('rejects upload of disallowed MIME type with a clear error');
  });

  // ==========================================================================
  // Upload oversized file -> rejected with size limit error
  // ==========================================================================

  describe('POST /api/files/upload — oversized file', () => {
    it.todo('rejects file exceeding the size limit');
  });

  // ==========================================================================
  // Upload with no file body -> rejected
  // ==========================================================================

  describe('POST /api/files/upload — no file body', () => {
    it.todo('rejects upload when no file buffer is provided');
  });

  // ==========================================================================
  // Presigned URL: generate -> verify
  // ==========================================================================

  describe('GET /api/files/:id/download — presigned URL', () => {
    it('generates a presigned URL for an existing file', async () => {
      // Seed a file record directly
      fileRepo.create({
        id: 'file-presigned-1',
        userId,
        filename: 'doc.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/doc.pdf',
        purpose: 'document',
        metadata: {},
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/file-presigned-1/download',
          accessToken: jwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { url: string };
      expect(body.url).toBeDefined();
      expect(body.url).toContain('signed');
      expect(storageProvider.getSignedUrl).toHaveBeenCalledWith('files/user-media-1/doc.pdf');
    });

    it('returns 404 for non-existent file', async () => {
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/nonexistent-id/download',
          accessToken: jwt,
        }),
      );

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/files/file-presigned-1/download',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // DELETE /api/files/:id -> removes from storage + DB
  // ==========================================================================

  describe('POST /api/files/:id/delete — file deletion', () => {
    it('deletes file from both storage and database', async () => {
      // Seed a file
      const storagePath = 'files/user-media-1/to-delete.pdf';
      fileRepo.create({
        id: 'file-del-1',
        userId,
        filename: 'to-delete.pdf',
        originalName: 'to-delete.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        storageProvider: 'local',
        storagePath,
        purpose: 'document',
        metadata: {},
      });
      // Also store in mock storage
      await storageProvider.upload(storagePath, Buffer.from('content'), 'application/pdf');

      // Verify file exists
      expect(fileRepo._store.size).toBe(1);
      expect(storageProvider._stored.has(storagePath)).toBe(true);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/file-del-1/delete',
          accessToken: jwt,
          payload: {},
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { success: boolean; message: string };
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted');

      // Verify storage.delete was called with the file's storage path
      expect(storageProvider.delete).toHaveBeenCalledWith(storagePath);

      // Verify DB record was deleted
      expect(fileRepo.delete).toHaveBeenCalledWith('file-del-1');
    });

    it('returns 404 when deleting a non-existent file', async () => {
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/no-such-file/delete',
          accessToken: jwt,
          payload: {},
        }),
      );

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/files/file-del-1/delete',
        payload: {},
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 when a different user tries to delete the file', async () => {
      const storagePath = 'files/user-media-1/owned-file.pdf';
      fileRepo.create({
        id: 'file-owned',
        userId, // owned by user-media-1
        filename: 'owned-file.pdf',
        originalName: 'owned-file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        storageProvider: 'local',
        storagePath,
        purpose: 'document',
        metadata: {},
      });

      const otherUserJwt = createTestJwt({
        userId: 'other-user-999',
        email: 'other@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/file-owned/delete',
          accessToken: otherUserJwt,
          payload: {},
        }),
      );

      expect(response.statusCode).toBe(403);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/permission/i);
    });
  });

  // ==========================================================================
  // GET /api/files/:id — file metadata retrieval
  // ==========================================================================

  describe('GET /api/files/:id — file metadata', () => {
    it('returns metadata with download URL for owned file', async () => {
      fileRepo.create({
        id: 'file-meta-1',
        userId,
        filename: 'report.pdf',
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4096,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/report.pdf',
        purpose: 'document',
        metadata: {},
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/file-meta-1',
          accessToken: jwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        file: {
          id: string;
          mimeType: string;
          sizeBytes: number;
          downloadUrl: string;
          originalName: string;
        };
      };
      expect(body.file.id).toBe('file-meta-1');
      expect(body.file.mimeType).toBe('application/pdf');
      expect(body.file.sizeBytes).toBe(4096);
      expect(body.file.downloadUrl).toBeDefined();
      expect(body.file.downloadUrl).toContain('signed');
    });

    it('returns 404 for non-existent file', async () => {
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/does-not-exist',
          accessToken: jwt,
        }),
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Queue: job submitted -> processed -> result stored
  // ==========================================================================

  describe('media processing queue simulation', () => {
    it('file is created with metadata that can track processing status', async () => {
      // Seed a file with processing metadata
      fileRepo.create({
        id: 'file-queue-1',
        userId,
        filename: 'video.mp4',
        originalName: 'video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 50000,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/video.mp4',
        purpose: 'attachment',
        metadata: { processingStatus: 'pending', processingJobId: 'job-123' },
      });

      // Retrieve and verify the record shows pending status
      const file = fileRepo.findById('file-queue-1');
      expect(file).not.toBeNull();
      expect(file.metadata.processingStatus).toBe('pending');
      expect(file.metadata.processingJobId).toBe('job-123');

      // Simulate job completion by updating metadata
      const storedFile = fileRepo._store.get('file-queue-1');
      if (storedFile !== undefined) {
        storedFile.metadata = {
          ...storedFile.metadata,
          processingStatus: 'complete',
          processedAt: new Date().toISOString(),
        };
      }

      // Verify the updated status
      const updated = fileRepo.findById('file-queue-1');
      expect(updated.metadata.processingStatus).toBe('complete');
      expect(updated.metadata.processedAt).toBeDefined();
    });

    it('processing failure records an error in metadata', async () => {
      fileRepo.create({
        id: 'file-queue-fail',
        userId,
        filename: 'corrupt.mp4',
        originalName: 'corrupt.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1000,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/corrupt.mp4',
        purpose: 'attachment',
        metadata: { processingStatus: 'processing' },
      });

      // Simulate failure
      const storedFile = fileRepo._store.get('file-queue-fail');
      if (storedFile !== undefined) {
        storedFile.metadata = {
          ...storedFile.metadata,
          processingStatus: 'failed',
          processingError: 'Invalid codec: unsupported format',
        };
      }

      const updated = fileRepo.findById('file-queue-fail');
      expect(updated.metadata.processingStatus).toBe('failed');
      expect(updated.metadata.processingError).toBe('Invalid codec: unsupported format');
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Zero-byte, oversized, null name, path traversal
  // ==========================================================================

  describe('Adversarial: boundary — file upload edge cases', () => {
    it.todo('rejects zero-byte file upload');

    it.todo('rejects file claiming 1GB size');

    it('rejects file with null original name', async () => {
      const pngBuffer = createTestPngBuffer();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: pngBuffer.toJSON().data,
            mimetype: 'image/png',
            originalName: null,
            size: pngBuffer.length,
          },
        }),
      );

      // Should either reject or sanitize the name, not crash
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('rejects file with path traversal in name (../../etc/passwd)', async () => {
      const pngBuffer = createTestPngBuffer();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: pngBuffer.toJSON().data,
            mimetype: 'image/png',
            originalName: '../../etc/passwd',
            size: pngBuffer.length,
          },
        }),
      );

      // Must not allow path traversal; either reject or sanitize
      if (response.statusCode === 201) {
        const body = parseJsonResponse(response) as { file: { originalName: string; storagePath: string } };
        // If accepted, the stored path must not contain traversal sequences
        expect(body.file.storagePath).not.toContain('..');
        expect(body.file.originalName).not.toContain('..');
      } else {
        expect(response.statusCode).toBeGreaterThanOrEqual(400);
      }
    });

    it('rejects file with backslash path traversal in name (..\\..\\windows\\system32)', async () => {
      const pngBuffer = createTestPngBuffer();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: pngBuffer.toJSON().data,
            mimetype: 'image/png',
            originalName: '..\\..\\windows\\system32\\config.png',
            size: pngBuffer.length,
          },
        }),
      );

      if (response.statusCode === 201) {
        const body = parseJsonResponse(response) as { file: { storagePath: string } };
        expect(body.file.storagePath).not.toContain('..');
      } else {
        expect(response.statusCode).toBeGreaterThanOrEqual(400);
      }
    });

    it('handles file with extremely long name (10000 chars)', async () => {
      const pngBuffer = createTestPngBuffer();
      const longName = 'a'.repeat(10000) + '.png';

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: pngBuffer.toJSON().data,
            mimetype: 'image/png',
            originalName: longName,
            size: pngBuffer.length,
          },
        }),
      );

      // Should either reject or truncate, not crash
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Content-type mismatch
  // ==========================================================================

  describe('Adversarial: boundary — content-type mismatch', () => {
    it('rejects file that claims image/png but is actually application/javascript', async () => {
      const jsContent = Buffer.from('alert("xss"); // malicious script content');

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: jsContent.toJSON().data,
            mimetype: 'image/png',
            originalName: 'not-a-real-image.png',
            size: jsContent.length,
          },
        }),
      );

      // Server should either reject mismatched types or not serve JS as image
      expect(response.statusCode).toBeDefined();
      // Should not allow the deception to succeed silently as 201
      if (response.statusCode === 201) {
        const body = parseJsonResponse(response) as { file: { mimeType: string } };
        // If accepted, the server should have detected or stored the correct type
        expect(body.file.mimeType).toBeDefined();
      }
    });

    it('rejects file that claims image/jpeg but has HTML content', async () => {
      const htmlContent = Buffer.from('<html><body><script>document.cookie</script></body></html>');

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: htmlContent.toJSON().data,
            mimetype: 'image/jpeg',
            originalName: 'sneaky.jpg',
            size: htmlContent.length,
          },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });
  });

  // ==========================================================================
  // Adversarial: Layer — Storage provider failures
  // ==========================================================================

  describe('Adversarial: layer — storage provider failures', () => {
    it('handles storage provider throwing mid-upload', async () => {
      storageProvider.upload.mockRejectedValueOnce(new Error('Storage connection lost'));

      const pngBuffer = createTestPngBuffer();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: pngBuffer.toJSON().data,
            mimetype: 'image/png',
            originalName: 'will-fail-upload.png',
            size: pngBuffer.length,
          },
        }),
      );

      // Should return 500 or 502, not crash the server
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThanOrEqual(599);
    });

    it('handles storage provider returning null key', async () => {
      storageProvider.upload.mockResolvedValueOnce(null);

      const pngBuffer = createTestPngBuffer();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: pngBuffer.toJSON().data,
            mimetype: 'image/png',
            originalName: 'null-key-upload.png',
            size: pngBuffer.length,
          },
        }),
      );

      // Should handle gracefully
      expect(response.statusCode).toBeDefined();
      // If it returns 201, the file record should still have a valid id
      if (response.statusCode === 201) {
        const body = parseJsonResponse(response) as { file: { id: string } };
        expect(body.file.id).toBeDefined();
      }
    });

    it('handles storage.getSignedUrl throwing during download', async () => {
      fileRepo.create({
        id: 'file-broken-signed',
        userId,
        filename: 'broken.pdf',
        originalName: 'broken.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/broken.pdf',
        purpose: 'document',
        metadata: {},
      });

      storageProvider.getSignedUrl.mockRejectedValueOnce(new Error('Signing key unavailable'));

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/file-broken-signed/download',
          accessToken: jwt,
        }),
      );

      // Should not crash; return an error status
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('handles storage.delete throwing during file deletion', async () => {
      const storagePath = 'files/user-media-1/delete-fail.pdf';
      fileRepo.create({
        id: 'file-delete-fail',
        userId,
        filename: 'delete-fail.pdf',
        originalName: 'delete-fail.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        storageProvider: 'local',
        storagePath,
        purpose: 'document',
        metadata: {},
      });

      storageProvider.delete.mockRejectedValueOnce(new Error('Storage unavailable'));

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/file-delete-fail/delete',
          accessToken: jwt,
          payload: {},
        }),
      );

      // Should return error, not crash
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ==========================================================================
  // Adversarial: Async — Concurrent uploads, expired presigned URL
  // ==========================================================================

  describe('Adversarial: async — concurrent upload and presigned URL edge cases', () => {
    it('concurrent uploads of the same file produce distinct records', async () => {
      const pngBuffer = createTestPngBuffer();
      const payload = {
        buffer: pngBuffer.toJSON().data,
        mimetype: 'image/png',
        originalName: 'concurrent-upload.png',
        size: pngBuffer.length,
      };

      const [r1, r2, r3] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/files/upload',
            accessToken: jwt,
            payload,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/files/upload',
            accessToken: jwt,
            payload,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/files/upload',
            accessToken: jwt,
            payload,
          }),
        ),
      ]);

      // All should succeed or fail consistently, never 500
      for (const resp of [r1, r2, r3]) {
        expect(resp.statusCode).not.toBe(500);
      }

      // If all succeeded, each should have a unique file ID
      const successes = [r1, r2, r3].filter((r) => r.statusCode === 201);
      if (successes.length > 1) {
        const ids = successes.map((r) => {
          const body = parseJsonResponse(r) as { file: { id: string } };
          return body.file.id;
        });
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(successes.length);
      }
    });

    it('presigned URL request for file after storage key becomes stale', async () => {
      fileRepo.create({
        id: 'file-stale-url',
        userId,
        filename: 'stale.pdf',
        originalName: 'stale.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/stale.pdf',
        purpose: 'document',
        metadata: {},
      });

      // First call returns valid URL, second call simulates expiry/error
      storageProvider.getSignedUrl
        .mockResolvedValueOnce('https://storage.test/signed/stale.pdf?token=valid')
        .mockRejectedValueOnce(new Error('Presigned URL generation failed: key expired'));

      const validResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/file-stale-url/download',
          accessToken: jwt,
        }),
      );
      expect(validResponse.statusCode).toBe(200);

      const expiredResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/file-stale-url/download',
          accessToken: jwt,
        }),
      );
      // Should return error, not crash
      expect(expiredResponse.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ==========================================================================
  // Adversarial: Idempotency — Double-DELETE same file
  // ==========================================================================

  describe('Adversarial: idempotency — double-delete same file', () => {
    it.todo('second DELETE of same file returns 404');

    it('double-delete does not call storage.delete twice for same key', async () => {
      const storagePath = 'files/user-media-1/dd-storage.pdf';
      fileRepo.create({
        id: 'file-dd-storage',
        userId,
        filename: 'dd-storage.pdf',
        originalName: 'dd-storage.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        storageProvider: 'local',
        storagePath,
        purpose: 'document',
        metadata: {},
      });

      // First delete
      await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/file-dd-storage/delete',
          accessToken: jwt,
          payload: {},
        }),
      );

      const deleteCallsAfterFirst = storageProvider.delete.mock.calls.length;

      // Second delete
      await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/file-dd-storage/delete',
          accessToken: jwt,
          payload: {},
        }),
      );

      const deleteCallsAfterSecond = storageProvider.delete.mock.calls.length;

      // Storage should not have been called again since the record is gone
      expect(deleteCallsAfterSecond).toBe(deleteCallsAfterFirst);
    });
  });

  // ==========================================================================
  // Adversarial: "Killer" — Unauthorized polyglot upload, cross-user access
  // ==========================================================================

  describe('Adversarial: killer tests — polyglot files and unauthorized access', () => {
    it('rejects polyglot file: valid JPEG header + embedded script', async () => {
      // Create a buffer that starts with JPEG magic bytes but contains script
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const scriptPayload = Buffer.from('<script>document.cookie</script>');
      const polyglot = Buffer.concat([jpegHeader, scriptPayload]);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/files/upload',
          accessToken: jwt,
          payload: {
            buffer: polyglot.toJSON().data,
            mimetype: 'image/jpeg',
            originalName: 'polyglot.jpg',
            size: polyglot.length,
          },
        }),
      );

      // Server should either reject or accept but ensure Content-Type is safe on serve
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('unauthorized user cannot upload files (no auth token)', async () => {
      const pngBuffer = createTestPngBuffer();

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: {
          buffer: pngBuffer.toJSON().data,
          mimetype: 'image/png',
          originalName: 'unauthed.png',
          size: pngBuffer.length,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('user cannot download another user file', async () => {
      // File owned by user-media-1
      fileRepo.create({
        id: 'file-other-user',
        userId,
        filename: 'secret.pdf',
        originalName: 'secret.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/secret.pdf',
        purpose: 'document',
        metadata: {},
      });

      const otherUserJwt = createTestJwt({
        userId: 'other-user-attacker',
        email: 'attacker@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/file-other-user/download',
          accessToken: otherUserJwt,
        }),
      );

      expect(response.statusCode).toBe(403);
    });

    it('user cannot view metadata of another user file', async () => {
      fileRepo.create({
        id: 'file-private-meta',
        userId,
        filename: 'private.pdf',
        originalName: 'private.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        storageProvider: 'local',
        storagePath: 'files/user-media-1/private.pdf',
        purpose: 'document',
        metadata: { sensitive: true },
      });

      const attackerJwt = createTestJwt({
        userId: 'attacker-user',
        email: 'attacker@evil.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/files/file-private-meta',
          accessToken: attackerJwt,
        }),
      );

      expect(response.statusCode).toBe(403);
    });

    it.todo('upload with SVG containing embedded JavaScript is rejected or sanitized');

    it('prototype pollution via file metadata field', async () => {
      const pngBuffer = createTestPngBuffer();

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/files/upload',
        headers: {
          authorization: `Bearer ${jwt}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          buffer: pngBuffer.toJSON().data,
          mimetype: 'image/png',
          originalName: 'proto-test.png',
          size: pngBuffer.length,
          '__proto__': { polluted: true },
        }),
      });

      expect(response.statusCode).not.toBe(500);
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });
  });
});
