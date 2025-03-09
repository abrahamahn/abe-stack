import Bull, { Queue, Job, JobOptions } from 'bull';
import { Logger } from './LoggerService';

// Environment variables with defaults
const {
  REDIS_HOST = 'localhost',
  REDIS_PORT = '6379',
  REDIS_PASSWORD = '',
  REDIS_PREFIX = 'media-queue'
} = process.env;

// Queue types
export enum QueueType {
  IMAGE_PROCESSING = 'image-processing',
  VIDEO_PROCESSING = 'video-processing',
  AUDIO_PROCESSING = 'audio-processing',
  NOTIFICATION = 'notification'
}

// Job data interfaces
export interface ImageProcessingJob {
  filePath: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface VideoProcessingJob {
  filePath: string;
  userId: string;
  generateHLS?: boolean;
  metadata?: Record<string, any>;
}

export interface AudioProcessingJob {
  filePath: string;
  userId: string;
  generateWaveform?: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationJob {
  userId: string;
  type: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Service for managing background job queues
 */
export class QueueService {
  private static instance: QueueService;
  private queues: Map<QueueType, Queue>;
  private logger: Logger;

  private constructor() {
    this.queues = new Map();
    this.logger = new Logger('QueueService');
    
    // Initialize queues
    this.initializeQueue(QueueType.IMAGE_PROCESSING);
    this.initializeQueue(QueueType.VIDEO_PROCESSING);
    this.initializeQueue(QueueType.AUDIO_PROCESSING);
    this.initializeQueue(QueueType.NOTIFICATION);
    
    // Handle process events
    process.on('SIGTERM', () => this.closeQueues());
    process.on('SIGINT', () => this.closeQueues());
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Initialize a queue with the given name
   */
  private initializeQueue(queueType: QueueType): Queue {
    const queueOptions = {
      redis: {
        host: REDIS_HOST,
        port: Number(REDIS_PORT),
        password: REDIS_PASSWORD || undefined
      },
      prefix: REDIS_PREFIX
    };

    const queue = new Bull(queueType, queueOptions);
    
    // Set up event handlers
    queue.on('error', (error) => {
      this.logger.error(`Error in ${queueType} queue:`, error);
    });
    
    queue.on('failed', (job, error) => {
      this.logger.error(`Job ${job.id} in ${queueType} queue failed:`, error);
    });
    
    this.queues.set(queueType, queue);
    this.logger.info(`Queue ${queueType} initialized`);
    
    return queue;
  }

  /**
   * Get a queue by type
   */
  public getQueue(queueType: QueueType): Queue | undefined {
    return this.queues.get(queueType);
  }

  /**
   * Add a job to the image processing queue
   */
  public async addImageProcessingJob(
    data: ImageProcessingJob,
    options?: JobOptions
  ): Promise<Job<ImageProcessingJob>> {
    const queue = this.getQueue(QueueType.IMAGE_PROCESSING);
    if (!queue) {
      throw new Error('Image processing queue not initialized');
    }
    
    return queue.add(data, options);
  }

  /**
   * Add a job to the video processing queue
   */
  public async addVideoProcessingJob(
    data: VideoProcessingJob,
    options?: JobOptions
  ): Promise<Job<VideoProcessingJob>> {
    const queue = this.getQueue(QueueType.VIDEO_PROCESSING);
    if (!queue) {
      throw new Error('Video processing queue not initialized');
    }
    
    return queue.add(data, options);
  }

  /**
   * Add a job to the audio processing queue
   */
  public async addAudioProcessingJob(
    data: AudioProcessingJob,
    options?: JobOptions
  ): Promise<Job<AudioProcessingJob>> {
    const queue = this.getQueue(QueueType.AUDIO_PROCESSING);
    if (!queue) {
      throw new Error('Audio processing queue not initialized');
    }
    
    return queue.add(data, options);
  }

  /**
   * Add a job to the notification queue
   */
  public async addNotificationJob(
    data: NotificationJob,
    options?: JobOptions
  ): Promise<Job<NotificationJob>> {
    const queue = this.getQueue(QueueType.NOTIFICATION);
    if (!queue) {
      throw new Error('Notification queue not initialized');
    }
    
    return queue.add(data, options);
  }

  /**
   * Register a processor for a queue
   */
  public registerProcessor<T>(
    queueType: QueueType,
    processor: (job: Job<T>) => Promise<any>
  ): void {
    const queue = this.getQueue(queueType);
    if (!queue) {
      throw new Error(`Queue ${queueType} not initialized`);
    }
    
    queue.process(async (job) => {
      try {
        this.logger.info(`Processing job ${job.id} in ${queueType} queue`);
        return await processor(job as Job<T>);
      } catch (error) {
        this.logger.error(`Error processing job ${job.id} in ${queueType} queue:`, error);
        throw error;
      }
    });
    
    this.logger.info(`Processor registered for ${queueType} queue`);
  }

  /**
   * Close all queues gracefully
   */
  private async closeQueues(): Promise<void> {
    this.logger.info('Closing queues...');
    
    const closePromises = Array.from(this.queues.values()).map(queue => 
      (queue as any).close()
    );
    await Promise.all(closePromises);
    
    this.logger.info('All queues closed');
  }
} 