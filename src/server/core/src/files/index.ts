// src/server/core/src/files/index.ts
/**
 * Files Module
 *
 * File storage service, HTTP handlers, route definitions, and types
 * for managing file uploads, metadata, and downloads.
 */

// Service
export { uploadFile, getFileMetadata, deleteFile, getDownloadUrl } from './service';

// Handlers
export { handleUploadFile, handleGetFile, handleDeleteFile, handleDownloadFile } from './handlers';

// Routes
export { fileRoutes } from './routes';

// Types
export type {
  FileAppContext,
  FileMetadata,
  FileRequest,
  FileStorageProvider,
  FileUploadOptions,
} from './types';
export { DEFAULT_ALLOWED_MIME_TYPES, DEFAULT_MAX_FILE_SIZE } from './types';
