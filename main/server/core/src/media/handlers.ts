// main/server/core/src/media/handlers.ts
/**
 * Media Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Framework-agnostic: uses narrow interfaces from types.ts.
 */

import { HTTP_STATUS } from '@abe-stack/shared';

import { deleteMedia, getMediaMetadata, getProcessingStatus, uploadMedia } from './service';

import type {
  MediaAppContext,
  MediaMetadataResponse,
  MediaRequest,
  MediaUploadInput,
  MediaUploadResult,
  ProcessingStatusResponse,
} from './types';

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Map media errors to appropriate HTTP status codes.
 *
 * @param error - The caught error
 * @param ctx - Application context for logging
 * @returns HTTP status and error message
 * @complexity O(1)
 */
function handleError(
  error: unknown,
  ctx: MediaAppContext,
): { status: 400 | 404 | 500; body: { message: string } } {
  if (error instanceof Error) {
    if (error.name === 'NotFoundError') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: error.message } };
    }
    if (error.name === 'BadRequestError') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: error.message } };
    }
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    body: { message: 'An error occurred processing your request' },
  };
}

// ============================================================================
// Upload Handler
// ============================================================================

/**
 * Handle media file upload.
 *
 * @param ctx - Application context with storage, repos, and optional queue
 * @param body - Parsed multipart file data
 * @param request - HTTP request with authenticated user
 * @returns 201 with upload result, or error response
 * @complexity O(1) - validation, upload, DB insert
 */
export async function handleUploadMedia(
  ctx: MediaAppContext,
  body: unknown,
  request: MediaRequest,
): Promise<
  | { status: 201; body: MediaUploadResult }
  | { status: 400 | 401 | 404 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const file = body as MediaUploadInput;

    const result = await uploadMedia(
      ctx.storage,
      { files: ctx.repos.files },
      ctx.mediaQueue,
      user.userId,
      file,
    );

    return {
      status: HTTP_STATUS.CREATED,
      body: result,
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// Get Media Handler
// ============================================================================

/**
 * Handle get media metadata request.
 *
 * @param ctx - Application context with storage and repos
 * @param _body - Unused (GET request)
 * @param request - HTTP request with authenticated user and params
 * @returns 200 with media metadata, or error response
 * @complexity O(1) - DB lookup + signed URL
 */
export async function handleGetMedia(
  ctx: MediaAppContext,
  _body: unknown,
  request: MediaRequest,
): Promise<
  | { status: 200; body: MediaMetadataResponse }
  | { status: 400 | 401 | 404 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const mediaId = (request as MediaRequest & { params?: { id?: string } }).params?.id ?? '';
    if (mediaId === '') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'Media ID is required' } };
    }

    const metadata = await getMediaMetadata(
      ctx.storage,
      { files: ctx.repos.files },
      mediaId,
      user.userId,
    );

    return {
      status: HTTP_STATUS.OK,
      body: metadata,
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// Delete Media Handler
// ============================================================================

/**
 * Handle delete media request.
 *
 * @param ctx - Application context with storage and repos
 * @param _body - Unused (DELETE request)
 * @param request - HTTP request with authenticated user and params
 * @returns 200 with success message, or error response
 * @complexity O(1) - DB lookup, storage delete, DB delete
 */
export async function handleDeleteMedia(
  ctx: MediaAppContext,
  _body: unknown,
  request: MediaRequest,
): Promise<
  | { status: 200; body: { success: boolean; message: string } }
  | { status: 400 | 401 | 404 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const mediaId = (request as MediaRequest & { params?: { id?: string } }).params?.id ?? '';
    if (mediaId === '') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'Media ID is required' } };
    }

    await deleteMedia(ctx.storage, { files: ctx.repos.files }, mediaId, user.userId);

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        message: 'Media file deleted',
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// Get Media Status Handler
// ============================================================================

/**
 * Handle get media processing status request.
 *
 * @param ctx - Application context with repos
 * @param _body - Unused (GET request)
 * @param request - HTTP request with authenticated user and params
 * @returns 200 with processing status, or error response
 * @complexity O(1) - single DB lookup
 */
export async function handleGetMediaStatus(
  ctx: MediaAppContext,
  _body: unknown,
  request: MediaRequest,
): Promise<
  | { status: 200; body: ProcessingStatusResponse }
  | { status: 400 | 401 | 404 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const mediaId = (request as MediaRequest & { params?: { id?: string } }).params?.id ?? '';
    if (mediaId === '') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'Media ID is required' } };
    }

    const status = await getProcessingStatus({ files: ctx.repos.files }, mediaId, user.userId);

    return {
      status: HTTP_STATUS.OK,
      body: status,
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
