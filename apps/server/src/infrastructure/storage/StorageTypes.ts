// StorageTypes.ts
import { ReadStream } from "fs";
import { Stream } from "stream";

/**
 * File metadata
 */
export interface FileMetadata {
  /**
   * Content type
   */
  contentType: string;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Last modified date
   */
  lastModified: Date;

  /**
   * Entity tag for caching
   */
  etag?: string;

  /**
   * Media dimensions (for images and videos)
   */
  dimensions?: {
    width: number;
    height: number;
  };

  /**
   * Duration in seconds (for audio and video)
   */
  duration?: number;

  /**
   * Custom metadata
   */
  custom?: Record<string, string>;
}

/**
 * File save options
 */
export interface StorageSaveOptions {
  /**
   * Content type override
   */
  contentType?: string;

  /**
   * Whether to overwrite existing file
   */
  overwrite?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, string>;

  /**
   * Stream options
   */
  stream?: StreamOptions;

  /**
   * Width for image/video processing
   */
  width?: number;

  /**
   * Height for image/video processing
   */
  height?: number;

  /**
   * Quality for image/video processing (1-100)
   */
  quality?: number;

  /**
   * Output format for media processing
   */
  format?: string;
}

/**
 * Stream options
 */
export interface StreamOptions {
  /**
   * Start byte position
   */
  start?: number;

  /**
   * End byte position
   */
  end?: number;

  /**
   * Buffer size in bytes
   */
  bufferSize?: number;

  /**
   * High water mark for stream
   */
  highWaterMark?: number;
}

/**
 * Result of a file save operation
 */
export interface FileSaveResult {
  /**
   * File path
   */
  path: string;

  /**
   * URL to access the file
   */
  url: string;

  /**
   * File metadata
   */
  metadata: FileMetadata;

  /**
   * Processing information (optional)
   */
  processing?: {
    originalSize?: number;
    processedSize?: number;
    transformations?: string[];
    thumbnail?: string;
  };
}

/**
 * Type for file data input
 */
export type FileData = Buffer | ReadStream | Stream;

/**
 * Type for file data output
 */
export type FileOutput = Buffer | ReadStream;
