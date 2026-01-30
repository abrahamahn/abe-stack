// apps/server/src/infrastructure/media/facade.ts
/**
 * Server-Side Media Processing
 *
 * Balanced approach: Essential external libraries (Sharp, FFmpeg) + Custom implementations.
 * Provides background processing, security scanning, and advanced media processing.
 */

import {
  ImageProcessor,
  AudioProcessor,
  VideoProcessor,
  MediaProcessingOrchestrator,
} from './processor';
import { CustomJobQueue } from './queue';

import type { Logger } from '@abe-stack/core';

export interface MediaJobData {
  fileId: string;
  filePath: string;
  filename: string;
  userId: string;
}

/**
 * Server-side media processing queue
 */
export class ServerMediaQueue extends CustomJobQueue {
  private orchestrator: MediaProcessingOrchestrator;

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
   * Add a media processing job
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
  getOrchestratorStats(): unknown {
    return this.orchestrator.getStats();
  }
}

/**
 * Create server media processing queue
 */
export function createServerMediaQueue(logger: Logger): ServerMediaQueue {
  return new ServerMediaQueue(logger);
}
