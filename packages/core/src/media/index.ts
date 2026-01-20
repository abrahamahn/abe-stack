// packages/core/src/media/index.ts
/**
 * Core Media Processing Utilities
 *
 * Shared media processing utilities for client and server.
 * No external dependencies - manual implementations only.
 */

// Types (excluding ProcessingResult to avoid conflict with image-processing)
export type {
  FileTypeResult,
  MediaMetadata,
  SecurityScanResult,
  MediaProcessingOptions,
  UploadConfig,
} from './types';
// Re-export ProcessingResult from types as MediaProcessingResult for disambiguation
export type { ProcessingResult as MediaProcessingResult } from './types';

// File type detection
export {
  detectFileType,
  detectFileTypeFromPath,
  detectFileTypeFromFile,
  isAllowedFileType,
} from './file-type';

// Security scanning
export { BasicSecurityScanner } from './security';

// Validation
export {
  validateMediaFile,
  validateUploadConfig,
  sanitizeFilename,
  generateFileId,
} from './validation';

// Audio metadata
export { parseAudioMetadata } from './audio-metadata';
export type { AudioMetadata } from './audio-metadata';

// FFmpeg wrapper
export {
  runFFmpeg,
  getMediaMetadata,
  convertVideo,
  extractAudio,
  generateThumbnail,
  createHLSStream,
  generateWaveform,
  extractAudioSegment,
  checkFFmpeg,
} from './ffmpeg-wrapper';
export type { FFmpegOptions, FFmpegResult } from './ffmpeg-wrapper';

// Image processing (ProcessingResult comes from here)
export { ImageProcessor, createImageProcessor, getImageFormat } from './image-processing';
export type {
  ImageResizeOptions,
  ImageFormatOptions,
  ImageProcessingOptions,
  ImageMetadata,
  ProcessingResult,
} from './image-processing';
