// packages/sdk/src/persistence/mutationQueue.ts
/**
 * Offline Mutation Queue
 *
 * Handles mutations when offline:
 * 1. Updates UI immediately (optimistic)
 * 2. Adds mutation to localStorage queue
 * 3. Tries to send immediately
 * 4. If offline, waits for online event to flush queue
 */

import { localStorageQueue } from '@persistence/storage';

// ============================================================================
// Types
// ============================================================================

export interface QueuedMutation<TData = unknown> {
  id: string;
  type: string;
  data: TData;
  timestamp: number;
  retries: number;
}

export interface MutationQueueOptions {
  /** Max retries before dropping mutation (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Called when a mutation is processed */
  onProcess?: (mutation: QueuedMutation) => Promise<void>;
  /** Called when a mutation fails permanently */
  onError?: (mutation: QueuedMutation, error: Error) => void;
  /** Called when a mutation succeeds */
  onSuccess?: (mutation: QueuedMutation) => void;
  /** Called when queue status changes */
  onStatusChange?: (status: QueueStatus) => void;
}

export interface QueueStatus {
  isOnline: boolean;
  isProcessing: boolean;
  pendingCount: number;
}

// ============================================================================
// MutationQueue Class
// ============================================================================

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

// Default no-op callbacks with proper return types
const noopProcess = async (): Promise<void> => {};
const noopVoid = (): void => {};

export class MutationQueue {
  private queue: QueuedMutation[] = [];
  private isProcessing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private options: Required<MutationQueueOptions>;
  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;

  constructor(options: MutationQueueOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelay: options.retryDelay ?? DEFAULT_RETRY_DELAY,
      onProcess: options.onProcess ?? noopProcess,
      onError: options.onError ?? noopVoid,
      onSuccess: options.onSuccess ?? noopVoid,
      onStatusChange: options.onStatusChange ?? noopVoid,
    };

    // Bind event handlers
    this.boundHandleOnline = this.handleOnline.bind(this);
    this.boundHandleOffline = this.handleOffline.bind(this);

    // Restore queue from localStorage
    this.restoreQueue();

    // Setup online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundHandleOnline);
      window.addEventListener('offline', this.boundHandleOffline);
    }

    // Try to process any pending mutations
    if (this.isOnline && this.queue.length > 0) {
      void this.processQueue();
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Add a mutation to the queue and try to process immediately
   */
  add(type: string, data: unknown): string {
    const mutation: QueuedMutation = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(mutation);
    this.persistQueue();
    this.notifyStatusChange();

    // Try to process immediately if online
    if (this.isOnline) {
      void this.processQueue();
    }

    return mutation.id;
  }

  /**
   * Remove a mutation from the queue (e.g., user cancels)
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((m) => m.id === id);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    this.persistQueue();
    this.notifyStatusChange();
    return true;
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
      pendingCount: this.queue.length,
    };
  }

  /**
   * Get all pending mutations
   */
  getPending(): QueuedMutation[] {
    return [...this.queue];
  }

  /**
   * Force process the queue (useful for manual retry)
   */
  async flush(): Promise<void> {
    if (!this.isOnline) {
      // eslint-disable-next-line no-console
      console.warn('[MutationQueue] Cannot flush while offline');
      return;
    }
    await this.processQueue();
  }

  /**
   * Clear all pending mutations
   */
  clear(): void {
    this.queue = [];
    this.persistQueue();
    this.notifyStatusChange();
  }

  /**
   * Cleanup listeners (call on unmount)
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundHandleOnline);
      window.removeEventListener('offline', this.boundHandleOffline);
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyStatusChange();

    // isOnline can change during async operations via event listeners
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (this.queue.length > 0 && this.isOnline) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const mutation = this.queue[0]!;

      try {
        await this.options.onProcess(mutation);

        // Success - remove from queue
        this.queue.shift();
        this.persistQueue();
        this.options.onSuccess(mutation);
      } catch (error) {
        mutation.retries += 1;

        if (mutation.retries >= this.options.maxRetries) {
          // Max retries reached - remove and report error
          this.queue.shift();
          this.persistQueue();
          this.options.onError(mutation, error as Error);
        } else {
          // Will retry - wait before next attempt
          this.persistQueue();
          await this.delay(this.options.retryDelay * mutation.retries);
        }
      }

      this.notifyStatusChange();
    }

    this.isProcessing = false;
    this.notifyStatusChange();
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyStatusChange();

    // Flush queue when coming back online
    if (this.queue.length > 0) {
      void this.processQueue();
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyStatusChange();
  }

  private persistQueue(): void {
    try {
      localStorageQueue.set(JSON.stringify(this.queue));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[MutationQueue] Failed to persist queue:', error);
    }
  }

  private restoreQueue(): void {
    try {
      const data = localStorageQueue.get();
      if (data) {
        this.queue = JSON.parse(data) as QueuedMutation[];
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[MutationQueue] Failed to restore queue:', error);
      this.queue = [];
    }
  }

  private notifyStatusChange(): void {
    this.options.onStatusChange(this.getStatus());
  }

  private generateId(): string {
    return `${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a mutation queue instance
 *
 * Usage:
 * ```ts
 * import { createMutationQueue } from '@abe-stack/sdk/persistence';
 * import { apiClient } from '@abe-stack/sdk';
 *
 * const queue = createMutationQueue({
 *   onProcess: async (mutation) => {
 *     switch (mutation.type) {
 *       case 'createPost':
 *         await apiClient.posts.create({ body: mutation.data });
 *         break;
 *       case 'updatePost':
 *         await apiClient.posts.update({ body: mutation.data });
 *         break;
 *     }
 *   },
 *   onError: (mutation, error) => {
 *     console.error(`Failed to process ${mutation.type}:`, error);
 *     // Show toast notification
 *   },
 *   onSuccess: (mutation) => {
 *     // Invalidate queries, show success toast
 *   },
 * });
 *
 * // Add mutation (optimistically update UI first)
 * const id = queue.add('createPost', { title: 'Hello', content: '...' });
 * ```
 */
export function createMutationQueue(options?: MutationQueueOptions): MutationQueue {
  return new MutationQueue(options);
}
