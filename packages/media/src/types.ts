// packages/media/src/types.ts
/**
 * Core Media Processing Types
 *
 * Shared type definitions for media processing across the application.
 */

export interface FileTypeResult {
  ext: string;
  mime: string;
}

export interface MediaMetadata {
  fileSize: number;
  mimeType?: string;
  extension?: string;
  checksum?: string;
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  codec?: string;
}

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

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  metadata?: MediaMetadata;
  error?: string;
}

export interface MediaProcessingOptions {
  maxFileSize: number;
  allowedTypes: string[];
  extractMetadata: boolean;
}

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  chunkSize: number;
  timeout: number;
}
