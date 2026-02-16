// main/server/core/src/media/service.test.ts
/**
 * Media Service Unit Tests
 *
 * Tests for all media service operations including upload, metadata
 * retrieval, deletion, and processing status checks.
 * All external dependencies (storage, repos, queue) are mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteMedia, getMediaMetadata, getProcessingStatus, uploadMedia } from './service';

import type {
  MediaProcessingQueuePort,
  MediaRepositories,
  MediaStorageProvider,
  MediaUploadInput,
} from './types';
import type { FileRecord } from '../../../db/src';

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a mock storage provider.
 */
function createMockStorage(): MediaStorageProvider {
  return {
    upload: vi.fn().mockResolvedValue('media/user1/abc123.jpg'),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue('https://storage.example.com/signed-url'),
  };
}

/**
 * Create mock media repositories.
 */
function createMockRepos(): MediaRepositories {
  return {
    files: {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findByTenantId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByUserId: vi.fn(),
    },
  } as unknown as MediaRepositories;
}

/**
 * Create a mock processing queue.
 */
function createMockQueue(): MediaProcessingQueuePort {
  return {
    addJob: vi.fn().mockResolvedValue('job-123'),
  };
}

/**
 * Create a mock file record.
 */
function createMockFileRecord(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    id: 'file-123',
    tenantId: null,
    userId: 'user-1',
    filename: 'test-image',
    originalName: 'test-image.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    storageProvider: 'local',
    storagePath: 'media/user-1/file-123.jpg',
    url: null,
    purpose: 'attachment',
    metadata: { processingStatus: 'complete' },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

/**
 * Create a valid upload input.
 */
function createUploadInput(overrides: Partial<MediaUploadInput> = {}): MediaUploadInput {
  return {
    buffer: new Uint8Array([0xff, 0xd8, 0xff]),
    filename: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    ...overrides,
  };
}

// ============================================================================
// Tests: uploadMedia
// ============================================================================

describe('uploadMedia', () => {
  let storage: MediaStorageProvider;
  let repos: MediaRepositories;
  let queue: MediaProcessingQueuePort;

  beforeEach(() => {
    storage = createMockStorage();
    repos = createMockRepos();
    queue = createMockQueue();
    vi.mocked(repos.files.create).mockResolvedValue(createMockFileRecord());
  });

  it('should upload a valid image file', async () => {
    const file = createUploadInput();

    const result = await uploadMedia(storage, repos, queue, 'user-1', file);

    expect(result.fileId).toBeDefined();
    expect(result.storageKey).toContain('media/user-1/');
    expect(result.storageKey).toContain('.jpg');
    expect(result.filename).toBe('photo.jpg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.sizeBytes).toBe(1024);
    expect(result.processingJobId).toBe('job-123');
  });

  it('should store file via storage provider', async () => {
    const file = createUploadInput();

    await uploadMedia(storage, repos, queue, 'user-1', file);

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringContaining('media/user-1/'),
      file.buffer,
      'image/jpeg',
    );
  });

  it('should create a file record in the database', async () => {
    const file = createUploadInput();

    await uploadMedia(storage, repos, queue, 'user-1', file);

    expect(repos.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        filename: 'photo.jpg',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        storageProvider: 'local',
        purpose: 'attachment',
      }),
    );
  });

  it('should queue a processing job when queue is provided', async () => {
    const file = createUploadInput();

    await uploadMedia(storage, repos, queue, 'user-1', file);

    expect(queue.addJob).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'photo.jpg',
        userId: 'user-1',
      }),
    );
  });

  it('should not queue a job when queue is undefined', async () => {
    const file = createUploadInput();

    const result = await uploadMedia(storage, repos, undefined, 'user-1', file);

    expect(result.processingJobId).toBeNull();
  });

  it('should reject files exceeding max size', async () => {
    const file = createUploadInput({ size: 200 * 1024 * 1024 });

    await expect(uploadMedia(storage, repos, queue, 'user-1', file)).rejects.toThrow(
      'File too large',
    );
  });

  it('should reject empty files', async () => {
    const file = createUploadInput({ size: 0 });

    await expect(uploadMedia(storage, repos, queue, 'user-1', file)).rejects.toThrow(
      'File is empty',
    );
  });

  it('should reject unsupported MIME types', async () => {
    const file = createUploadInput({ mimetype: 'application/pdf' });

    await expect(uploadMedia(storage, repos, queue, 'user-1', file)).rejects.toThrow(
      'File type not allowed',
    );
  });

  it('should sanitize filenames with path separators', async () => {
    const file = createUploadInput({ filename: '../../../etc/passwd' });

    const result = await uploadMedia(storage, repos, queue, 'user-1', file);

    // Path separators should be removed
    expect(result.filename).not.toContain('/');
    expect(result.filename).not.toContain('\\');
  });

  it('should handle audio MIME types', async () => {
    const file = createUploadInput({ mimetype: 'audio/mpeg', filename: 'song.mp3' });

    const result = await uploadMedia(storage, repos, queue, 'user-1', file);

    expect(result.storageKey).toContain('.mp3');
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('should handle video MIME types', async () => {
    const file = createUploadInput({ mimetype: 'video/mp4', filename: 'clip.mp4' });

    const result = await uploadMedia(storage, repos, queue, 'user-1', file);

    expect(result.storageKey).toContain('.mp4');
    expect(result.mimeType).toBe('video/mp4');
  });
});

// ============================================================================
// Tests: getMediaMetadata
// ============================================================================

describe('getMediaMetadata', () => {
  let storage: MediaStorageProvider;
  let repos: MediaRepositories;

  beforeEach(() => {
    storage = createMockStorage();
    repos = createMockRepos();
  });

  it('should return metadata for a file owned by the user', async () => {
    const file = createMockFileRecord();
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    const result = await getMediaMetadata(storage, repos, 'file-123', 'user-1');

    expect(result.id).toBe('file-123');
    expect(result.filename).toBe('test-image.jpg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.sizeBytes).toBe(1024);
    expect(result.url).toBe('https://storage.example.com/signed-url');
    expect(result.processingStatus).toBe('complete');
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should generate a signed URL from storage', async () => {
    const file = createMockFileRecord();
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    await getMediaMetadata(storage, repos, 'file-123', 'user-1');

    expect(storage.getSignedUrl).toHaveBeenCalledWith('media/user-1/file-123.jpg');
  });

  it('should throw NotFoundError if file does not exist', async () => {
    vi.mocked(repos.files.findById).mockResolvedValue(null);

    await expect(getMediaMetadata(storage, repos, 'missing', 'user-1')).rejects.toThrow(
      'Media file not found',
    );
  });

  it('should throw NotFoundError if file belongs to another user', async () => {
    const file = createMockFileRecord({ userId: 'other-user' });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    await expect(getMediaMetadata(storage, repos, 'file-123', 'user-1')).rejects.toThrow(
      'Media file not found',
    );
  });

  it('should return null URL if storagePath is empty', async () => {
    const file = createMockFileRecord({ storagePath: '' });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    const result = await getMediaMetadata(storage, repos, 'file-123', 'user-1');

    expect(result.url).toBeNull();
  });

  it('should derive processing status from metadata', async () => {
    const file = createMockFileRecord({
      metadata: { processingStatus: 'processing' },
    });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    const result = await getMediaMetadata(storage, repos, 'file-123', 'user-1');

    expect(result.processingStatus).toBe('processing');
  });
});

// ============================================================================
// Tests: deleteMedia
// ============================================================================

describe('deleteMedia', () => {
  let storage: MediaStorageProvider;
  let repos: MediaRepositories;

  beforeEach(() => {
    storage = createMockStorage();
    repos = createMockRepos();
    vi.mocked(repos.files.delete).mockResolvedValue(true);
  });

  it('should delete file from storage and database', async () => {
    const file = createMockFileRecord();
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    await deleteMedia(storage, repos, 'file-123', 'user-1');

    expect(storage.delete).toHaveBeenCalledWith('media/user-1/file-123.jpg');
    expect(repos.files.delete).toHaveBeenCalledWith('file-123');
  });

  it('should throw NotFoundError if file does not exist', async () => {
    vi.mocked(repos.files.findById).mockResolvedValue(null);

    await expect(deleteMedia(storage, repos, 'missing', 'user-1')).rejects.toThrow(
      'Media file not found',
    );
  });

  it('should throw NotFoundError if file belongs to another user', async () => {
    const file = createMockFileRecord({ userId: 'other-user' });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    await expect(deleteMedia(storage, repos, 'file-123', 'user-1')).rejects.toThrow(
      'Media file not found',
    );
  });

  it('should skip storage deletion if storagePath is empty', async () => {
    const file = createMockFileRecord({ storagePath: '' });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    await deleteMedia(storage, repos, 'file-123', 'user-1');

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repos.files.delete).toHaveBeenCalledWith('file-123');
  });
});

// ============================================================================
// Tests: getProcessingStatus
// ============================================================================

describe('getProcessingStatus', () => {
  let repos: MediaRepositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('should return processing status for a file', async () => {
    const file = createMockFileRecord({
      metadata: { processingStatus: 'complete' },
    });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    const result = await getProcessingStatus(repos, 'file-123', 'user-1');

    expect(result.fileId).toBe('file-123');
    expect(result.status).toBe('complete');
    expect(result.error).toBeNull();
  });

  it('should return pending status for files without processing metadata', async () => {
    const file = createMockFileRecord({
      storagePath: '',
      metadata: {},
    });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    const result = await getProcessingStatus(repos, 'file-123', 'user-1');

    expect(result.status).toBe('pending');
  });

  it('should return failed status with error message', async () => {
    const file = createMockFileRecord({
      metadata: {
        processingStatus: 'failed',
        processingError: 'Unsupported codec',
      },
    });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    const result = await getProcessingStatus(repos, 'file-123', 'user-1');

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Unsupported codec');
  });

  it('should throw NotFoundError if file does not exist', async () => {
    vi.mocked(repos.files.findById).mockResolvedValue(null);

    await expect(getProcessingStatus(repos, 'missing', 'user-1')).rejects.toThrow(
      'Media file not found',
    );
  });

  it('should throw NotFoundError if file belongs to another user', async () => {
    const file = createMockFileRecord({ userId: 'other-user' });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    await expect(getProcessingStatus(repos, 'file-123', 'user-1')).rejects.toThrow(
      'Media file not found',
    );
  });

  it('should default to complete status if storagePath is set and no metadata', async () => {
    const file = createMockFileRecord({
      storagePath: 'media/user-1/file.jpg',
      metadata: {},
    });
    vi.mocked(repos.files.findById).mockResolvedValue(file);

    const result = await getProcessingStatus(repos, 'file-123', 'user-1');

    expect(result.status).toBe('complete');
  });
});
