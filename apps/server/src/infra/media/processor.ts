// apps/server/src/infra/media/processor.ts
/**
 * Media Processing Orchestrator
 *
 * Handles job queuing, timeouts, and resource limits for Series A readiness
 */

import path from 'path';

import { AudioProcessor } from './audio';
import { ImageProcessor } from './image';
import { MediaSecurityScanner } from './security';
import { VideoProcessor } from './video';

import type { ProcessingResult } from './types';

export { ImageProcessor, AudioProcessor, VideoProcessor };

export interface ProcessingJob {
  fileId: string;
  filePath: string;
  filename: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  startTime: number;
}

export interface ProcessingLimits {
  maxDuration: number; // milliseconds
  maxFileSize: number; // bytes
  maxConcurrentJobs: number;
  allowedFormats: string[];
}

export class MediaProcessingOrchestrator {
  private activeJobs = new Map<string, ProcessingJob>();
  private queue: ProcessingJob[] = [];
  private readonly limits: ProcessingLimits;
  private securityScanner: MediaSecurityScanner;

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

    this.securityScanner = new MediaSecurityScanner({
      maxFileSize: this.limits.maxFileSize,
      allowedMimeTypes: this.limits.allowedFormats,
    });
  }

  /**
   * Process a file with safety limits and error handling
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

    // Start processing with timeout using AbortController pattern
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
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

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

  private async processFileOnce(job: ProcessingJob): Promise<ProcessingResult> {
    // Security scan first
    const securityResult = await this.securityScanner.scanFile(job.filePath);

    if (!securityResult.safe) {
      return {
        success: false,
        error: `Security scan failed: ${securityResult.threats?.join(', ') ?? 'Unknown security issue'}`,
      };
    }

    const ext = this.getFileExtension(job.filename).toLowerCase();

    if (!this.limits.allowedFormats.includes(ext)) {
      return {
        success: false,
        error: `Unsupported file format: ${ext}`,
      };
    }

    // Basic processing - copy file with validation
    let result: ProcessingResult;

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff', 'bmp'].includes(ext)) {
      // Image processing (basic copy with metadata)
      const outputPath = `${this.getBasePath(job)}_processed.${ext}`;
      result = await this.imageProcessor.process(job.filePath, outputPath);
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
      // Audio processing (basic copy with metadata)
      const outputPath = `${this.getBasePath(job)}_processed.${ext}`;
      result = await this.audioProcessor.process(job.filePath, outputPath);
    } else if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) {
      // Video processing (basic copy with metadata)
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
   * Get file statistics
   */
  private async getFileStats(filePath: string): Promise<{ size: number }> {
    const fs = await import('fs/promises');
    const stats = await fs.stat(filePath);
    return { size: stats.size };
  }

  /**
   * Extract file extension
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop() ?? '';
  }

  /**
   * Generate base path for processed variants
   */
  private getBasePath(job: ProcessingJob): string {
    const dir = path.dirname(job.filePath);
    const ext = path.extname(job.filename);
    const basename = path.basename(job.filename, ext);
    return path.join(dir, basename);
  }

  /**
   * Get processing statistics
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
   * Clean up resources
   */
  cleanup(): void {
    // Cancel all active jobs
    for (const [fileId] of this.activeJobs) {
      this.activeJobs.delete(fileId);
    }

    // Clear queue
    this.queue.length = 0;
  }
}
