// main/shared/src/engine/files/files.test.ts

import { describe, expect, it, vi } from 'vitest';

import {
  createFileRecordSchema,
  filePurposeSchema,
  fileRecordSchema,
  fileUploadRequestSchema,
  generateUniqueFilename,
  joinStoragePath,
  normalizeStoragePath,
  storageProviderSchema,
  updateFileRecordSchema,
  validateFileType,
  type CreateFileRecord,
  type FileRecord,
  type UpdateFileRecord,
} from './files';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_UUID_2 = '00000000-0000-0000-0000-000000000002';
const VALID_DATE = new Date('2026-01-15T12:00:00.000Z');
const VALID_ISO = '2026-01-15T12:00:00.000Z';

const VALID_FILE_RECORD = {
  id: VALID_UUID,
  tenantId: VALID_UUID_2,
  userId: VALID_UUID,
  filename: 'abc123.png',
  originalName: 'photo.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
  storageProvider: 'local' as const,
  storagePath: '/uploads/abc123.png',
  url: 'https://example.com/files/abc123.png',
  purpose: 'avatar' as const,
  metadata: { width: 800, height: 600 },
  createdAt: VALID_ISO,
  updatedAt: VALID_ISO,
};

// ============================================================================
// storageProviderSchema
// ============================================================================

describe('storageProviderSchema', () => {
  describe('valid inputs', () => {
    it('should accept "local"', () => {
      expect(storageProviderSchema.parse('local')).toBe('local');
    });

    it('should accept "s3"', () => {
      expect(storageProviderSchema.parse('s3')).toBe('s3');
    });

    it('should accept "gcs"', () => {
      expect(storageProviderSchema.parse('gcs')).toBe('gcs');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid provider', () => {
      expect(() => storageProviderSchema.parse('azure')).toThrow();
    });

    it('should reject non-string', () => {
      expect(() => storageProviderSchema.parse(123)).toThrow();
    });
  });
});

// ============================================================================
// filePurposeSchema
// ============================================================================

describe('filePurposeSchema', () => {
  describe('valid inputs', () => {
    it('should accept "avatar"', () => {
      expect(filePurposeSchema.parse('avatar')).toBe('avatar');
    });

    it('should accept "document"', () => {
      expect(filePurposeSchema.parse('document')).toBe('document');
    });

    it('should accept "export"', () => {
      expect(filePurposeSchema.parse('export')).toBe('export');
    });

    it('should accept "attachment"', () => {
      expect(filePurposeSchema.parse('attachment')).toBe('attachment');
    });

    it('should accept "other"', () => {
      expect(filePurposeSchema.parse('other')).toBe('other');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid purpose', () => {
      expect(() => filePurposeSchema.parse('invalid')).toThrow();
    });

    it('should reject non-string', () => {
      expect(() => filePurposeSchema.parse(null)).toThrow();
    });
  });
});

// ============================================================================
// fileUploadRequestSchema
// ============================================================================

describe('fileUploadRequestSchema', () => {
  it('should parse a valid upload request', () => {
    const buffer = Uint8Array.from([1, 2, 3]);
    const result = fileUploadRequestSchema.parse({
      buffer,
      mimetype: 'image/png',
      filename: 'avatar.png',
      originalName: 'avatar.png',
      size: 3,
    });

    expect(result.buffer).toBe(buffer);
    expect(result.mimetype).toBe('image/png');
    expect(result.filename).toBe('avatar.png');
    expect(result.originalName).toBe('avatar.png');
    expect(result.size).toBe(3);
  });

  it('should reject missing buffer', () => {
    expect(() => fileUploadRequestSchema.parse({ mimetype: 'image/png' })).toThrow(
      'buffer must be a Uint8Array',
    );
  });
});

// ============================================================================
// fileRecordSchema
// ============================================================================

describe('fileRecordSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full file record', () => {
      const result: FileRecord = fileRecordSchema.parse(VALID_FILE_RECORD);

      expect(result.id).toBe(VALID_UUID);
      expect(result.tenantId).toBe(VALID_UUID_2);
      expect(result.userId).toBe(VALID_UUID);
      expect(result.filename).toBe('abc123.png');
      expect(result.originalName).toBe('photo.png');
      expect(result.mimeType).toBe('image/png');
      expect(result.sizeBytes).toBe(1024);
      expect(result.storageProvider).toBe('local');
      expect(result.storagePath).toBe('/uploads/abc123.png');
      expect(result.url).toBe('https://example.com/files/abc123.png');
      expect(result.purpose).toBe('avatar');
      expect(result.metadata).toEqual({ width: 800, height: 600 });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: FileRecord = fileRecordSchema.parse({
        ...VALID_FILE_RECORD,
        tenantId: null,
        url: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.url).toBeNull();
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: FileRecord = fileRecordSchema.parse(VALID_FILE_RECORD);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept Date objects for date fields', () => {
      const result: FileRecord = fileRecordSchema.parse({
        ...VALID_FILE_RECORD,
        createdAt: VALID_DATE,
        updatedAt: VALID_DATE,
      });

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept zero for sizeBytes', () => {
      const result: FileRecord = fileRecordSchema.parse({
        ...VALID_FILE_RECORD,
        sizeBytes: 0,
      });

      expect(result.sizeBytes).toBe(0);
    });

    it('should accept all valid storage providers', () => {
      const providers = ['local', 's3', 'gcs'] as const;
      providers.forEach((provider) => {
        const result: FileRecord = fileRecordSchema.parse({
          ...VALID_FILE_RECORD,
          storageProvider: provider,
        });
        expect(result.storageProvider).toBe(provider);
      });
    });

    it('should accept all valid file purposes', () => {
      const purposes = ['avatar', 'document', 'export', 'attachment', 'other'] as const;
      purposes.forEach((purpose) => {
        const result: FileRecord = fileRecordSchema.parse({
          ...VALID_FILE_RECORD,
          purpose,
        });
        expect(result.purpose).toBe(purpose);
      });
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => fileRecordSchema.parse({ ...VALID_FILE_RECORD, id: 'bad' })).toThrow();
    });

    it('should reject invalid UUID for userId', () => {
      expect(() => fileRecordSchema.parse({ ...VALID_FILE_RECORD, userId: 'bad' })).toThrow();
    });

    it('should reject invalid UUID for tenantId', () => {
      expect(() => fileRecordSchema.parse({ ...VALID_FILE_RECORD, tenantId: 'bad' })).toThrow();
    });

    it('should reject negative sizeBytes', () => {
      expect(() => fileRecordSchema.parse({ ...VALID_FILE_RECORD, sizeBytes: -1 })).toThrow();
    });

    it('should reject invalid storage provider', () => {
      expect(() =>
        fileRecordSchema.parse({ ...VALID_FILE_RECORD, storageProvider: 'invalid' }),
      ).toThrow();
    });

    it('should reject invalid file purpose', () => {
      expect(() => fileRecordSchema.parse({ ...VALID_FILE_RECORD, purpose: 'invalid' })).toThrow();
    });

    it('should reject invalid date for createdAt', () => {
      expect(() =>
        fileRecordSchema.parse({ ...VALID_FILE_RECORD, createdAt: 'not-a-date' }),
      ).toThrow();
    });

    it('should reject invalid date for updatedAt', () => {
      expect(() =>
        fileRecordSchema.parse({ ...VALID_FILE_RECORD, updatedAt: 'not-a-date' }),
      ).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => fileRecordSchema.parse(null)).toThrow();
      expect(() => fileRecordSchema.parse('string')).toThrow();
      expect(() => fileRecordSchema.parse(42)).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => fileRecordSchema.parse({})).toThrow();
      expect(() => fileRecordSchema.parse({ id: VALID_UUID })).toThrow();
    });
  });
});

// ============================================================================
// createFileRecordSchema
// ============================================================================

describe('createFileRecordSchema', () => {
  describe('valid inputs', () => {
    it('should parse with all required fields', () => {
      const result: CreateFileRecord = createFileRecordSchema.parse({
        userId: VALID_UUID,
        filename: 'abc.png',
        originalName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        storageProvider: 's3',
        storagePath: '/bucket/abc.png',
      });

      expect(result.userId).toBe(VALID_UUID);
      expect(result.filename).toBe('abc.png');
      expect(result.originalName).toBe('photo.png');
      expect(result.mimeType).toBe('image/png');
      expect(result.sizeBytes).toBe(2048);
      expect(result.storageProvider).toBe('s3');
      expect(result.storagePath).toBe('/bucket/abc.png');
      expect(result.tenantId).toBeUndefined();
      expect(result.url).toBeUndefined();
      expect(result.purpose).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const result: CreateFileRecord = createFileRecordSchema.parse({
        tenantId: VALID_UUID_2,
        userId: VALID_UUID,
        filename: 'abc.png',
        originalName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        storageProvider: 's3',
        storagePath: '/bucket/abc.png',
        url: 'https://cdn.example.com/abc.png',
        purpose: 'document',
        metadata: { tags: ['work'] },
      });

      expect(result.tenantId).toBe(VALID_UUID_2);
      expect(result.url).toBe('https://cdn.example.com/abc.png');
      expect(result.purpose).toBe('document');
      expect(result.metadata).toEqual({ tags: ['work'] });
    });

    it('should accept null for optional nullable fields', () => {
      const result: CreateFileRecord = createFileRecordSchema.parse({
        userId: VALID_UUID,
        filename: 'abc.png',
        originalName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 0,
        storageProvider: 'local',
        storagePath: '/uploads/abc.png',
        tenantId: null,
        url: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.url).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing userId', () => {
      expect(() =>
        createFileRecordSchema.parse({
          filename: 'abc.png',
          originalName: 'photo.png',
          mimeType: 'image/png',
          sizeBytes: 100,
          storageProvider: 'local',
          storagePath: '/uploads/abc.png',
        }),
      ).toThrow();
    });

    it('should reject invalid UUID for userId', () => {
      expect(() =>
        createFileRecordSchema.parse({
          userId: 'bad-uuid',
          filename: 'abc.png',
          originalName: 'photo.png',
          mimeType: 'image/png',
          sizeBytes: 100,
          storageProvider: 'local',
          storagePath: '/uploads/abc.png',
        }),
      ).toThrow();
    });

    it('should reject negative sizeBytes', () => {
      expect(() =>
        createFileRecordSchema.parse({
          userId: VALID_UUID,
          filename: 'abc.png',
          originalName: 'photo.png',
          mimeType: 'image/png',
          sizeBytes: -100,
          storageProvider: 'local',
          storagePath: '/uploads/abc.png',
        }),
      ).toThrow();
    });

    it('should reject invalid storage provider', () => {
      expect(() =>
        createFileRecordSchema.parse({
          userId: VALID_UUID,
          filename: 'abc.png',
          originalName: 'photo.png',
          mimeType: 'image/png',
          sizeBytes: 100,
          storageProvider: 'azure',
          storagePath: '/uploads/abc.png',
        }),
      ).toThrow();
    });
  });
});

// ============================================================================
// updateFileRecordSchema
// ============================================================================

describe('updateFileRecordSchema', () => {
  describe('valid inputs', () => {
    it('should parse empty update (no changes)', () => {
      const result: UpdateFileRecord = updateFileRecordSchema.parse({});

      expect(result.filename).toBeUndefined();
      expect(result.purpose).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should parse with filename only', () => {
      const result: UpdateFileRecord = updateFileRecordSchema.parse({
        filename: 'new-name.png',
      });

      expect(result.filename).toBe('new-name.png');
    });

    it('should parse with purpose only', () => {
      const result: UpdateFileRecord = updateFileRecordSchema.parse({
        purpose: 'attachment',
      });

      expect(result.purpose).toBe('attachment');
    });

    it('should parse with metadata only', () => {
      const result: UpdateFileRecord = updateFileRecordSchema.parse({
        metadata: { updated: true },
      });

      expect(result.metadata).toEqual({ updated: true });
    });

    it('should accept null for nullable fields', () => {
      const result: UpdateFileRecord = updateFileRecordSchema.parse({
        tenantId: null,
        url: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.url).toBeNull();
    });

    it('should parse with all fields', () => {
      const result: UpdateFileRecord = updateFileRecordSchema.parse({
        tenantId: VALID_UUID,
        filename: 'updated.png',
        originalName: 'updated-original.png',
        mimeType: 'image/jpeg',
        sizeBytes: 5000,
        storageProvider: 'gcs',
        storagePath: '/gcs/updated.png',
        url: 'https://storage.example.com/updated.png',
        purpose: 'export',
        metadata: { version: 2 },
      });

      expect(result.tenantId).toBe(VALID_UUID);
      expect(result.filename).toBe('updated.png');
      expect(result.originalName).toBe('updated-original.png');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.sizeBytes).toBe(5000);
      expect(result.storageProvider).toBe('gcs');
      expect(result.storagePath).toBe('/gcs/updated.png');
      expect(result.url).toBe('https://storage.example.com/updated.png');
      expect(result.purpose).toBe('export');
      expect(result.metadata).toEqual({ version: 2 });
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid storage provider', () => {
      expect(() => updateFileRecordSchema.parse({ storageProvider: 'invalid' })).toThrow();
    });

    it('should reject invalid file purpose', () => {
      expect(() => updateFileRecordSchema.parse({ purpose: 'invalid' })).toThrow();
    });

    it('should reject negative sizeBytes', () => {
      expect(() => updateFileRecordSchema.parse({ sizeBytes: -1 })).toThrow();
    });

    it('should coerce non-object input to empty update', () => {
      const result: UpdateFileRecord = updateFileRecordSchema.parse(null);
      expect(result.filename).toBeUndefined();
      expect(result.purpose).toBeUndefined();
    });
  });
});

// ============================================================================
// normalizeStoragePath
// ============================================================================

describe('normalizeStoragePath', () => {
  describe('basic normalization', () => {
    it('normalizes basic paths', () => {
      expect(normalizeStoragePath('foo/bar')).toBe('foo/bar');
      expect(normalizeStoragePath('/foo/bar')).toBe('foo/bar');
      expect(normalizeStoragePath('foo/bar/')).toBe('foo/bar');
      expect(normalizeStoragePath('/foo/bar/')).toBe('foo/bar');
    });

    it('handles single segments', () => {
      expect(normalizeStoragePath('foo')).toBe('foo');
      expect(normalizeStoragePath('/foo')).toBe('foo');
      expect(normalizeStoragePath('foo/')).toBe('foo');
      expect(normalizeStoragePath('/foo/')).toBe('foo');
    });

    it('normalizes mixed slashes', () => {
      expect(normalizeStoragePath('foo\\bar')).toBe('foo/bar');
      expect(normalizeStoragePath('\\foo\\bar')).toBe('foo/bar');
      expect(normalizeStoragePath('foo\\bar\\')).toBe('foo/bar');
    });
  });

  describe('path traversal prevention', () => {
    it('resolves .. segments', () => {
      expect(normalizeStoragePath('foo/../bar')).toBe('bar');
      expect(normalizeStoragePath('foo/bar/../baz')).toBe('foo/baz');
      expect(normalizeStoragePath('foo/./bar')).toBe('foo/bar');
    });

    it('does not allow traversal above root', () => {
      expect(normalizeStoragePath('../foo')).toBe('foo');
      expect(normalizeStoragePath('../../foo')).toBe('foo');
      expect(normalizeStoragePath('foo/../../bar')).toBe('bar');
    });
  });

  describe('invalid inputs', () => {
    it('handles empty strings', () => {
      expect(normalizeStoragePath('')).toBe('');
      expect(normalizeStoragePath('/')).toBe('');
      expect(normalizeStoragePath('\\')).toBe('');
    });

    it('handles whitespace', () => {
      expect(normalizeStoragePath('  ')).toBe('  ');
      expect(normalizeStoragePath(' foo/bar ')).toBe(' foo/bar ');
    });
  });
});

// ============================================================================
// joinStoragePath
// ============================================================================

describe('joinStoragePath', () => {
  it('joins multiple segments into a normalized path', () => {
    expect(joinStoragePath('uploads', 'images', 'photo.jpg')).toBe('uploads/images/photo.jpg');
  });

  it('normalizes the joined result', () => {
    expect(joinStoragePath('/uploads/', '/images/', 'photo.jpg')).toBe(
      'uploads/images/photo.jpg',
    );
  });

  it('resolves .. in joined segments', () => {
    expect(joinStoragePath('uploads', 'temp', '..', 'images', 'photo.jpg')).toBe(
      'uploads/images/photo.jpg',
    );
  });

  it('handles single segment', () => {
    expect(joinStoragePath('uploads')).toBe('uploads');
  });

  it('handles empty segments', () => {
    expect(joinStoragePath('', 'uploads', '', 'photo.jpg')).toBe('uploads/photo.jpg');
  });

  it('handles Windows-style backslashes in segments', () => {
    expect(joinStoragePath('uploads\\images', 'photo.jpg')).toBe('uploads/images/photo.jpg');
  });
});

// ============================================================================
// generateUniqueFilename
// ============================================================================

describe('generateUniqueFilename', () => {
  it('appends timestamp to filename by default', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const result = generateUniqueFilename('photo.jpg');
    expect(result).toBe('photo_1700000000000.jpg');
    vi.restoreAllMocks();
  });

  it('preserves the file extension', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const result = generateUniqueFilename('document.pdf');
    expect(result).toBe('document_1700000000000.pdf');
    vi.restoreAllMocks();
  });

  it('handles filenames without extension', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const result = generateUniqueFilename('README');
    expect(result).toBe('README_1700000000000');
    vi.restoreAllMocks();
  });

  it('handles filenames with multiple dots', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const result = generateUniqueFilename('archive.tar.gz');
    expect(result).toBe('archive.tar_1700000000000.gz');
    vi.restoreAllMocks();
  });

  it('uses secure ID when appendTimestamp is false', () => {
    const result = generateUniqueFilename('photo.jpg', false);
    // Format: photo_<8-char-alphanumeric>.jpg
    expect(result).toMatch(/^photo_[A-Za-z0-9]{8}\.jpg$/);
  });

  it('returns empty string for empty filename', () => {
    expect(generateUniqueFilename('')).toBe('');
  });
});

// ============================================================================
// validateFileType
// ============================================================================

describe('validateFileType', () => {
  describe('extension-based validation', () => {
    it('validates filename against allowed extensions', () => {
      expect(validateFileType('photo.jpg', ['jpg', 'png'])).toBe(true);
      expect(validateFileType('photo.png', ['jpg', 'png'])).toBe(true);
    });

    it('rejects disallowed extensions', () => {
      expect(validateFileType('script.exe', ['jpg', 'png'])).toBe(false);
    });

    it('matches extensions with dot prefix', () => {
      expect(validateFileType('photo.jpg', ['.jpg', '.png'])).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(validateFileType('Photo.JPG', ['jpg'])).toBe(true);
      expect(validateFileType('photo.jpg', ['JPG'])).toBe(true);
    });
  });

  describe('MIME-type validation', () => {
    it('validates exact MIME types', () => {
      expect(validateFileType('image/jpeg', ['image/jpeg', 'image/png'])).toBe(true);
      expect(validateFileType('image/gif', ['image/jpeg', 'image/png'])).toBe(false);
    });

    it('supports wildcard MIME types', () => {
      expect(validateFileType('image/jpeg', ['image/*'])).toBe(true);
      expect(validateFileType('image/png', ['image/*'])).toBe(true);
      expect(validateFileType('text/plain', ['image/*'])).toBe(false);
    });

    it('is case-insensitive for MIME types', () => {
      expect(validateFileType('Image/JPEG', ['image/jpeg'])).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty filename', () => {
      expect(validateFileType('', ['jpg'])).toBe(false);
    });

    it('returns false for empty allowed types', () => {
      expect(validateFileType('photo.jpg', [])).toBe(false);
    });

    it('returns false for filename with no extension and non-MIME types', () => {
      expect(validateFileType('README', ['jpg', 'png'])).toBe(false);
    });
  });
});
