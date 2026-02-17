// main/shared/src/engine/media/media.types.ts
/**
 * Core Media Processing Types
 *
 * Framework-agnostic type definitions for media processing.
 * Used by server, client SDK, and desktop applications.
 *
 * @module Domain/Media/Types
 */

/**
 * Result of file type detection (extension + MIME type)
 */
export interface FileTypeResult {
  ext: string;
  mime: string;
}

/**
 * Metadata extracted from a media file
 */
export interface MediaMetadata {
  fileSize?: number;
  mimeType?: string;
  extension?: string;
  checksum?: string;
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  codec?: string;
  format?: string;
  channels?: number;
  sampleRate?: number;
}

/**
 * Result of a security scan on a media file
 */
export interface SecurityScanResult {
  safe: boolean;
  threats: string[];
  warnings: string[];
  metadata: {
    fileSize: number;
    mimeType?: string;
    hasExif?: boolean;
    dimensions?: { width: number; height: number };
  };
}

/**
 * Result of a media processing operation
 */
export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  thumbnailPath?: string;
  waveformPath?: string;
  metadata?: MediaMetadata;
  error?: string;
}

/**
 * Options for validating media files before processing
 */
export interface MediaProcessingOptions {
  maxFileSize: number;
  allowedTypes: string[];
  extractMetadata: boolean;
}

/**
 * Configuration for file upload handling
 */
export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  chunkSize: number;
  timeout: number;
}

/**
 * Image processing configuration options
 */
export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    withoutEnlargement?: boolean;
  };
  format?: {
    format: 'jpeg' | 'png' | 'webp' | 'avif';
    quality?: number;
    progressive?: boolean;
  };
  thumbnail?: {
    size: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
}

/**
 * Audio processing configuration options
 */
export interface AudioProcessingOptions {
  format?: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg' | 'm4a';
  bitrate?: string;
  channels?: number;
  sampleRate?: number;
  waveform?: {
    width: number;
    height: number;
    color?: string;
  };
}

/**
 * Video processing configuration options
 */
export interface VideoProcessingOptions {
  format?: 'mp4' | 'webm' | 'avi' | 'mov';
  resolution?: {
    width: number;
    height: number;
  };
  bitrate?: string;
  thumbnail?: {
    time?: number;
    size?: number;
  };
}

/**
 * Content moderation result from security scanning
 */
export interface ContentModerationResult {
  approved: boolean;
  categories?: string[];
  confidence?: number;
  reviewRecommended?: boolean;
}
