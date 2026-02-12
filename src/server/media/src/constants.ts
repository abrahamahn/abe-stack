// src/server/media/src/constants.ts
/**
 * Consolidated constants for the media package.
 *
 * Single source of truth for size limits, timeouts, queue defaults,
 * image processing defaults, extension categories, and MIME type mappings.
 */

import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from '@abe-stack/shared';

// --- Size limits ---

/** Default maximum file size for media processing (100MB) */
export const DEFAULT_MAX_MEDIA_FILE_SIZE = 100 * 1024 * 1024;

/** Maximum audio file size for full-buffer metadata parsing (200MB) */
export const MAX_AUDIO_FILE_SIZE = 200 * 1024 * 1024;

/** Maximum buffer size for FFmpeg stdout/stderr accumulation (10MB) */
export const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

/** File size threshold above which streaming should be used (10MB) */
export const STREAMING_THRESHOLD = 10 * 1024 * 1024;

/** Maximum filename length in characters */
export const MAX_FILENAME_LENGTH = 255;

/** Maximum allowed dimension (width or height) for image/video processing */
export const MAX_DIMENSION = 65_536;

/** Maximum upload config file size (1GB) */
export const MAX_UPLOAD_FILE_SIZE = 1000 * 1024 * 1024;

/** Maximum upload config chunk size (10MB) */
export const MAX_CHUNK_SIZE = 10 * 1024 * 1024;

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

/** Maximum upload config timeout (1 hour) */
export const MAX_UPLOAD_TIMEOUT_MS = MS_PER_HOUR;

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

// --- Extension categories ---

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff', 'bmp'] as const;
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;
export const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'] as const;
export const ALL_MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS] as const;

// --- MIME type mappings (single source of truth) ---

/** Extension to MIME type mapping */
export const EXT_TO_MIME: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  // Video
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  flv: 'video/x-flv',
  wmv: 'video/x-ms-wmv',
  // Documents
  pdf: 'application/pdf',
  txt: 'text/plain',
  json: 'application/json',
};

/** MIME type to extension mapping (inverse of EXT_TO_MIME, canonical extension per MIME) */
export const MIME_TO_EXT: Record<string, string> = Object.fromEntries([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/tiff', 'tiff'],
  ['image/bmp', 'bmp'],
  ['audio/mpeg', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/flac', 'flac'],
  ['audio/aac', 'aac'],
  ['audio/ogg', 'ogg'],
  ['audio/mp4', 'm4a'],
  ['video/mp4', 'mp4'],
  ['video/x-msvideo', 'avi'],
  ['video/quicktime', 'mov'],
  ['video/x-matroska', 'mkv'],
  ['video/webm', 'webm'],
  ['video/x-flv', 'flv'],
  ['video/x-ms-wmv', 'wmv'],
  ['application/pdf', 'pdf'],
  ['text/plain', 'txt'],
  ['application/json', 'json'],
]) as Record<string, string>;

/** Allowed MIME types for media uploads */
export const ALLOWED_MEDIA_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
] as const;
