// premium/media/src/facade.ts
/**
 * Server-Side Media Processing Facade
 *
 * High-level API for media processing. Combines the processing orchestrator
 * with the job queue for background processing with retry support.
 *
 * Balanced approach: Essential external libraries (Sharp, FFmpeg) + Custom implementations.
 * Provides background processing, security scanning, and advanced media processing.
 *
 * @module facade
 */

import {
  ImageProcessor,
  AudioProcessor,
  VideoProcessor,
  MediaProcessingOrchestrator,
} from './processor';
import { CustomJobQueue } from './queue';

import type { Logger } from '@abe-stack/shared';

/**
 * Data payload for a media processing job submitted to the facade
 */
export interface MediaJobData {
  fileId: string;
  filePath: string;
  filename: string;
  userId: string;
}

/**
 * Server-side media processing queue that combines the orchestrator
 * with the generic job queue for background processing.
 *
 * @example
 * ```typescript
 * const queue = createServerMediaQueue(logger);
 * await queue.start();
 * await queue.addJob({
 *   fileId: '123',
 *   filePath: '/tmp/upload.mp4',
 *   filename: 'video.mp4',
 *   userId: 'user-1',
 * });
 * ```
 */
export class ServerMediaQueue extends CustomJobQueue {
  private readonly orchestrator: MediaProcessingOrchestrator;

  /**
   * Create a server media queue with pre-configured processors
   *
   * @param logger - Logger instance for structured logging
   */
  constructor(logger: Logger) {
    super({
      concurrency: 3,
      retryDelayMs: 1000,
      maxRetries: 3,
      logger,
    });

    // Initialize production processors with external dependencies
    this.orchestrator = new MediaProcessingOrchestrator(
      new ImageProcessor(),
      new AudioProcessor(),
      new VideoProcessor(),
      {
        maxDuration: 5 * 60 * 1000, // 5 minutes
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxConcurrentJobs: 3,
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'wav', 'mp4', 'mov'],
      },
      {
        securityOptions: {},
      },
    );
  }

  /**
   * Override processJobData to handle media processing via orchestrator
   *
   * @param data - The media job payload
   * @throws Error if processing fails
   */
  protected override async processJobData(data: MediaJobData): Promise<void> {
    const startTime = Date.now();

    try {
      this.options.logger.info('Processing media job', {
        fileId: data.fileId,
        filename: data.filename,
      });

      const result = await this.orchestrator.processFile({
        fileId: data.fileId,
        filePath: data.filePath,
        filename: data.filename,
        priority: 'normal',
        retryCount: 0,
        startTime,
      });

      const processingTime = Date.now() - startTime;

      this.options.logger.info('Media processing completed', {
        fileId: data.fileId,
        success: result.success,
        processingTime,
      });

      void result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.options.logger.error('Media processing failed', {
        fileId: data.fileId,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
      });

      throw error;
    }
  }

  /**
   * Add a media processing job to the queue
   *
   * @param data - The media job data
   * @param options - Optional priority and delay settings
   * @returns The job ID (same as fileId)
   */
  async addJob(
    data: MediaJobData,
    options: { priority?: number; delay?: number } = {},
  ): Promise<string> {
    return this.add(data.fileId, data, options);
  }

  /**
   * Get orchestrator stats including active jobs and limits
   *
   * @returns Orchestrator statistics
   */
  getOrchestratorStats(): unknown {
    return this.orchestrator.getStats();
  }
}

/**
 * Create a server media processing queue with default configuration
 *
 * @param logger - Logger instance for structured logging
 * @returns Configured ServerMediaQueue ready for use
 */
export function createServerMediaQueue(logger: Logger): ServerMediaQueue {
  return new ServerMediaQueue(logger);
}
