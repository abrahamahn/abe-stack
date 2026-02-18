// main/server/core/src/files/handlers.ts
/**
 * Files Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Uses narrow context interfaces from types.ts for decoupling.
 */

import { HTTP_STATUS } from '@bslt/shared';

import { deleteFile, getDownloadUrl, getFileMetadata, uploadFile } from './service';

import type { FileAppContext, FileMetadata, FileStorageProvider } from './types';
import type { HandlerContext } from '../../../system/src';
import type { AuthenticatedUser } from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Narrow HandlerContext to FileAppContext.
 * The server composition root ensures the context implements FileAppContext.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed FileAppContext
 * @complexity O(1)
 */
function asAppContext(ctx: HandlerContext): FileAppContext {
  return ctx as unknown as FileAppContext;
}

/**
 * Extract authenticated user from a Fastify request.
 *
 * @param request - Fastify request with user set by auth middleware
 * @returns Authenticated user or undefined
 * @complexity O(1)
 */
function getUser(request: FastifyRequest): AuthenticatedUser | undefined {
  return (request as FastifyRequest & { user?: AuthenticatedUser }).user;
}

/**
 * Map domain errors to HTTP status codes.
 *
 * @param error - The caught error
 * @param appCtx - Application context for logging
 * @returns Object with HTTP status and error message body
 * @complexity O(1)
 */
function handleError(
  error: unknown,
  appCtx: FileAppContext,
): { status: 400 | 403 | 404 | 500; body: { message: string } } {
  if (error instanceof Error) {
    if (error.name === 'BadRequestError') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: error.message } };
    }
    if (error.name === 'ForbiddenError') {
      return { status: HTTP_STATUS.FORBIDDEN, body: { message: error.message } };
    }
    if (error.name === 'NotFoundError') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: error.message } };
    }
  }

  appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    body: { message: 'An error occurred processing your request' },
  };
}

// ============================================================================
// Upload Handler
// ============================================================================

/**
 * Handle file upload.
 *
 * Expects multipart form data with a `file` field.
 * The Fastify request body must be pre-parsed by multipart plugin.
 *
 * POST /api/files/upload
 *
 * @param ctx - Handler context narrowed to FileAppContext
 * @param body - Parsed multipart body
 * @param request - Fastify request with authenticated user
 * @param _reply - Fastify reply (unused)
 * @returns 201 with file metadata, or error response
 * @complexity O(1) - single upload + database insert
 */
export async function handleUploadFile(
  ctx: HandlerContext,
  body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 201; body: { file: FileMetadata } }
  | { status: 400 | 401 | 403 | 404 | 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    // Extract file data from parsed body
    const fileData = body as
      | {
          buffer?: Buffer | Uint8Array;
          mimetype?: string;
          originalName?: string;
          filename?: string;
          size?: number;
        }
      | null
      | undefined;

    if (fileData?.buffer === undefined || fileData.mimetype === undefined) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'No file provided' } };
    }

    const storage = appCtx.storage as FileStorageProvider;
    const result = await uploadFile(storage, { files: appCtx.repos.files }, user.userId, {
      buffer: fileData.buffer,
      mimetype: fileData.mimetype,
      originalName: fileData.originalName ?? fileData.filename ?? 'unknown',
      size: fileData.size ?? fileData.buffer.length,
    });

    return { status: HTTP_STATUS.CREATED, body: { file: result } };
  } catch (error: unknown) {
    return handleError(error, appCtx);
  }
}

// ============================================================================
// Get File Handler
// ============================================================================

/**
 * Get file metadata and download URL.
 *
 * GET /api/files/:id
 *
 * @param ctx - Handler context narrowed to FileAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user and :id param
 * @param _reply - Fastify reply (unused)
 * @returns 200 with file metadata, or error response
 * @complexity O(1) - single database lookup
 */
export async function handleGetFile(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { file: FileMetadata } }
  | { status: 400 | 401 | 403 | 404 | 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  const params = request.params as { id?: string };
  const fileId = params.id ?? '';

  if (fileId === '') {
    return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'File ID is required' } };
  }

  try {
    const storage = appCtx.storage as FileStorageProvider;
    const result = await getFileMetadata(
      storage,
      { files: appCtx.repos.files },
      fileId,
      user.userId,
      user.role,
    );

    return { status: HTTP_STATUS.OK, body: { file: result } };
  } catch (error: unknown) {
    return handleError(error, appCtx);
  }
}

// ============================================================================
// Delete File Handler
// ============================================================================

/**
 * Delete a file from storage and database.
 *
 * DELETE /api/files/:id
 *
 * @param ctx - Handler context narrowed to FileAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user and :id param
 * @param _reply - Fastify reply (unused)
 * @returns 200 with success message, or error response
 * @complexity O(1) - lookup + storage delete + DB delete
 */
export async function handleDeleteFile(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { success: true; message: string } }
  | { status: 400 | 401 | 403 | 404 | 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  const params = request.params as { id?: string };
  const fileId = params.id ?? '';

  if (fileId === '') {
    return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'File ID is required' } };
  }

  try {
    const storage = appCtx.storage as FileStorageProvider;
    await deleteFile(storage, { files: appCtx.repos.files }, fileId, user.userId, user.role);

    return { status: HTTP_STATUS.OK, body: { success: true, message: 'File deleted' } };
  } catch (error: unknown) {
    return handleError(error, appCtx);
  }
}

// ============================================================================
// Download File Handler
// ============================================================================

/**
 * Get a download URL for a file (redirect to presigned URL).
 *
 * GET /api/files/:id/download
 *
 * @param ctx - Handler context narrowed to FileAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user and :id param
 * @param _reply - Fastify reply (unused)
 * @returns 200 with download URL, or error response
 * @complexity O(1) - single DB lookup + URL generation
 */
export async function handleDownloadFile(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { url: string } }
  | { status: 400 | 401 | 403 | 404 | 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  const params = request.params as { id?: string };
  const fileId = params.id ?? '';

  if (fileId === '') {
    return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'File ID is required' } };
  }

  try {
    const storage = appCtx.storage as FileStorageProvider;
    const url = await getDownloadUrl(
      storage,
      { files: appCtx.repos.files },
      fileId,
      user.userId,
      user.role,
    );

    return { status: HTTP_STATUS.OK, body: { url } };
  } catch (error: unknown) {
    return handleError(error, appCtx);
  }
}
