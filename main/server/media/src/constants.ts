// main/server/media/src/constants.ts
/**
 * Consolidated constants for the media package.
 *
 * Server-specific constants (size limits, timeouts, queue defaults, image
 * processing defaults) are defined here. Framework-agnostic constants
 * (MIME mappings, extension categories) are re-exported from @abe-stack/shared.
 */

import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from '@abe-stack/shared';

// Re-export framework-agnostic constants from shared
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
} from '@abe-stack/shared';

// --- Size limits ---

/** Default maximum file size for media processing (100MB) */
export const DEFAULT_MAX_MEDIA_FILE_SIZE = 100 * 1024 * 1024;

/** Maximum audio file size for full-buffer metadata parsing (200MB) */
export const MAX_AUDIO_FILE_SIZE = 200 * 1024 * 1024;

/** Maximum buffer size for FFmpeg stdout/stderr accumulation (10MB) */
export const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

/** File size threshold above which streaming should be used (10MB) */
export const STREAMING_THRESHOLD = 10 * 1024 * 1024;

/** Maximum allowed dimension (width or height) for image/video processing */
export const MAX_DIMENSION = 65_536;

// --- Timeouts ---

/** Default processing timeout (5 minutes) */
export const DEFAULT_PROCESSING_TIMEOUT_MS = 5 * MS_PER_MINUTE;

/** FFprobe metadata extraction timeout (30 seconds) */
export const FFPROBE_TIMEOUT_MS = 30 * MS_PER_SECOND;

/** Maximum age for temp files before cleanup (24 hours) */
export const TEMP_FILE_MAX_AGE_MS = MS_PER_DAY;

/** Retention time for completed/failed jobs (1 hour) */
export const JOB_RETENTION_MS = MS_PER_HOUR;

/** Interval between cleanup runs for stale jobs/retry states (5 minutes) */
export const CLEANUP_INTERVAL_MS = 5 * MS_PER_MINUTE;

// --- Queue/retry defaults ---

/** Default number of concurrent processing jobs */
export const DEFAULT_CONCURRENCY = 3;

/** Default maximum retry attempts */
export const DEFAULT_MAX_RETRIES = 3;

/** Default base delay between retries in milliseconds */
export const DEFAULT_RETRY_DELAY_MS = 1000;

// --- Image processing defaults ---

/** Default JPEG/WebP quality (0-100) */
export const DEFAULT_IMAGE_QUALITY = 85;

/** Default PNG compression level (0-9) */
export const DEFAULT_PNG_COMPRESSION = 6;

/** Default thumbnail dimension in pixels */
export const DEFAULT_THUMBNAIL_SIZE = 300;
