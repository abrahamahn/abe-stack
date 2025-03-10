import { Logger } from './LoggerService';
import { InMemoryQueue, Job, JobOptions } from './InMemoryQueue';

// Queue types
export enum QueueType {
  IMAGE_PROCESSING = 'image-processing',
  VIDEO_PROCESSING = 'video-processing',
  AUDIO_PROCESSING = 'audio-processing',
  NOTIFICATION = 'notification'
}

// Job data interfaces
export interface ImageProcessingJob {
  mediaId: string;
  filePath: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface VideoProcessingJob {
  mediaId: string;
  filePath: string;
  userId: string;
  options?: {
    generateHLS?: boolean;
    generateDASH?: boolean;
    quality?: ('1080p' | '720p' | '480p' | '360p' | '240p')[];
  };
  metadata?: Record<string, any>;
}

export interface AudioProcessingJob {
  mediaId: string;
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
  private queues: Map<QueueType, InMemoryQueue<any>>;
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
  private initializeQueue(queueType: QueueType): InMemoryQueue<any> {
    const queue = new InMemoryQueue(queueType);
    
    // Set up event handlers
    queue.on('error', (error) => {
      this.logger.error(`Error in ${queueType} queue:`, error);
    });
    
    queue.on('failed', (job, error) => {
      this.logger.error(`Job ${job.id} in ${queueType} queue failed:`, error);
    });
    
    queue.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} in ${queueType} queue completed`);
    });
    
    this.queues.set(queueType, queue);
    return queue;
  }

  /**
   * Get a queue by type
   */
  public getQueue(queueType: QueueType): InMemoryQueue<any> | undefined {
    return this.queues.get(queueType);
  }

  /**
   * Add an image processing job to the queue
   */
  public async addImageProcessingJob(
    data: ImageProcessingJob,
    options?: JobOptions
  ): Promise<Job<ImageProcessingJob>> {
    const queue = this.getQueue(QueueType.IMAGE_PROCESSING);
    if (!queue) {
      throw new Error(`Queue ${QueueType.IMAGE_PROCESSING} not found`);
    }
    return queue.add(data, options);
  }

  /**
   * Add a video processing job to the queue
   */
  public async addVideoProcessingJob(
    data: VideoProcessingJob,
    options?: JobOptions
  ): Promise<Job<VideoProcessingJob>> {
    const queue = this.getQueue(QueueType.VIDEO_PROCESSING);
    if (!queue) {
      throw new Error(`Queue ${QueueType.VIDEO_PROCESSING} not found`);
    }
    return queue.add(data, options);
  }

  /**
   * Add an audio processing job to the queue
   */
  public async addAudioProcessingJob(
    data: AudioProcessingJob,
    options?: JobOptions
  ): Promise<Job<AudioProcessingJob>> {
    const queue = this.getQueue(QueueType.AUDIO_PROCESSING);
    if (!queue) {
      throw new Error(`Queue ${QueueType.AUDIO_PROCESSING} not found`);
    }
    return queue.add(data, options);
  }

  /**
   * Add a notification job to the queue
   */
  public async addNotificationJob(
    data: NotificationJob,
    options?: JobOptions
  ): Promise<Job<NotificationJob>> {
    const queue = this.getQueue(QueueType.NOTIFICATION);
    if (!queue) {
      throw new Error(`Queue ${QueueType.NOTIFICATION} not found`);
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
      throw new Error(`Queue ${queueType} not found`);
    }
    
    queue.process(processor);
    this.logger.info(`Processor registered for ${queueType} queue`);
  }

  /**
   * Close all queues
   */
  private async closeQueues(): Promise<void> {
    this.logger.info('Closing all queues');
    
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    
    this.logger.info('All queues closed');
  }
} 