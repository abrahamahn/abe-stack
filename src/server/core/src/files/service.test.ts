// src/server/core/src/files/service.test.ts
/**
 * Files Service Unit Tests
 *
 * Tests for file upload, metadata retrieval, deletion, and download URL generation.
 *
 * @complexity O(1) per test - all operations are single-entity operations
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteFile, getDownloadUrl, getFileMetadata, uploadFile } from './service';

import type { FileStorageProvider } from './types';
import type { FileRecord, FileRepository } from '@abe-stack/db';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockFileRecord(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    id: 'file-123',
    tenantId: null,
    userId: 'user-123',
    filename: '1700000000000.png',
    originalName: 'photo.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    storageProvider: 'local',
    storagePath: 'files/user-123/1700000000000.png',
    url: null,
    purpose: 'document',
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockStorage(): FileStorageProvider {
  return {
    upload: vi.fn().mockResolvedValue('files/user-123/1700000000000.png'),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue('https://storage.example.com/signed-url'),
  };
}

function createMockFileRepo(record: FileRecord | null = null): FileRepository {
  return {
    findById: vi.fn().mockResolvedValue(record),
    findByUserId: vi.fn().mockResolvedValue(record !== null ? [record] : []),
    findByTenantId: vi.fn().mockResolvedValue(record !== null ? [record] : []),
    create: vi.fn().mockImplementation((data) => ({
      ...createMockFileRecord(),
      ...data,
      id: 'file-new',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: vi.fn().mockResolvedValue(record),
    delete: vi.fn().mockResolvedValue(true),
    deleteByUserId: vi.fn().mockResolvedValue(0),
  };
}

// ============================================================================
// Test Setup
// ============================================================================

let storage: FileStorageProvider;
let fileRepo: FileRepository;

beforeEach(() => {
  storage = createMockStorage();
  fileRepo = createMockFileRepo(createMockFileRecord());
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// uploadFile
// ============================================================================

describe('uploadFile', () => {
  it('should upload a file and create a DB record', async () => {
    const result = await uploadFile(storage, { files: fileRepo }, 'user-123', {
      buffer: Buffer.from('file-content'),
      mimetype: 'image/png',
      originalName: 'photo.png',
      size: 1024,
    });

    expect(storage.upload).toHaveBeenCalledOnce();
    expect(fileRepo.create).toHaveBeenCalledOnce();
    expect(result.originalName).toBe('photo.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.downloadUrl).toBe('https://storage.example.com/signed-url');
  });

  it('should reject files with invalid MIME type', async () => {
    await expect(
      uploadFile(storage, { files: fileRepo }, 'user-123', {
        buffer: Buffer.from('content'),
        mimetype: 'application/x-executable',
        originalName: 'malware.exe',
        size: 100,
      }),
    ).rejects.toThrow('Invalid file type');
  });

  it('should reject files exceeding max size', async () => {
    await expect(
      uploadFile(storage, { files: fileRepo }, 'user-123', {
        buffer: Buffer.from('x'),
        mimetype: 'image/png',
        originalName: 'huge.png',
        size: 20 * 1024 * 1024, // 20MB
      }),
    ).rejects.toThrow('File too large');
  });

  it('should respect custom upload options', async () => {
    await expect(
      uploadFile(
        storage,
        { files: fileRepo },
        'user-123',
        {
          buffer: Buffer.from('content'),
          mimetype: 'image/png',
          originalName: 'photo.png',
          size: 1024,
        },
        {
          allowedMimeTypes: ['application/pdf'],
          maxSizeBytes: 500,
        },
      ),
    ).rejects.toThrow('Invalid file type');
  });

  it('should reject files exceeding custom max size', async () => {
    await expect(
      uploadFile(
        storage,
        { files: fileRepo },
        'user-123',
        {
          buffer: Buffer.from('content'),
          mimetype: 'application/pdf',
          originalName: 'doc.pdf',
          size: 600,
        },
        {
          allowedMimeTypes: ['application/pdf'],
          maxSizeBytes: 500,
        },
      ),
    ).rejects.toThrow('File too large');
  });

  it('should pass tenant ID to the file record', async () => {
    await uploadFile(
      storage,
      { files: fileRepo },
      'user-123',
      {
        buffer: Buffer.from('content'),
        mimetype: 'image/png',
        originalName: 'photo.png',
        size: 100,
      },
      {},
      'tenant-456',
    );

    expect(fileRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-456' }),
    );
  });
});

// ============================================================================
// getFileMetadata
// ============================================================================

describe('getFileMetadata', () => {
  it('should return file metadata for the owner', async () => {
    const result = await getFileMetadata(storage, { files: fileRepo }, 'file-123', 'user-123');

    expect(result.id).toBe('file-123');
    expect(result.downloadUrl).toBe('https://storage.example.com/signed-url');
  });

  it('should return file metadata for admin users', async () => {
    const result = await getFileMetadata(
      storage,
      { files: fileRepo },
      'file-123',
      'other-user',
      'admin',
    );

    expect(result.id).toBe('file-123');
  });

  it('should throw NotFoundError for missing files', async () => {
    const emptyRepo = createMockFileRepo(null);

    await expect(
      getFileMetadata(storage, { files: emptyRepo }, 'nonexistent', 'user-123'),
    ).rejects.toThrow('File not found');
  });

  it('should throw ForbiddenError when non-owner non-admin accesses file', async () => {
    await expect(
      getFileMetadata(storage, { files: fileRepo }, 'file-123', 'other-user', 'user'),
    ).rejects.toThrow('You do not have permission to access this file');
  });
});

// ============================================================================
// deleteFile
// ============================================================================

describe('deleteFile', () => {
  it('should delete file from storage and database', async () => {
    await deleteFile(storage, { files: fileRepo }, 'file-123', 'user-123');

    expect(storage.delete).toHaveBeenCalledWith('files/user-123/1700000000000.png');
    expect(fileRepo.delete).toHaveBeenCalledWith('file-123');
  });

  it('should allow admin to delete any file', async () => {
    await deleteFile(storage, { files: fileRepo }, 'file-123', 'other-user', 'admin');

    expect(storage.delete).toHaveBeenCalledOnce();
    expect(fileRepo.delete).toHaveBeenCalledOnce();
  });

  it('should throw NotFoundError for missing files', async () => {
    const emptyRepo = createMockFileRepo(null);

    await expect(
      deleteFile(storage, { files: emptyRepo }, 'nonexistent', 'user-123'),
    ).rejects.toThrow('File not found');
  });

  it('should throw ForbiddenError when non-owner non-admin tries to delete', async () => {
    await expect(
      deleteFile(storage, { files: fileRepo }, 'file-123', 'other-user', 'user'),
    ).rejects.toThrow('You do not have permission to delete this file');
  });
});

// ============================================================================
// getDownloadUrl
// ============================================================================

describe('getDownloadUrl', () => {
  it('should return a signed download URL for the owner', async () => {
    const url = await getDownloadUrl(storage, { files: fileRepo }, 'file-123', 'user-123');

    expect(url).toBe('https://storage.example.com/signed-url');
    expect(storage.getSignedUrl).toHaveBeenCalledWith('files/user-123/1700000000000.png');
  });

  it('should allow admin to get download URL', async () => {
    const url = await getDownloadUrl(
      storage,
      { files: fileRepo },
      'file-123',
      'other-user',
      'admin',
    );

    expect(url).toBe('https://storage.example.com/signed-url');
  });

  it('should throw NotFoundError for missing files', async () => {
    const emptyRepo = createMockFileRepo(null);

    await expect(
      getDownloadUrl(storage, { files: emptyRepo }, 'nonexistent', 'user-123'),
    ).rejects.toThrow('File not found');
  });

  it('should throw ForbiddenError for non-owner non-admin', async () => {
    await expect(
      getDownloadUrl(storage, { files: fileRepo }, 'file-123', 'other-user', 'user'),
    ).rejects.toThrow('You do not have permission to access this file');
  });
});
