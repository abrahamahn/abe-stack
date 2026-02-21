// main/server/media/src/types.ts
/**
 * Core Media Processing Types
 *
 * Re-exports framework-agnostic type definitions from @bslt/shared.
 * Server-specific types can be added here as needed.
 */

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
} from '@bslt/shared';
