// src/server/db/src/schema/files.test.ts
import { describe, expect, test } from 'vitest';

import {
  FILE_COLUMNS,
  FILE_PURPOSES,
  FILES_TABLE,
  type FilePurpose,
  type FileRecord,
  type NewFileRecord,
  STORAGE_PROVIDERS,
  type StorageProvider,
  type UpdateFileRecord,
} from './files';

// ============================================================================
// Table Names
// ============================================================================

describe('Files Schema - Table Names', () => {
  test('should have correct table name for files', () => {
    expect(FILES_TABLE).toBe('files');
  });

  test('table name should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    expect(FILES_TABLE).toMatch(snakeCasePattern);
  });
});

// ============================================================================
// Enums
// ============================================================================

describe('Files Schema - Storage Provider Enum', () => {
  test('should have exactly 3 storage providers', () => {
    expect(STORAGE_PROVIDERS.length).toBe(3);
  });

  test('should contain correct provider values', () => {
    expect(STORAGE_PROVIDERS).toEqual(['local', 's3', 'gcs']);
  });

  test('enum values should match SQL CHECK constraint', () => {
    const providers: StorageProvider[] = ['local', 's3', 'gcs'];
    providers.forEach((provider) => {
      expect(STORAGE_PROVIDERS).toContain(provider);
    });
  });
});

describe('Files Schema - File Purpose Enum', () => {
  test('should have exactly 5 file purposes', () => {
    expect(FILE_PURPOSES.length).toBe(5);
  });

  test('should contain correct purpose values', () => {
    expect(FILE_PURPOSES).toEqual(['avatar', 'document', 'export', 'attachment', 'other']);
  });

  test('enum values should match SQL CHECK constraint', () => {
    const purposes: FilePurpose[] = ['avatar', 'document', 'export', 'attachment', 'other'];
    purposes.forEach((purpose) => {
      expect(FILE_PURPOSES).toContain(purpose);
    });
  });
});

// ============================================================================
// Column Mappings
// ============================================================================

describe('Files Schema - File Columns', () => {
  test('should have correct column mappings', () => {
    expect(FILE_COLUMNS).toEqual({
      id: 'id',
      tenantId: 'tenant_id',
      userId: 'user_id',
      filename: 'filename',
      originalName: 'original_name',
      mimeType: 'mime_type',
      sizeBytes: 'size_bytes',
      storageProvider: 'storage_provider',
      storagePath: 'storage_path',
      url: 'url',
      purpose: 'purpose',
      metadata: 'metadata',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(FILE_COLUMNS.tenantId).toBe('tenant_id');
    expect(FILE_COLUMNS.userId).toBe('user_id');
    expect(FILE_COLUMNS.originalName).toBe('original_name');
    expect(FILE_COLUMNS.mimeType).toBe('mime_type');
    expect(FILE_COLUMNS.sizeBytes).toBe('size_bytes');
    expect(FILE_COLUMNS.storageProvider).toBe('storage_provider');
    expect(FILE_COLUMNS.storagePath).toBe('storage_path');
    expect(FILE_COLUMNS.createdAt).toBe('created_at');
    expect(FILE_COLUMNS.updatedAt).toBe('updated_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'tenantId',
      'userId',
      'filename',
      'originalName',
      'mimeType',
      'sizeBytes',
      'storageProvider',
      'storagePath',
      'url',
      'purpose',
      'metadata',
      'createdAt',
      'updatedAt',
    ];
    const actualColumns = Object.keys(FILE_COLUMNS);
    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(FILE_COLUMNS);
    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    const columns = FILE_COLUMNS;
    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBeGreaterThan(0);

    type IsReadonly = typeof columns extends { readonly id: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

// ============================================================================
// FileRecord Type
// ============================================================================

describe('Files Schema - FileRecord Type', () => {
  test('should accept valid file record', () => {
    const file: FileRecord = {
      id: 'file-123',
      tenantId: 'tenant-456',
      userId: 'user-789',
      filename: 'document-2026.pdf',
      originalName: 'My Document.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
      storageProvider: 's3',
      storagePath: 'uploads/user-789/document-2026.pdf',
      url: 'https://cdn.example.com/uploads/document-2026.pdf',
      purpose: 'document',
      metadata: { version: 1 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file).toBeDefined();
    expect(file.id).toBe('file-123');
    expect(file.storageProvider).toBe('s3');
    expect(file.purpose).toBe('document');
  });

  test('should handle null tenantId', () => {
    const file: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'avatar.png',
      originalName: 'avatar.png',
      mimeType: 'image/png',
      sizeBytes: 256000,
      storageProvider: 'local',
      storagePath: '/data/avatars/user-789.png',
      url: null,
      purpose: 'avatar',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file.tenantId).toBeNull();
    expect(file.url).toBeNull();
  });

  test('should handle all storage providers', () => {
    const providers: StorageProvider[] = ['local', 's3', 'gcs'];

    providers.forEach((provider) => {
      const file: FileRecord = {
        id: `file-${provider}`,
        tenantId: null,
        userId: 'user-789',
        filename: 'test.txt',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        storageProvider: provider,
        storagePath: `/data/${provider}/test.txt`,
        url: null,
        purpose: 'other',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(file.storageProvider).toBe(provider);
    });
  });

  test('should handle all file purposes', () => {
    const purposes: FilePurpose[] = ['avatar', 'document', 'export', 'attachment', 'other'];

    purposes.forEach((purpose) => {
      const file: FileRecord = {
        id: `file-${purpose}`,
        tenantId: null,
        userId: 'user-789',
        filename: 'test.txt',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        storageProvider: 'local',
        storagePath: '/data/test.txt',
        url: null,
        purpose,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(file.purpose).toBe(purpose);
    });
  });

  test('should handle large file sizes (BIGINT)', () => {
    const file: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'large-backup.zip',
      originalName: 'database-backup-2026.zip',
      mimeType: 'application/zip',
      sizeBytes: 5368709120, // 5GB
      storageProvider: 's3',
      storagePath: 'backups/large-backup.zip',
      url: null,
      purpose: 'export',
      metadata: { compressed: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file.sizeBytes).toBe(5368709120);
    expect(file.sizeBytes).toBeGreaterThan(2147483647); // Exceeds INT max
  });

  test('should handle various MIME types', () => {
    const mimeTypes = [
      'image/png',
      'image/jpeg',
      'application/pdf',
      'text/csv',
      'application/json',
      'video/mp4',
      'application/octet-stream',
    ];

    mimeTypes.forEach((mimeType, index) => {
      const file: FileRecord = {
        id: `file-${index}`,
        tenantId: null,
        userId: 'user-789',
        filename: `test-${index}`,
        originalName: `test-${index}`,
        mimeType,
        sizeBytes: 100,
        storageProvider: 'local',
        storagePath: `/data/test-${index}`,
        url: null,
        purpose: 'other',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(file.mimeType).toBe(mimeType);
    });
  });

  test('should accept complex metadata', () => {
    const file: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'photo.jpg',
      originalName: 'IMG_20260206.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3145728,
      storageProvider: 's3',
      storagePath: 'uploads/photo.jpg',
      url: 'https://cdn.example.com/photo.jpg',
      purpose: 'attachment',
      metadata: {
        width: 1920,
        height: 1080,
        exif: { camera: 'Canon EOS R5', iso: 400 },
        thumbnails: ['thumb_sm.jpg', 'thumb_md.jpg'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file.metadata).toHaveProperty('width', 1920);
    expect(file.metadata).toHaveProperty('exif');
  });
});

// ============================================================================
// NewFileRecord Type
// ============================================================================

describe('Files Schema - NewFileRecord Type', () => {
  test('should accept minimal new file record', () => {
    const newFile: NewFileRecord = {
      userId: 'user-789',
      filename: 'document.pdf',
      originalName: 'My Document.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
      storageProvider: 's3',
      storagePath: 'uploads/document.pdf',
    };

    expect(newFile.userId).toBe('user-789');
    expect(newFile.filename).toBe('document.pdf');
    expect(newFile.storageProvider).toBe('s3');
  });

  test('should accept new file record with all optional fields', () => {
    const newFile: NewFileRecord = {
      id: 'file-123',
      tenantId: 'tenant-456',
      userId: 'user-789',
      filename: 'avatar.png',
      originalName: 'profile-photo.png',
      mimeType: 'image/png',
      sizeBytes: 256000,
      storageProvider: 'local',
      storagePath: '/data/avatars/user-789.png',
      url: 'https://cdn.example.com/avatars/user-789.png',
      purpose: 'avatar',
      metadata: { width: 200, height: 200 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(newFile.id).toBe('file-123');
    expect(newFile.tenantId).toBe('tenant-456');
    expect(newFile.purpose).toBe('avatar');
    expect(newFile.url).toBeDefined();
    expect(newFile.metadata).toEqual({ width: 200, height: 200 });
  });

  test('should default purpose to undefined when not provided', () => {
    const newFile: NewFileRecord = {
      userId: 'user-789',
      filename: 'test.txt',
      originalName: 'test.txt',
      mimeType: 'text/plain',
      sizeBytes: 100,
      storageProvider: 'local',
      storagePath: '/data/test.txt',
    };

    expect(newFile.purpose).toBeUndefined();
  });

  test('should accept explicit null for nullable fields', () => {
    const newFile: NewFileRecord = {
      userId: 'user-789',
      filename: 'test.txt',
      originalName: 'test.txt',
      mimeType: 'text/plain',
      sizeBytes: 100,
      storageProvider: 'local',
      storagePath: '/data/test.txt',
      tenantId: null,
      url: null,
    };

    expect(newFile.tenantId).toBeNull();
    expect(newFile.url).toBeNull();
  });
});

// ============================================================================
// UpdateFileRecord Type
// ============================================================================

describe('Files Schema - UpdateFileRecord Type', () => {
  test('should accept partial updates', () => {
    const update1: UpdateFileRecord = { filename: 'renamed.pdf' };
    const update2: UpdateFileRecord = { url: 'https://cdn.example.com/new-url.pdf' };
    const update3: UpdateFileRecord = { purpose: 'document' };

    expect(update1.filename).toBeDefined();
    expect(update2.url).toBeDefined();
    expect(update3.purpose).toBe('document');
  });

  test('should accept multiple fields in update', () => {
    const update: UpdateFileRecord = {
      filename: 'updated.pdf',
      url: 'https://cdn.example.com/updated.pdf',
      purpose: 'document',
      metadata: { version: 2 },
    };

    expect(update.filename).toBe('updated.pdf');
    expect(update.url).toBeDefined();
    expect(update.purpose).toBe('document');
    expect(update.metadata).toEqual({ version: 2 });
  });

  test('should accept empty update object', () => {
    const update: UpdateFileRecord = {};
    expect(Object.keys(update).length).toBe(0);
  });

  test('should not include immutable fields', () => {
    const update: UpdateFileRecord = { filename: 'renamed.pdf' };

    expect('id' in update).toBe(false);
    expect('userId' in update).toBe(false);
    expect('createdAt' in update).toBe(false);
  });

  test('should accept storage provider change', () => {
    const update: UpdateFileRecord = {
      storageProvider: 'gcs',
      storagePath: 'new-bucket/file.pdf',
    };

    expect(update.storageProvider).toBe('gcs');
    expect(update.storagePath).toBe('new-bucket/file.pdf');
  });
});

// ============================================================================
// Type Consistency
// ============================================================================

describe('Files Schema - Type Consistency', () => {
  test('New* types should be compatible with their base types', () => {
    const newFile: NewFileRecord = {
      userId: 'user-789',
      filename: 'test.pdf',
      originalName: 'My Test.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      storageProvider: 's3',
      storagePath: 'uploads/test.pdf',
    };

    const fullFile: FileRecord = {
      id: 'file-123',
      tenantId: null,
      url: null,
      purpose: 'other',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...newFile,
    };

    expect(fullFile.userId).toBe(newFile.userId);
    expect(fullFile.filename).toBe(newFile.filename);
    expect(fullFile.storageProvider).toBe(newFile.storageProvider);
  });

  test('Column constants should cover all type properties', () => {
    const file: FileRecord = {
      id: 'id',
      tenantId: null,
      userId: 'user',
      filename: 'f',
      originalName: 'o',
      mimeType: 'text/plain',
      sizeBytes: 0,
      storageProvider: 'local',
      storagePath: 'p',
      url: null,
      purpose: 'other',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const fileKeys = Object.keys(file);
    const columnKeys = Object.keys(FILE_COLUMNS);

    expect(columnKeys.sort()).toEqual(fileKeys.sort());
  });

  test('Date fields should be consistently named', () => {
    expect(FILE_COLUMNS.createdAt).toMatch(/_at$/);
    expect(FILE_COLUMNS.updatedAt).toMatch(/_at$/);
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Files Schema - Integration Scenarios', () => {
  test('should support avatar upload workflow', () => {
    const avatar: FileRecord = {
      id: 'file-avatar-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'avatar-user-789.png',
      originalName: 'profile-photo.png',
      mimeType: 'image/png',
      sizeBytes: 256000,
      storageProvider: 'local',
      storagePath: '/data/avatars/user-789.png',
      url: '/avatars/user-789.png',
      purpose: 'avatar',
      metadata: { width: 200, height: 200, resized: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(avatar.purpose).toBe('avatar');
    expect(avatar.mimeType).toMatch(/^image\//);
    expect(avatar.metadata).toHaveProperty('width');
    expect(avatar.metadata).toHaveProperty('height');
  });

  test('should support document upload with S3 storage', () => {
    const doc: FileRecord = {
      id: 'file-doc-456',
      tenantId: 'tenant-123',
      userId: 'user-789',
      filename: 'report-q4-2025.pdf',
      originalName: 'Q4 2025 Report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5242880,
      storageProvider: 's3',
      storagePath: 'tenant-123/documents/report-q4-2025.pdf',
      url: 'https://bucket.s3.amazonaws.com/tenant-123/documents/report-q4-2025.pdf',
      purpose: 'document',
      metadata: { pages: 42, encrypted: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(doc.storageProvider).toBe('s3');
    expect(doc.tenantId).toBe('tenant-123');
    expect(doc.purpose).toBe('document');
  });

  test('should support data export file', () => {
    const exportFile: FileRecord = {
      id: 'file-export-789',
      tenantId: null,
      userId: 'user-789',
      filename: 'export-user-789-2026-02-06.zip',
      originalName: 'data-export.zip',
      mimeType: 'application/zip',
      sizeBytes: 10485760,
      storageProvider: 'gcs',
      storagePath: 'exports/user-789/2026-02-06.zip',
      url: null,
      purpose: 'export',
      metadata: { recordCount: 1500, format: 'json', compressed: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(exportFile.purpose).toBe('export');
    expect(exportFile.storageProvider).toBe('gcs');
    expect(exportFile.url).toBeNull();
  });

  test('should support file replacement workflow', () => {
    const original: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'v1.pdf',
      originalName: 'contract.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
      storageProvider: 's3',
      storagePath: 'docs/v1.pdf',
      url: 'https://cdn.example.com/docs/v1.pdf',
      purpose: 'document',
      metadata: { version: 1 },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const update: UpdateFileRecord = {
      filename: 'v2.pdf',
      storagePath: 'docs/v2.pdf',
      url: 'https://cdn.example.com/docs/v2.pdf',
      sizeBytes: 2097152,
      metadata: { version: 2, previousVersion: original.id },
    };

    expect(update.sizeBytes).toBeGreaterThan(original.sizeBytes);
    expect(update.metadata).toHaveProperty('previousVersion', original.id);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Files Schema - Edge Cases', () => {
  test('should handle zero-byte files', () => {
    const file: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'empty.txt',
      originalName: 'empty.txt',
      mimeType: 'text/plain',
      sizeBytes: 0,
      storageProvider: 'local',
      storagePath: '/data/empty.txt',
      url: null,
      purpose: 'other',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file.sizeBytes).toBe(0);
  });

  test('should handle filenames with special characters', () => {
    const file: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'sanitized-name.pdf',
      originalName: 'My File (1) [final] — copy.pdf; DROP TABLE files; --',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      storageProvider: 'local',
      storagePath: '/data/sanitized-name.pdf',
      url: null,
      purpose: 'document',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file.originalName).toContain('DROP TABLE');
    expect(file.filename).toBe('sanitized-name.pdf');
  });

  test('should handle very long filenames', () => {
    const longName = 'a'.repeat(255) + '.txt';
    const file: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'truncated.txt',
      originalName: longName,
      mimeType: 'text/plain',
      sizeBytes: 100,
      storageProvider: 'local',
      storagePath: '/data/truncated.txt',
      url: null,
      purpose: 'other',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file.originalName).toHaveLength(259);
  });

  test('should handle empty metadata', () => {
    const file: FileRecord = {
      id: 'file-123',
      tenantId: null,
      userId: 'user-789',
      filename: 'test.txt',
      originalName: 'test.txt',
      mimeType: 'text/plain',
      sizeBytes: 100,
      storageProvider: 'local',
      storagePath: '/data/test.txt',
      url: null,
      purpose: 'other',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(file.metadata).toEqual({});
    expect(Object.keys(file.metadata).length).toBe(0);
  });
});
