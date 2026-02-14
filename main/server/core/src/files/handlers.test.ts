// main/server/core/src/files/handlers.test.ts
/**
 * Files Handlers Unit Tests
 *
 * Tests for file HTTP handler functions.
 * Validates request parsing, auth checks, and response formatting.
 *
 * @complexity O(1) per test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleDeleteFile, handleDownloadFile, handleGetFile, handleUploadFile } from './handlers';

import type { FileStorageProvider } from './types';
import type { FileRepository } from '../../../db/src';
import type { HandlerContext } from '../../../engine/src';
import type { AuthenticatedUser, Logger } from '@abe-stack/shared/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mock Setup
// ============================================================================

const { mockUploadFile, mockGetFileMetadata, mockDeleteFile, mockGetDownloadUrl } = vi.hoisted(
  () => ({
    mockUploadFile: vi.fn(),
    mockGetFileMetadata: vi.fn(),
    mockDeleteFile: vi.fn(),
    mockGetDownloadUrl: vi.fn(),
  }),
);

vi.mock('./service', () => ({
  uploadFile: mockUploadFile,
  getFileMetadata: mockGetFileMetadata,
  deleteFile: mockDeleteFile,
  getDownloadUrl: mockGetDownloadUrl,
}));

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

function createMockStorage(): FileStorageProvider {
  return {
    upload: vi.fn().mockResolvedValue('files/user-123/test.png'),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
  };
}

function createMockFileRepo(): FileRepository {
  return {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByTenantId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByUserId: vi.fn(),
  };
}

function createMockCtx(): HandlerContext {
  return {
    db: {},
    repos: {
      files: createMockFileRepo(),
    },
    log: createMockLogger(),
    storage: createMockStorage(),
  } as unknown as HandlerContext;
}

function createMockRequest(
  user?: AuthenticatedUser,
  params?: Record<string, string>,
): FastifyRequest {
  return {
    user,
    params: params ?? {},
    query: {},
    headers: {},
    body: null,
  } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

const testUser: AuthenticatedUser = {
  userId: 'user-123',
  email: 'test@example.com',
  role: 'user',
};

const testFileMetadata = {
  id: 'file-123',
  userId: 'user-123',
  tenantId: null,
  filename: '1700000000000.png',
  originalName: 'photo.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
  purpose: 'document',
  downloadUrl: 'https://signed-url.example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// ============================================================================
// Test Setup
// ============================================================================

let ctx: HandlerContext;
let reply: FastifyReply;

beforeEach(() => {
  ctx = createMockCtx();
  reply = createMockReply();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// handleUploadFile
// ============================================================================

describe('handleUploadFile', () => {
  it('should return 401 when no user is authenticated', async () => {
    const request = createMockRequest();
    const result = await handleUploadFile(ctx, null, request, reply);

    expect(result).toEqual({ status: 401, body: { message: 'Unauthorized' } });
  });

  it('should return 400 when no file data is provided', async () => {
    const request = createMockRequest(testUser);
    const result = await handleUploadFile(ctx, null, request, reply);

    expect(result).toEqual({ status: 400, body: { message: 'No file provided' } });
  });

  it('should return 201 with file metadata on successful upload', async () => {
    mockUploadFile.mockResolvedValue(testFileMetadata);

    const request = createMockRequest(testUser);
    const body = {
      buffer: Buffer.from('file-content'),
      mimetype: 'image/png',
      originalName: 'photo.png',
      size: 1024,
    };

    const result = await handleUploadFile(ctx, body, request, reply);

    expect(result).toEqual({ status: 201, body: { file: testFileMetadata } });
    expect(mockUploadFile).toHaveBeenCalledOnce();
  });

  it('should return 400 when service throws BadRequestError', async () => {
    const error = new Error('Invalid file type');
    error.name = 'BadRequestError';
    mockUploadFile.mockRejectedValue(error);

    const request = createMockRequest(testUser);
    const body = {
      buffer: Buffer.from('content'),
      mimetype: 'image/png',
      originalName: 'test.png',
      size: 100,
    };

    const result = await handleUploadFile(ctx, body, request, reply);

    expect(result).toEqual({ status: 400, body: { message: 'Invalid file type' } });
  });
});

// ============================================================================
// handleGetFile
// ============================================================================

describe('handleGetFile', () => {
  it('should return 401 when no user is authenticated', async () => {
    const request = createMockRequest(undefined, { id: 'file-123' });
    const result = await handleGetFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 401, body: { message: 'Unauthorized' } });
  });

  it('should return 400 when file ID is empty', async () => {
    const request = createMockRequest(testUser, {});
    const result = await handleGetFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 400, body: { message: 'File ID is required' } });
  });

  it('should return 200 with file metadata', async () => {
    mockGetFileMetadata.mockResolvedValue(testFileMetadata);

    const request = createMockRequest(testUser, { id: 'file-123' });
    const result = await handleGetFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 200, body: { file: testFileMetadata } });
    expect(mockGetFileMetadata).toHaveBeenCalledOnce();
  });

  it('should return 404 when file not found', async () => {
    const error = new Error('File not found');
    error.name = 'NotFoundError';
    mockGetFileMetadata.mockRejectedValue(error);

    const request = createMockRequest(testUser, { id: 'nonexistent' });
    const result = await handleGetFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 404, body: { message: 'File not found' } });
  });

  it('should return 403 when user lacks permission', async () => {
    const error = new Error('Forbidden');
    error.name = 'ForbiddenError';
    mockGetFileMetadata.mockRejectedValue(error);

    const request = createMockRequest(testUser, { id: 'file-123' });
    const result = await handleGetFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 403, body: { message: 'Forbidden' } });
  });
});

// ============================================================================
// handleDeleteFile
// ============================================================================

describe('handleDeleteFile', () => {
  it('should return 401 when no user is authenticated', async () => {
    const request = createMockRequest(undefined, { id: 'file-123' });
    const result = await handleDeleteFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 401, body: { message: 'Unauthorized' } });
  });

  it('should return 400 when file ID is empty', async () => {
    const request = createMockRequest(testUser, {});
    const result = await handleDeleteFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 400, body: { message: 'File ID is required' } });
  });

  it('should return 200 on successful deletion', async () => {
    mockDeleteFile.mockResolvedValue(undefined);

    const request = createMockRequest(testUser, { id: 'file-123' });
    const result = await handleDeleteFile(ctx, undefined, request, reply);

    expect(result).toEqual({
      status: 200,
      body: { success: true, message: 'File deleted' },
    });
    expect(mockDeleteFile).toHaveBeenCalledOnce();
  });

  it('should return 404 when file not found', async () => {
    const error = new Error('File not found');
    error.name = 'NotFoundError';
    mockDeleteFile.mockRejectedValue(error);

    const request = createMockRequest(testUser, { id: 'nonexistent' });
    const result = await handleDeleteFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 404, body: { message: 'File not found' } });
  });
});

// ============================================================================
// handleDownloadFile
// ============================================================================

describe('handleDownloadFile', () => {
  it('should return 401 when no user is authenticated', async () => {
    const request = createMockRequest(undefined, { id: 'file-123' });
    const result = await handleDownloadFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 401, body: { message: 'Unauthorized' } });
  });

  it('should return 400 when file ID is empty', async () => {
    const request = createMockRequest(testUser, {});
    const result = await handleDownloadFile(ctx, undefined, request, reply);

    expect(result).toEqual({ status: 400, body: { message: 'File ID is required' } });
  });

  it('should return 200 with download URL', async () => {
    mockGetDownloadUrl.mockResolvedValue('https://signed-url.example.com');

    const request = createMockRequest(testUser, { id: 'file-123' });
    const result = await handleDownloadFile(ctx, undefined, request, reply);

    expect(result).toEqual({
      status: 200,
      body: { url: 'https://signed-url.example.com' },
    });
    expect(mockGetDownloadUrl).toHaveBeenCalledOnce();
  });

  it('should return 500 on unexpected error', async () => {
    mockGetDownloadUrl.mockRejectedValue(new Error('Storage unavailable'));

    const request = createMockRequest(testUser, { id: 'file-123' });
    const result = await handleDownloadFile(ctx, undefined, request, reply);

    expect(result).toEqual({
      status: 500,
      body: { message: 'An error occurred processing your request' },
    });
  });
});
