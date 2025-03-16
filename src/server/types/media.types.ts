/**
 * Media types supported by the application
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

/**
 * Processing status for media files
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Image size interface
 */
export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Image metadata interface
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  fileSize: number;
  mimeType: string;
  hasAlpha?: boolean;
  colorSpace?: string;
}

/**
 * Video metadata interface
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  format: string;
  fileSize: number;
  mimeType: string;
  bitrate: number;
  fps?: number;
  codec?: string;
}

/**
 * Audio metadata interface
 */
export interface AudioMetadata {
  duration: number;
  format: string;
  fileSize: number;
  mimeType: string;
  bitrate: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
}

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  format: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  title?: string;
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
} 