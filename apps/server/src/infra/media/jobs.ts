// apps/server/src/infra/media/jobs.ts
/**
 * Media Processing Job Queue
 *
 * Custom job queue implementation for background media processing.
 * Lightweight alternative to keep dependencies minimal.
 */

import {
  ImageProcessor,
  AudioProcessor,
  VideoProcessor,
  MediaProcessingOrchestrator,
} from './processor';
import { CustomJobQueue } from './queue';

import type { MediaMetadata } from './types';
import type { Logger } from '@logger';

export interface MediaJobData {
  fileId: string;
  filePath: string;
  filename: string;
  userId: string;
}

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
 * Media Processing Queue Manager
 */
export class MediaProcessingQueue extends CustomJobQueue<MediaJobData> {
  private orchestrator: MediaProcessingOrchestrator;

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
   * Override processJobData to handle media processing
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
   */
  async addJob(
    data: MediaJobData,
    options: { priority?: number; delay?: number } = {},
  ): Promise<string> {
    return this.add(data.fileId, data, options);
  }

  /**
   * Get orchestrator stats
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
   * Get combined stats
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
 * Create media processing queue with all dependencies
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
