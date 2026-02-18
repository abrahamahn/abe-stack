// main/shared/src/system/media/index.ts

export {
  detectFileType,
  detectFileTypeFromPath,
  generateFileId,
  getMimeType,
  isAllowedFileType,
  parseAudioMetadataFromBuffer,
  sanitizeFilename,
  validateUploadConfig,
  type AudioMetadata,
  type AudioProcessingOptions,
  type ContentModerationResult,
  type FileTypeResult,
  type ImageProcessingOptions,
  type MediaMetadata,
  type MediaProcessingOptions,
  type ProcessingResult,
  type SecurityScanResult,
  type UploadConfig,
  type VideoProcessingOptions,
} from './media';
