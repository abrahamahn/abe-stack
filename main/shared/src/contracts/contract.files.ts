// main/shared/src/contracts/contract.files.ts
/**
 * Files Contracts
 *
 * API contract definitions for file upload and management.
 * Actual multipart parsing happens server-side before schema validation.
 * @module Contracts/Files
 */

import {
  fileDeleteResponseSchema,
  fileRecordSchema,
  filesListResponseSchema,
  fileUploadResponseSchema,
} from '../engine/files';
import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../engine/http';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const filesContract = {
  upload: {
    method: 'POST' as const,
    path: '/api/files',
    body: emptyBodySchema,
    responses: {
      201: successResponseSchema(fileUploadResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      413: errorResponseSchema,
    },
    summary: 'Upload a file (multipart form data)',
  },

  list: {
    method: 'GET' as const,
    path: '/api/files',
    responses: {
      200: successResponseSchema(filesListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List uploaded files',
  },

  get: {
    method: 'GET' as const,
    path: '/api/files/:id',
    responses: {
      200: successResponseSchema(fileRecordSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get file metadata by ID',
  },

  delete: {
    method: 'DELETE' as const,
    path: '/api/files/:id',
    responses: {
      200: successResponseSchema(fileDeleteResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Delete a file',
  },
} satisfies Contract;
