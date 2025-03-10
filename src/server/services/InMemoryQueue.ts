import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './LoggerService';

// Job status enum
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

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

// Queue interface
export class InMemoryQueue<T> extends EventEmitter {
  private name: string;
  private jobs: Map<string, Job<T>>;
  private waitingJobs: string[];
  private activeJobs: Set<string>;
  private processor: ((job: Job<T>) => Promise<any>) | null;
  private processing: boolean;
  private logger: Logger;
  private timers: Map<string, NodeJS.Timeout>;

  constructor(name: string) {
    super();
    this.name = name;
    this.jobs = new Map();
    this.waitingJobs = [];
    this.activeJobs = new Set();
    this.processor = null;
    this.processing = false;
    this.logger = new Logger(`InMemoryQueue:${name}`);
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
        this.jobs.delete(id);
        this.waitingJobs = this.waitingJobs.filter(jobId => jobId !== id);
        this.activeJobs.delete(id);
        if (this.timers.has(id)) {
          clearTimeout(this.timers.get(id)!);
          this.timers.delete(id);
        }
      }
    };
    
    this.jobs.set(id, job);
    
    if (opts.delay && opts.delay > 0) {
      // Schedule delayed job
      const timer = setTimeout(() => {
        this.waitingJobs.push(id);
        this.timers.delete(id);
        this.processNextJob();
      }, opts.delay);
      
      this.timers.set(id, timer);
    } else {
      this.waitingJobs.push(id);
      this.processNextJob();
    }
    
    this.emit('added', job);
    return job;
  }

  /**
   * Process jobs with the given processor function
   */
  process(processor: (job: Job<T>) => Promise<any>): void {
    this.processor = processor;
    this.processing = true;
    this.processNextJob();
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    if (!this.processing || !this.processor || this.waitingJobs.length === 0) {
      return;
    }
    
    const jobId = this.waitingJobs.shift()!;
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return this.processNextJob();
    }
    
    job.status = JobStatus.ACTIVE;
    this.activeJobs.add(jobId);
    this.emit('active', job);
    
    try {
      const result = await this.processor(job);
      job.status = JobStatus.COMPLETED;
      job.result = result;
      this.activeJobs.delete(jobId);
      
      if (job.opts.removeOnComplete) {
        this.jobs.delete(jobId);
      }
      
      this.emit('completed', job, result);
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.error = error as Error;
      this.activeJobs.delete(jobId);
      
      // Handle retries
      if (job.opts.attempts && job.opts.attempts > 1) {
        job.opts.attempts--;
        job.status = JobStatus.WAITING;
        this.waitingJobs.push(jobId);
      } else if (job.opts.removeOnFail) {
        this.jobs.delete(jobId);
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
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs in the queue
   */
  async getJobs(status?: JobStatus): Promise<Job<T>[]> {
    if (!status) {
      return Array.from(this.jobs.values());
    }
    
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    this.processing = false;
    this.emit('paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    this.processing = true;
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
    
    this.jobs.clear();
    this.waitingJobs = [];
    this.activeJobs.clear();
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
      total: this.jobs.size
    };
    
    for (const job of this.jobs.values()) {
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