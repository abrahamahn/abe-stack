// apps/server/src/infrastructure/media/index.ts
/**
 * Media Layer
 *
 * Media processing infrastructure:
 * - processors/: File type processors (audio, image, video)
 * - queue/: Job queue and retry handling
 * - utils/: File detection, security, streaming
 * - processor: Media processing orchestrator
 * - facade: Main media service facade
 */

// Types
export type {
  AudioProcessingOptions,
  ImageProcessingOptions,
  MediaMetadata,
  ProcessingResult,
  VideoProcessingOptions,
} from './types';

// Processors (audio, image, video)
export { AudioProcessor, ImageProcessor, VideoProcessor } from './processors';

// Queue (job queue, retry handling)
export {
  createMediaProcessingQueue,
  createMediaRetryHandler,
  CustomJobQueue,
  MediaProcessingQueue,
  MediaProcessingRetryHandler,
  type JobData,
  type MediaJobResult,
  type QueueOptions,
  type RetryOptions,
  type RetryState,
} from './queue';

// Utils (file detection, security, streaming)
export {
  detectFileType,
  detectFileTypeFromFile,
  detectFileTypeFromPath,
  getExtensionFromMime,
  isAllowedFileType,
  MediaSecurityScanner,
  StreamingMediaProcessor,
  type ContentModerationResult,
  type FileTypeResult,
  type SecurityScanResult,
  type StreamingOptions,
} from './utils';

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
export { createServerMediaQueue, ServerMediaQueue, type MediaJobData } from './facade';
