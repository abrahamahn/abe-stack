// apps/server/src/infra/media/types.ts
/**
 * Media Processing Type Definitions
 *
 * Core types used throughout the media processing infrastructure.
 */

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
 * Metadata extracted from media files
 */
export interface MediaMetadata {
  duration?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  codec?: string;
  format?: string;
  channels?: number;
  sampleRate?: number;
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
