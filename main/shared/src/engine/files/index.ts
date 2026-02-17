// main/shared/src/domain/files/index.ts

export {
  createFileRecordSchema,
  fileUploadRequestSchema,
  FILE_PURPOSES,
  filePurposeSchema,
  fileRecordSchema,
  STORAGE_PROVIDERS,
  storageProviderSchema,
  updateFileRecordSchema,
  type CreateFileRecord,
  type FilePurpose,
  type FileRecord,
  type FileUploadRequest,
  type StorageProvider,
  type UpdateFileRecord,
} from './files.schemas';

export {
  ALLOWED_IMAGE_TYPES,
  generateUniqueFilename,
  joinStoragePath,
  MAX_IMAGE_SIZE,
  MAX_LOGO_SIZE,
  normalizeStoragePath,
  validateFileType,
} from './storage';
