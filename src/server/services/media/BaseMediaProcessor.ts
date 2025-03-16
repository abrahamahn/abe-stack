import crypto from 'crypto';
import { promises as fsPromises } from 'fs';
import path from 'path';

import { MediaType, ProcessingStatus } from '../../types/media.types';
import { Logger } from '../LoggerService';

/**
 * Common metadata interface for all media types
 */
export interface BaseMediaMetadata {
  fileSize: number;
  mimeType: string;
  format: string;
  duration?: number;
}

/**
 * Base result interface for all media processing operations
 */
export interface BaseProcessingResult {
  mediaId: string;
  paths: Record<string, string>;
  metadata: BaseMediaMetadata;
  status: ProcessingStatus;
}

/**
 * Base abstract class for all media processors
 */
export abstract class BaseMediaProcessor {
  protected logger: Logger;
  protected uploadDir: string;
  
  constructor(uploadDir: string, loggerName: string) {
    this.uploadDir = uploadDir;
    this.logger = new Logger(loggerName);
    
    // Ensure upload directory exists
    void this.ensureDirectoryExists(uploadDir);
  }
  
  /**
   * Generate a unique file ID
   */
  protected generateFileId(): string {
    return crypto.randomUUID();
  }
  
  /**
   * Generate a unique filename with a specific extension
   */
  protected generateFilename(originalName: string, extension?: string): string {
    const fileId = this.generateFileId();
    const ext = extension || path.extname(originalName);
    return `${fileId}${ext}`;
  }
  
  /**
   * Ensure a directory exists
   */
  protected async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fsPromises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create directory: ${dirPath}`, { error });
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }
  
  /**
   * Get file size in bytes
   */
  protected async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fsPromises.stat(filePath);
      return stats.size;
    } catch (error) {
      this.logger.error(`Failed to get file size: ${filePath}`, { error });
      return 0;
    }
  }
  
  /**
   * Delete a file if it exists
   */
  protected async deleteFileIfExists(filePath: string): Promise<void> {
    try {
      await fsPromises.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(`Failed to delete file: ${filePath}`, { error });
      }
    }
  }
  
  /**
   * Abstract method to process a media file
   * @param filePath Path to the original file
   * @param options Processing options
   */
  public abstract process(filePath: string, options?: Record<string, unknown>): Promise<BaseProcessingResult>;
  
  /**
   * Abstract method to get the media type
   */
  public abstract getMediaType(): MediaType;
} 