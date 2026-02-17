// main/shared/src/engine/media/index.ts

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

// File type detection (pure, buffer/path based)
export { detectFileType, detectFileTypeFromPath, isAllowedFileType } from './media.file-type';

// Audio metadata (pure, buffer based)
export { parseAudioMetadataFromBuffer, type AudioMetadata } from './media.audio-metadata';

// Validation (pure)
export { generateFileId, sanitizeFilename, validateUploadConfig } from './media.validation';
