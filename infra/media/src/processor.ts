// infra/media/src/processor.ts
/**
 * Media Processing Orchestrator
 *
 * Handles job queuing, timeouts, resource limits, and security scanning
 * for media file processing. Delegates to type-specific processors.
 *
 * @module processor
 */

import path from 'path';

import { AudioProcessor } from './processors/audio';
import { ImageProcessor } from './processors/image';
import { VideoProcessor } from './processors/video';
import { BasicSecurityScanner } from './security';

import type { ProcessingResult } from './types';

export { AudioProcessor, ImageProcessor, VideoProcessor };

/**
 * A processing job with metadata for tracking and prioritization
 */
export interface ProcessingJob {
  fileId: string;
  filePath: string;
  filename: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  startTime: number;
}

/**
 * Resource limits for the processing orchestrator
 */
export interface ProcessingLimits {
  /** Maximum processing duration in milliseconds */
  maxDuration: number;
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Maximum concurrent processing jobs */
  maxConcurrentJobs: number;
  /** Allowed file extensions (lowercase) */
  allowedFormats: string[];
}

/**
 * Media processing orchestrator that coordinates type-specific processors
 * with safety limits, timeout protection, and security scanning.
 *
 * - File size validation
 * - Concurrent job limiting
 * - Processing timeout via Promise.race
 * - Security scanning before processing
 * - Format-based routing to image/audio/video processors
 *
 * @example
 * ```typescript
 * const orchestrator = new MediaProcessingOrchestrator(
 *   new ImageProcessor(),
 *   new AudioProcessor(),
 *   new VideoProcessor(),
 *   { maxFileSize: 50 * 1024 * 1024 },
 * );
 * const result = await orchestrator.processFile({
 *   fileId: '123',
 *   filePath: '/tmp/upload.mp4',
 *   filename: 'video.mp4',
 *   priority: 'normal',
 *   retryCount: 0,
 *   startTime: Date.now(),
 * });
 * ```
 */
export class MediaProcessingOrchestrator {
  private activeJobs = new Map<string, ProcessingJob>();
  private queue: ProcessingJob[] = [];
  private readonly limits: ProcessingLimits;
  private securityScanner: BasicSecurityScanner;

  /**
   * Create a media processing orchestrator
   *
   * @param imageProcessor - Image processor instance
   * @param audioProcessor - Audio processor instance
   * @param videoProcessor - Video processor instance
   * @param limits - Processing resource limits (merged with defaults)
   * @param _securityOptions - Reserved for future security configuration
   */
  constructor(
    private imageProcessor: ImageProcessor,
    private audioProcessor: AudioProcessor,
    private videoProcessor: VideoProcessor,
    limits: Partial<ProcessingLimits> = {},
    _securityOptions?: Record<string, unknown>,
  ) {
    this.limits = {
      maxDuration: 5 * 60 * 1000, // 5 minutes
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxConcurrentJobs: 5,
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'wav', 'mp4', 'mov'],
      ...limits,
    };

    this.securityScanner = new BasicSecurityScanner({
      maxFileSize: this.limits.maxFileSize,
      allowedMimeTypes: this.limits.allowedFormats,
    });
  }

  /**
   * Process a file with safety limits and error handling.
   * Validates file size, enforces concurrent job limit, and applies timeout.
   *
   * @param job - The processing job descriptor
   * @returns Processing result with success status and metadata
   */
  async processFile(job: ProcessingJob): Promise<ProcessingResult> {
    // Validate file size
    const stats = await this.getFileStats(job.filePath);
    if (stats.size > this.limits.maxFileSize) {
      return {
        success: false,
        error: `File size ${String(stats.size)} exceeds limit ${String(this.limits.maxFileSize)}`,
      };
    }

    // Check concurrent job limit
    if (this.activeJobs.size >= this.limits.maxConcurrentJobs) {
      return {
        success: false,
        error: 'Too many concurrent processing jobs',
      };
    }

    // Start processing with timeout using Promise.race
    let timeoutId: NodeJS.Timeout | undefined;
    const processingPromise = this.processFileInternal(job);
    const timeoutPromise = new Promise<ProcessingResult>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `Processing timeout after ${String(this.limits.maxDuration)}ms`,
        });
      }, this.limits.maxDuration);
    });

    try {
      return await Promise.race([processingPromise, timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Internal processing with active job tracking
   *
   * @param job - The processing job
   * @returns Processing result
   */
  private async processFileInternal(job: ProcessingJob): Promise<ProcessingResult> {
    this.activeJobs.set(job.fileId, job);

    try {
      return await this.processFileOnce(job);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed with retries exhausted',
      };
    } finally {
      this.activeJobs.delete(job.fileId);
    }
  }

  /**
   * Process a single file: security scan, format detection, then delegate to
   * the appropriate type-specific processor.
   *
   * @param job - The processing job
   * @returns Processing result
   */
  private async processFileOnce(job: ProcessingJob): Promise<ProcessingResult> {
    // Security scan first
    const securityResult = await this.securityScanner.scanFile(job.filePath);

    if (!securityResult.safe) {
      return {
        success: false,
        error: `Security scan failed: ${securityResult.threats.join(', ')}`,
      };
    }

    const ext = this.getFileExtension(job.filename).toLowerCase();

    if (!this.limits.allowedFormats.includes(ext)) {
      return {
        success: false,
        error: `Unsupported file format: ${ext}`,
      };
    }

    // Route to type-specific processor based on file extension
    let result: ProcessingResult;

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff', 'bmp'].includes(ext)) {
      const outputPath = `${this.getBasePath(job)}_processed.${ext}`;
      result = await this.imageProcessor.process(job.filePath, outputPath);
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
      const outputPath = `${this.getBasePath(job)}_processed.${ext}`;
      result = await this.audioProcessor.process(job.filePath, outputPath);
    } else if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) {
      const outputPath = `${this.getBasePath(job)}_processed.${ext}`;
      result = await this.videoProcessor.process(job.filePath, outputPath);
    } else {
      return {
        success: false,
        error: `No processor available for format: ${ext}`,
      };
    }

    return result;
  }

  /**
   * Get file statistics (size) via fs.stat
   *
   * @param filePath - Path to the file
   * @returns Object with file size in bytes
   * @throws Error if file cannot be accessed
   */
  private async getFileStats(filePath: string): Promise<{ size: number }> {
    const fsModule = await import('fs/promises');
    const stats = await fsModule.stat(filePath);
    return { size: stats.size };
  }

  /**
   * Extract file extension from filename
   *
   * @param filename - The filename to extract extension from
   * @returns The extension without dot, or empty string if none
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop() ?? '';
  }

  /**
   * Generate base path for processed file variants
   *
   * @param job - The processing job
   * @returns Base path (directory + basename without extension)
   */
  private getBasePath(job: ProcessingJob): string {
    const dir = path.dirname(job.filePath);
    const ext = path.extname(job.filename);
    const basename = path.basename(job.filename, ext);
    return path.join(dir, basename);
  }

  /**
   * Get processing statistics including active jobs, queue depth, and limits
   *
   * @returns Processing statistics
   */
  getStats(): {
    activeJobs: number;
    queuedJobs: number;
    limits: ProcessingLimits;
  } {
    return {
      activeJobs: this.activeJobs.size,
      queuedJobs: this.queue.length,
      limits: this.limits,
    };
  }

  /**
   * Clean up resources: cancel all active jobs and clear the queue
   */
  cleanup(): void {
    for (const [fileId] of this.activeJobs) {
      this.activeJobs.delete(fileId);
    }

    this.queue.length = 0;
  }
}
