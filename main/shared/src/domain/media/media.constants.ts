// main/shared/src/domain/media/media.constants.ts
/**
 * Media Constants
 *
 * Framework-agnostic constants for media processing.
 * MIME type mappings, extension categories, and filename limits.
 *
 * @module Domain/Media/Constants
 */

/** Maximum filename length in characters */
export const MAX_FILENAME_LENGTH = 255;

// --- Extension categories ---

export const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'tiff',
  'bmp',
] as const;
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;
export const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'] as const;
export const ALL_MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
] as const;

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

// --- Upload limits ---

/** Maximum upload config file size (1GB) */
export const MAX_UPLOAD_FILE_SIZE = 1000 * 1024 * 1024;

/** Maximum upload config chunk size (10MB) */
export const MAX_CHUNK_SIZE = 10 * 1024 * 1024;

/** Maximum upload config timeout (1 hour) */
export const MAX_UPLOAD_TIMEOUT_MS = 60 * 60 * 1000;

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
