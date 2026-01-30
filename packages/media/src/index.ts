// packages/media/src/index.ts
/**
 * @abe-stack/media
 *
 * Media Processing (Server-only)
 * Audio, video, and image processing utilities using FFmpeg.
 * Security scanning for uploaded files.
 * Job queue and retry handling for background processing.
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
export { getImageFormat, optimizeImage, resizeImage, validateImage } from './image-processing';
export type {
  ImageFormatOptions,
  ImageResizeOptions,
  ImageValidationOptions,
  ValidationResult,
} from './image-processing';

// Security scanning
export { BasicSecurityScanner } from './security';

// Media types (shared type definitions)
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
} from './types';

// Validation
export {
  generateFileId,
  sanitizeFilename,
  validateMediaFile,
  validateUploadConfig,
} from './validation';

// Processors (audio, image, video)
export { AudioProcessor } from './processors/audio';
export { ImageProcessor } from './processors/image';
export { VideoProcessor } from './processors/video';

// Queue (job queue, retry handling)
export { CustomJobQueue, type JobData, type QueueOptions } from './queue/queue';
export {
  MediaProcessingQueue,
  createMediaProcessingQueue,
  type MediaJobData,
  type MediaJobResult,
} from './queue/jobs';
export {
  MediaProcessingRetryHandler,
  createMediaRetryHandler,
  type RetryOptions,
  type RetryState,
} from './queue/retry';

// Utils (streaming)
export { StreamingMediaProcessor, type StreamingOptions } from './utils/streaming';

// Orchestrator
export {
  MediaProcessingOrchestrator,
  type ProcessingJob,
  type ProcessingLimits,
} from './processor';

// Database
export {
  InMemoryMediaDatabase,
  type MediaDatabaseAdapter,
  type MediaProcessingRecord,
  type ProcessingStats,
} from './database';

// Facade (main entry point)
export {
  createServerMediaQueue,
  ServerMediaQueue,
  type MediaJobData as ServerMediaJobData,
} from './facade';
