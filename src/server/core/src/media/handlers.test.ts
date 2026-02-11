// src/server/core/src/media/handlers.test.ts
/**
 * Media Handlers Unit Tests
 *
 * Tests for all media HTTP handler functions including upload,
 * metadata retrieval, deletion, and processing status.
 * All service dependencies are mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleDeleteMedia,
  handleGetMedia,
  handleGetMediaStatus,
  handleUploadMedia,
} from './handlers';

import type { MediaAppContext, MediaRequest } from './types';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('./service', () => ({
  uploadMedia: vi.fn(),
  getMediaMetadata: vi.fn(),
  deleteMedia: vi.fn(),
  getProcessingStatus: vi.fn(),
}));

// Import mocked service after vi.mock setup
const { uploadMedia, getMediaMetadata, deleteMedia, getProcessingStatus } =
  await import('./service');

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock MediaAppContext for testing.
 */
function createMockContext(): MediaAppContext {
  return {
    db: {},
    repos: {
      files: {
        findById: vi.fn(),
        findByUserId: vi.fn(),
        findByTenantId: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteByUserId: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    storage: {
      upload: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
    mediaQueue: {
      addJob: vi.fn(),
    },
  } as unknown as MediaAppContext;
}

/**
 * Create a mock authenticated request.
 */
function createMockRequest(overrides: Partial<MediaRequest> = {}): MediaRequest {
  return {
    user: {
      userId: 'user-1',
      email: 'test@example.com',
      role: 'user',
    },
    requestInfo: {
      correlationId: 'req-123',
      ip: '127.0.0.1',
    },
    cookies: {},
    headers: {
      'user-agent': 'test-agent',
    },
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as MediaRequest;
}

/**
 * Create a mock request with URL params.
 */
function createMockRequestWithParams(
  mediaId: string,
  overrides: Partial<MediaRequest> = {},
): MediaRequest & { params: { id: string } } {
  return {
    ...createMockRequest(overrides),
    params: { id: mediaId },
  } as unknown as MediaRequest & { params: { id: string } };
}

/**
 * Create a mock unauthenticated request.
 */
function createUnauthenticatedRequest(): MediaRequest {
  return {
    user: undefined,
    requestInfo: { correlationId: 'req-123', ip: '127.0.0.1' },
    cookies: {},
    headers: {},
  } as unknown as MediaRequest;
}

// ============================================================================
// Tests: handleUploadMedia
// ============================================================================

describe('handleUploadMedia', () => {
  let ctx: MediaAppContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  it('should return 201 with upload result on success', async () => {
    const uploadResult = {
      fileId: 'file-123',
      storageKey: 'media/user-1/file-123.jpg',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      processingJobId: 'job-1',
    };
    vi.mocked(uploadMedia).mockResolvedValue(uploadResult);

    const body = {
      buffer: new Uint8Array([0xff, 0xd8, 0xff]),
      filename: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    };
    const request = createMockRequest();

    const result = await handleUploadMedia(ctx, body, request);

    expect(result.status).toBe(201);
    expect(result.body).toEqual(uploadResult);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleUploadMedia(ctx, {}, request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 400 for invalid file types', async () => {
    const error = new Error('File type not allowed: application/pdf');
    error.name = 'BadRequestError';
    vi.mocked(uploadMedia).mockRejectedValue(error);

    const body = {
      buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      filename: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };
    const request = createMockRequest();

    const result = await handleUploadMedia(ctx, body, request);

    expect(result.status).toBe(400);
  });

  it('should return 500 for unexpected errors', async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error('Storage unavailable'));

    const body = {
      buffer: new Uint8Array([0xff]),
      filename: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 1,
    };
    const request = createMockRequest();

    const result = await handleUploadMedia(ctx, body, request);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'An error occurred processing your request' });
  });
});

// ============================================================================
// Tests: handleGetMedia
// ============================================================================

describe('handleGetMedia', () => {
  let ctx: MediaAppContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  it('should return 200 with media metadata on success', async () => {
    const metadata = {
      id: 'file-123',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      url: 'https://storage.example.com/signed',
      purpose: 'attachment',
      processingStatus: 'complete' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(getMediaMetadata).mockResolvedValue(metadata);

    const request = createMockRequestWithParams('file-123');

    const result = await handleGetMedia(ctx, undefined, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(metadata);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleGetMedia(ctx, undefined, request);

    expect(result.status).toBe(401);
  });

  it('should return 400 if media ID is missing', async () => {
    const request = createMockRequest();

    const result = await handleGetMedia(ctx, undefined, request);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Media ID is required' });
  });

  it('should return 404 if media not found', async () => {
    const error = new Error('Media file not found');
    error.name = 'NotFoundError';
    vi.mocked(getMediaMetadata).mockRejectedValue(error);

    const request = createMockRequestWithParams('missing');

    const result = await handleGetMedia(ctx, undefined, request);

    expect(result.status).toBe(404);
  });
});

// ============================================================================
// Tests: handleDeleteMedia
// ============================================================================

describe('handleDeleteMedia', () => {
  let ctx: MediaAppContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  it('should return 200 with success message on deletion', async () => {
    vi.mocked(deleteMedia).mockResolvedValue(undefined);

    const request = createMockRequestWithParams('file-123');

    const result = await handleDeleteMedia(ctx, undefined, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Media file deleted',
    });
  });

  it('should return 401 for unauthenticated requests', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleDeleteMedia(ctx, undefined, request);

    expect(result.status).toBe(401);
  });

  it('should return 400 if media ID is missing', async () => {
    const request = createMockRequest();

    const result = await handleDeleteMedia(ctx, undefined, request);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Media ID is required' });
  });

  it('should return 404 if media not found', async () => {
    const error = new Error('Media file not found');
    error.name = 'NotFoundError';
    vi.mocked(deleteMedia).mockRejectedValue(error);

    const request = createMockRequestWithParams('missing');

    const result = await handleDeleteMedia(ctx, undefined, request);

    expect(result.status).toBe(404);
  });
});

// ============================================================================
// Tests: handleGetMediaStatus
// ============================================================================

describe('handleGetMediaStatus', () => {
  let ctx: MediaAppContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  it('should return 200 with processing status on success', async () => {
    const statusResponse = {
      fileId: 'file-123',
      status: 'complete' as const,
      error: null,
    };
    vi.mocked(getProcessingStatus).mockResolvedValue(statusResponse);

    const request = createMockRequestWithParams('file-123');

    const result = await handleGetMediaStatus(ctx, undefined, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(statusResponse);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleGetMediaStatus(ctx, undefined, request);

    expect(result.status).toBe(401);
  });

  it('should return 400 if media ID is missing', async () => {
    const request = createMockRequest();

    const result = await handleGetMediaStatus(ctx, undefined, request);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Media ID is required' });
  });

  it('should return 404 if media not found', async () => {
    const error = new Error('Media file not found');
    error.name = 'NotFoundError';
    vi.mocked(getProcessingStatus).mockRejectedValue(error);

    const request = createMockRequestWithParams('missing');

    const result = await handleGetMediaStatus(ctx, undefined, request);

    expect(result.status).toBe(404);
  });

  it('should return failed status with error message', async () => {
    const statusResponse = {
      fileId: 'file-123',
      status: 'failed' as const,
      error: 'Unsupported codec',
    };
    vi.mocked(getProcessingStatus).mockResolvedValue(statusResponse);

    const request = createMockRequestWithParams('file-123');

    const result = await handleGetMediaStatus(ctx, undefined, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(statusResponse);
  });
});
