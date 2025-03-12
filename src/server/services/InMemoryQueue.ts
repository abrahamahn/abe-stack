import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Job status enum
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Job processor type
export type JobProcessor<T> = (job: Job<T>) => Promise<any>;

// Job interface
export interface Job<T> {
  id: string;
  data: T;
  status: JobStatus;
  timestamp: number;
  result?: any;
  error?: Error;
  progress: number;
  opts: JobOptions;
  
  // Methods
  update(progress: number): Promise<void>;
  remove(): Promise<void>;
}

// Job options interface
export interface JobOptions {
  delay?: number;
  attempts?: number;
  priority?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

// Queue class
export class InMemoryQueue<T> extends EventEmitter {
  private queue: Job<T>[] = [];
  private isProcessing = false;
  private processor: JobProcessor<T>;
  private timers: Map<string, NodeJS.Timeout>;

  constructor(processor: JobProcessor<T>) {
    super();
    this.processor = processor;
    this.timers = new Map();
  }

  /**
   * Add a job to the queue
   */
  async add(data: T, opts: JobOptions = {}): Promise<Job<T>> {
    const id = uuidv4();
    const job: Job<T> = {
      id,
      data,
      status: JobStatus.WAITING,
      timestamp: Date.now(),
      progress: 0,
      opts,
      
      update: async (progress: number) => {
        job.progress = progress;
        this.emit('progress', job, progress);
      },
      
      remove: async () => {
        this.queue = this.queue.filter(j => j.id !== id);
        if (this.timers.has(id)) {
          clearTimeout(this.timers.get(id)!);
          this.timers.delete(id);
        }
      }
    };
    
    if (opts.delay && opts.delay > 0) {
      // Schedule delayed job
      const timer = setTimeout(() => {
        this.queue.push(job);
        this.timers.delete(id);
        this.processNextJob();
      }, opts.delay);
      
      this.timers.set(id, timer);
    } else {
      this.queue.push(job);
      this.processNextJob();
    }
    
    this.emit('added', job);
    return job;
  }

  /**
   * Process jobs with the given processor function
   */
  process(processor: JobProcessor<T>): void {
    this.processor = processor;
    this.isProcessing = true;
    this.processNextJob();
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    if (!this.isProcessing || !this.processor || this.queue.length === 0) {
      return;
    }
    
    const job = this.queue.shift()!;
    
    if (!job) {
      return this.processNextJob();
    }
    
    job.status = JobStatus.ACTIVE;
    
    try {
      const result = await this.processor(job);
      job.status = JobStatus.COMPLETED;
      job.result = result;
      
      if (job.opts.removeOnComplete) {
        this.queue = this.queue.filter(j => j.id !== job.id);
      }
      
      this.emit('completed', job, result);
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.error = error as Error;
      
      // Handle retries
      if (job.opts.attempts && job.opts.attempts > 1) {
        job.opts.attempts--;
        job.status = JobStatus.WAITING;
        this.queue.push(job);
      } else if (job.opts.removeOnFail) {
        this.queue = this.queue.filter(j => j.id !== job.id);
      }
      
      this.emit('failed', job, error);
    }
    
    // Process next job
    this.processNextJob();
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job<T> | null> {
    return this.queue.find(job => job.id === jobId) || null;
  }

  /**
   * Get all jobs in the queue
   */
  async getJobs(status?: JobStatus): Promise<Job<T>[]> {
    if (!status) {
      return this.queue;
    }
    
    return this.queue.filter(job => job.status === status);
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    this.isProcessing = false;
    this.emit('paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    this.isProcessing = true;
    this.processNextJob();
    this.emit('resumed');
  }

  /**
   * Empty the queue
   */
  async empty(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.queue = [];
    this.timers.clear();
    this.emit('emptied');
  }

  /**
   * Close the queue
   */
  async close(): Promise<void> {
    await this.pause();
    this.emit('closed');
  }

  /**
   * Get the count of jobs by status
   */
  async getJobCounts(): Promise<Record<string, number>> {
    const counts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: this.queue.length
    };
    
    for (const job of this.queue) {
      if (job.status === JobStatus.WAITING) {
        if (job.opts.delay && job.opts.delay > 0) {
          counts.delayed++;
        } else {
          counts.waiting++;
        }
      } else if (job.status === JobStatus.ACTIVE) {
        counts.active++;
      } else if (job.status === JobStatus.COMPLETED) {
        counts.completed++;
      } else if (job.status === JobStatus.FAILED) {
        counts.failed++;
      }
    }
    
    return counts;
  }
} 