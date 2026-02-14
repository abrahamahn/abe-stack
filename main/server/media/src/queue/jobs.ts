// main/server/media/src/queue/jobs.ts
/**
 * Media Processing Job Queue
 *
 * Custom job queue implementation for background media processing.
 * Lightweight alternative to keep dependencies minimal.
 *
 * @module queue/jobs
 */

import {
  ALL_MEDIA_EXTENSIONS,
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_MEDIA_FILE_SIZE,
  DEFAULT_MAX_RETRIES,
  DEFAULT_PROCESSING_TIMEOUT_MS,
  DEFAULT_RETRY_DELAY_MS,
} from '../constants';
import {
  ImageProcessor,
  AudioProcessor,
  VideoProcessor,
  MediaProcessingOrchestrator,
} from '../processor';

import { CustomJobQueue } from './queue';

import type { MediaMetadata } from '../types';
import type { Logger } from '@abe-stack/shared';

/**
 * Data payload for a media processing job
 */
export interface MediaJobData {
  fileId: string;
  filePath: string;
  filename: string;
  userId: string;
}

/**
 * Result of a completed media processing job
 */
export interface MediaJobResult {
  success: boolean;
  outputPath?: string;
  thumbnailPath?: string;
  waveformPath?: string;
  metadata?: MediaMetadata;
  error?: string;
  processingTime: number;
}

/**
 * Media Processing Queue Manager that extends the generic job queue
 * with media-specific orchestration and statistics.
 *
 * @example
 * ```typescript
 * const queue = createMediaProcessingQueue(logger);
 * await queue.start();
 * await queue.addJob({ fileId: '123', filePath: '/tmp/video.mp4', filename: 'video.mp4', userId: 'user1' });
 * ```
 */
export class MediaProcessingQueue extends CustomJobQueue<MediaJobData> {
  private readonly orchestrator: MediaProcessingOrchestrator;
  private readonly logger: Logger;

  /**
   * Create a media processing queue with orchestrator
   *
   * @param orchestrator - The media processing orchestrator instance
   * @param logger - Logger instance for structured logging
   */
  constructor(orchestrator: MediaProcessingOrchestrator, logger: Logger) {
    super({
      concurrency: DEFAULT_CONCURRENCY,
      retryDelayMs: DEFAULT_RETRY_DELAY_MS,
      maxRetries: DEFAULT_MAX_RETRIES,
      logger,
    });
    this.orchestrator = orchestrator;
    this.logger = logger;
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
      this.logger.info('Processing media job', {
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

      this.logger.info('Media processing completed', {
        fileId: data.fileId,
        success: result.success,
        processingTime,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Processing failed');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error('Media processing failed', {
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
   * Get orchestrator stats including active jobs, queue depth, and limits
   *
   * @returns Orchestrator statistics
   */
  getOrchestratorStats(): {
    activeJobs: number;
    queuedJobs: number;
    limits: {
      maxDuration: number;
      maxFileSize: number;
      maxConcurrentJobs: number;
      allowedFormats: string[];
    };
  } {
    return this.orchestrator.getStats();
  }

  /**
   * Get combined queue and orchestrator stats
   *
   * @returns Combined statistics object
   */
  override getStats(): {
    total: number;
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
    orchestratorStats: {
      activeJobs: number;
      queuedJobs: number;
      limits: {
        maxDuration: number;
        maxFileSize: number;
        maxConcurrentJobs: number;
        allowedFormats: string[];
      };
    };
  } {
    return {
      ...super.getStats(),
      orchestratorStats: this.orchestrator.getStats(),
    };
  }
}

/**
 * Create media processing queue with all dependencies pre-wired
 *
 * @param logger - Logger instance for structured logging
 * @param limits - Optional processing limits override
 * @returns Configured MediaProcessingQueue ready for use
 */
export function createMediaProcessingQueue(
  logger: Logger,
  limits?: {
    maxDuration?: number;
    maxFileSize?: number;
    maxConcurrentJobs?: number;
    allowedFormats?: string[];
  },
): MediaProcessingQueue {
  const orchestrator = new MediaProcessingOrchestrator(
    new ImageProcessor(),
    new AudioProcessor(),
    new VideoProcessor(),
    {
      maxDuration: DEFAULT_PROCESSING_TIMEOUT_MS,
      maxFileSize: DEFAULT_MAX_MEDIA_FILE_SIZE,
      maxConcurrentJobs: DEFAULT_CONCURRENCY,
      allowedFormats: [...ALL_MEDIA_EXTENSIONS],
      ...limits,
    },
    {
      securityOptions: {},
    },
  );

  return new MediaProcessingQueue(orchestrator, logger);
}
