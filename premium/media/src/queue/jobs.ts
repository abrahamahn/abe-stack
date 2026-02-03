// premium/media/src/queue/jobs.ts
/**
 * Media Processing Job Queue
 *
 * Custom job queue implementation for background media processing.
 * Lightweight alternative to keep dependencies minimal.
 *
 * @module queue/jobs
 */

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
  private orchestrator: MediaProcessingOrchestrator;

  /**
   * Create a media processing queue with orchestrator
   *
   * @param orchestrator - The media processing orchestrator instance
   * @param logger - Logger instance for structured logging
   */
  constructor(orchestrator: MediaProcessingOrchestrator, logger: Logger) {
    super({
      concurrency: 3,
      retryDelayMs: 1000,
      maxRetries: 3,
      logger,
    });

    this.orchestrator = orchestrator;
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

      if (!result.success) {
        throw new Error(result.error ?? 'Processing failed');
      }
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
      maxDuration: 5 * 60 * 1000, // 5 minutes
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxConcurrentJobs: 3,
      allowedFormats: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'avif',
        'tiff',
        'bmp',
        'mp3',
        'wav',
        'flac',
        'aac',
        'ogg',
        'm4a',
        'mp4',
        'avi',
        'mov',
        'mkv',
        'webm',
        'flv',
        'wmv',
      ],
      ...limits,
    },
    {
      securityOptions: {},
    },
  );

  return new MediaProcessingQueue(orchestrator, logger);
}
