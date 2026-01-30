// apps/server/src/infrastructure/media/queue/retry.ts
/**
 * Media Processing Retry Logic
 *
 * Implements exponential backoff and circuit breaker patterns for
 * reliable media processing with automatic failure recovery.
 */

import type { Logger } from '@abe-stack/core';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
}

export interface RetryState {
  attemptCount: number;
  lastAttemptAt: number;
  nextRetryAt: number;
  consecutiveFailures: number;
  isCircuitOpen: boolean;
  circuitOpenedAt: number;
}

export class MediaProcessingRetryHandler {
  private retryStates = new Map<string, RetryState>();
  private defaultOptions: Required<RetryOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
  private static readonly defaultMaxAgeMs = 60 * 60 * 1000; // 1 hour

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

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup(MediaProcessingRetryHandler.defaultMaxAgeMs);
    }, MediaProcessingRetryHandler.cleanupIntervalMs);
  }

  /**
   * Execute a media processing operation with retry logic
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
   * Calculate delay with exponential backoff and jitter
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
   * Check if circuit breaker is open
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
   * Open circuit breaker
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
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
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
   * Reset retry state for an operation
   */
  resetState(operationId: string): void {
    this.retryStates.delete(operationId);
  }

  /**
   * Clean up old retry states
   */
  cleanup(maxAgeMs: number = 3600000): void {
    // 1 hour default
    const cutoff = Date.now() - maxAgeMs;

    for (const [operationId, state] of this.retryStates.entries()) {
      if (state.lastAttemptAt < cutoff) {
        this.retryStates.delete(operationId);
      }
    }
  }

  /**
   * Destroy the handler and clean up resources
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
 * Create a configured retry handler for media processing
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
