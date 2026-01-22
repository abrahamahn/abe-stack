// packages/media/src/index.ts
/**
 * @abe-stack/media
 *
 * Media Processing (Server-only)
 * Audio, video, and image processing utilities using FFmpeg.
 * Security scanning for uploaded files.
 */

// Audio metadata
export { parseAudioMetadata } from './audio-metadata';
export type { AudioMetadata } from './audio-metadata';

// FFmpeg wrapper
export {
  checkFFmpeg,
  convertVideo,
  createHLSStream,
  extractAudio,
  extractAudioSegment,
  generateThumbnail,
  generateWaveform,
  getMediaMetadata,
  runFFmpeg,
} from './ffmpeg-wrapper';
export type { FFmpegOptions, FFmpegResult, MediaMetadataResult } from './ffmpeg-wrapper';

// File type detection
export {
  detectFileType,
  detectFileTypeFromFile,
  detectFileTypeFromPath,
  isAllowedFileType,
} from './file-type';

// Image processing
export { createImageProcessor, getImageFormat, ImageProcessor } from './image-processing';
export type {
  ImageFormatOptions,
  ImageMetadata,
  ImageProcessingOptions,
  ImageResizeOptions,
} from './image-processing';

// Security scanning
export { BasicSecurityScanner } from './security';

// Media types (shared type definitions)
export type {
  FileTypeResult,
  MediaMetadata,
  MediaProcessingOptions,
  ProcessingResult,
  SecurityScanResult,
  UploadConfig,
} from './types';

// Validation
export {
  generateFileId,
  sanitizeFilename,
  validateMediaFile,
  validateUploadConfig,
} from './validation';
