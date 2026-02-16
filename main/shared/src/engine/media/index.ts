// main/shared/src/domain/media/index.ts

// Types
export type {
  AudioProcessingOptions,
  ContentModerationResult,
  FileTypeResult,
  ImageProcessingOptions,
  MediaMetadata,
  MediaProcessingOptions,
  ProcessingResult,
  SecurityScanResult,
  UploadConfig,
  VideoProcessingOptions,
} from './media.types';

// Constants
export {
  ALL_MEDIA_EXTENSIONS,
  ALLOWED_MEDIA_MIME_TYPES,
  AUDIO_EXTENSIONS,
  EXT_TO_MIME,
  IMAGE_EXTENSIONS,
  MAX_CHUNK_SIZE,
  MAX_FILENAME_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
  MAX_UPLOAD_TIMEOUT_MS,
  MIME_TO_EXT,
  VIDEO_EXTENSIONS,
} from './media.constants';

// File type detection (pure, buffer/path based)
export { detectFileType, detectFileTypeFromPath, isAllowedFileType } from './media.file-type';

// Audio metadata (pure, buffer based)
export { parseAudioMetadataFromBuffer, type AudioMetadata } from './media.audio-metadata';

// Validation (pure)
export { generateFileId, sanitizeFilename, validateUploadConfig } from './media.validation';
