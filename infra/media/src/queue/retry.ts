// infra/media/src/queue/retry.ts
/**
 * Media Processing Retry Logic
 *
 * Implements exponential backoff and circuit breaker patterns for
 * reliable media processing with automatic failure recovery.
 *
 * @module queue/retry
 */

import type { Logger } from '@abe-stack/core';

/**
 * Configuration for retry behavior and circuit breaker thresholds
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds before first retry */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Jitter factor (0-1) to prevent thundering herd */
  jitterFactor: number;
  /** Number of consecutive failures before opening circuit breaker */
  circuitBreakerThreshold: number;
  /** Duration in ms to keep circuit breaker open before half-open test */
  circuitBreakerTimeoutMs: number;
}

/**
 * Retry state for a single operation including circuit breaker status
 */
export interface RetryState {
  attemptCount: number;
  lastAttemptAt: number;
  nextRetryAt: number;
  consecutiveFailures: number;
  isCircuitOpen: boolean;
  circuitOpenedAt: number;
}

/**
 * Retry handler with exponential backoff and circuit breaker pattern.
 *
 * - Exponential backoff: delay = base * multiplier^attempt
 * - Jitter: prevents thundering herd by randomizing delay
 * - Circuit breaker: stops retries after too many consecutive failures
 * - Half-open: allows test request after circuit timeout expires
 *
 * @example
 * ```typescript
 * const handler = createMediaRetryHandler(logger);
 * const result = await handler.executeWithRetry('op-1', async () => {
 *   return await processMedia(file);
 * });
 * ```
 */
export class MediaProcessingRetryHandler {
  private retryStates = new Map<string, RetryState>();
  private defaultOptions: Required<RetryOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
  private static readonly defaultMaxAgeMs = 60 * 60 * 1000; // 1 hour

  /**
   * Create a retry handler with optional custom options
   *
   * @param logger - Logger instance for structured logging
   * @param options - Partial retry options (defaults are applied)
   */
  constructor(
    private logger: Logger,
    options: Partial<RetryOptions> = {},
  ) {
    this.defaultOptions = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 300000, // 5 minutes
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeoutMs: 600000, // 10 minutes
      ...options,
    };

    // Start periodic cleanup of stale retry states
    this.cleanupInterval = setInterval(() => {
      this.cleanup(MediaProcessingRetryHandler.defaultMaxAgeMs);
    }, MediaProcessingRetryHandler.cleanupIntervalMs);
  }

  /**
   * Execute an operation with retry logic and circuit breaker protection
   *
   * @typeParam T - Return type of the operation
   * @param operationId - Unique identifier for tracking this operation's retry state
   * @param operation - Async function to execute with retries
   * @param context - Optional structured data to include in log messages
   * @returns The operation result on success
   * @throws Error if all retries are exhausted or circuit breaker is open
   */
  async executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>,
  ): Promise<T> {
    const state = this.getOrCreateState(operationId);

    // Check circuit breaker
    if (this.isCircuitOpen(state)) {
      throw new Error(`Circuit breaker open for operation ${operationId}`);
    }

    let lastError = new Error('Unknown error');

    for (let attempt = 0; attempt <= this.defaultOptions.maxRetries; attempt++) {
      try {
        state.attemptCount = attempt + 1;
        state.lastAttemptAt = Date.now();

        const result = await operation();

        // Success - reset failure count and close circuit
        state.consecutiveFailures = 0;
        state.isCircuitOpen = false;

        this.logger.info('Media processing succeeded', {
          operationId,
          attempt: attempt + 1,
          ...context,
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        state.consecutiveFailures++;

        this.logger.warn('Media processing attempt failed', {
          operationId,
          attempt: attempt + 1,
          maxRetries: this.defaultOptions.maxRetries,
          error: lastError.message,
          ...context,
        });

        // Check if we should open circuit breaker
        if (state.consecutiveFailures >= this.defaultOptions.circuitBreakerThreshold) {
          this.openCircuit(state, operationId);
          break;
        }

        // If not the last attempt, wait before retrying
        if (attempt < this.defaultOptions.maxRetries) {
          const delay = this.calculateDelay(attempt);
          state.nextRetryAt = Date.now() + delay;

          this.logger.info('Scheduling retry', {
            operationId,
            delay,
            nextRetryAt: new Date(state.nextRetryAt).toISOString(),
          });

          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Media processing failed after ${String(this.defaultOptions.maxRetries + 1)} attempts: ${lastError.message}`,
    );
  }

  /**
   * Calculate delay with exponential backoff and jitter.
   * Formula: min(base * multiplier^attempt, maxDelay) + random jitter
   *
   * @param attempt - Zero-based attempt index
   * @returns Delay in milliseconds
   * @complexity O(1)
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.defaultOptions.baseDelayMs * Math.pow(this.defaultOptions.backoffMultiplier, attempt);

    const cappedDelay = Math.min(exponentialDelay, this.defaultOptions.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.defaultOptions.jitterFactor * (Math.random() * 2 - 1);
    const finalDelay = Math.max(0, cappedDelay + jitter);

    return Math.floor(finalDelay);
  }

  /**
   * Get or create retry state for an operation
   *
   * @param operationId - Unique identifier for the operation
   * @returns The retry state
   */
  private getOrCreateState(operationId: string): RetryState {
    let state = this.retryStates.get(operationId);

    if (state === undefined) {
      state = {
        attemptCount: 0,
        lastAttemptAt: 0,
        nextRetryAt: 0,
        consecutiveFailures: 0,
        isCircuitOpen: false,
        circuitOpenedAt: 0,
      };
      this.retryStates.set(operationId, state);
    }

    return state;
  }

  /**
   * Check if circuit breaker is open. If timeout has expired, transition
   * to half-open state for a test request.
   *
   * @param state - The retry state to check
   * @returns True if circuit is open and blocking requests
   */
  private isCircuitOpen(state: RetryState): boolean {
    if (!state.isCircuitOpen) return false;

    // Check if circuit breaker timeout has expired
    const timeSinceOpened = Date.now() - state.circuitOpenedAt;
    if (timeSinceOpened >= this.defaultOptions.circuitBreakerTimeoutMs) {
      // Half-open the circuit for a test request
      state.isCircuitOpen = false;
      state.consecutiveFailures = Math.floor(this.defaultOptions.circuitBreakerThreshold / 2);
      return false;
    }

    return true;
  }

  /**
   * Open circuit breaker due to too many consecutive failures
   *
   * @param state - The retry state to update
   * @param operationId - Operation ID for logging
   */
  private openCircuit(state: RetryState, operationId: string): void {
    state.isCircuitOpen = true;
    state.circuitOpenedAt = Date.now();

    this.logger.error('Circuit breaker opened', {
      operationId,
      consecutiveFailures: state.consecutiveFailures,
      timeoutMs: this.defaultOptions.circuitBreakerTimeoutMs,
    });
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Duration to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics across all tracked operations
   *
   * @returns Statistics including total operations, open circuits, and average retries
   */
  getStats(): {
    totalOperations: number;
    openCircuits: number;
    averageRetries: number;
  } {
    const states = Array.from(this.retryStates.values());
    const totalOperations = states.length;
    const openCircuits = states.filter((s) => s.isCircuitOpen).length;
    const averageRetries =
      states.length > 0 ? states.reduce((sum, s) => sum + s.attemptCount, 0) / states.length : 0;

    return {
      totalOperations,
      openCircuits,
      averageRetries,
    };
  }

  /**
   * Reset retry state for a specific operation
   *
   * @param operationId - The operation to reset
   */
  resetState(operationId: string): void {
    this.retryStates.delete(operationId);
  }

  /**
   * Clean up stale retry states older than maxAgeMs
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   * @complexity O(n) where n is tracked operations
   */
  cleanup(maxAgeMs: number = 3600000): void {
    const cutoff = Date.now() - maxAgeMs;

    for (const [operationId, state] of this.retryStates.entries()) {
      if (state.lastAttemptAt < cutoff) {
        this.retryStates.delete(operationId);
      }
    }
  }

  /**
   * Destroy the handler, clearing all intervals and state
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.retryStates.clear();
  }
}

/**
 * Create a configured retry handler for media processing with sensible defaults
 *
 * @param logger - Logger instance for structured logging
 * @returns Configured MediaProcessingRetryHandler
 */
export function createMediaRetryHandler(logger: Logger): MediaProcessingRetryHandler {
  return new MediaProcessingRetryHandler(logger, {
    maxRetries: 3,
    baseDelayMs: 2000, // Start with 2 seconds
    maxDelayMs: 300000, // Max 5 minutes
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 600000, // 10 minutes
  });
}
