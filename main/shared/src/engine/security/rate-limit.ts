// main/shared/src/engine/security/rate-limit.ts
/**
 * Rate Limiting Utilities
 *
 * Security-focused rate limiting to prevent abuse.
 * Uses a sliding-window counter algorithm for O(1) per-check performance.
 */

/**
 * Per-identifier state for the sliding window counter.
 * Tracks a fixed window (count + start time) and an interpolated
 * previous window for smooth rate estimation.
 */
interface WindowState {
  /** Request count in the previous fixed window */
  prevCount: number;
  /** Request count in the current fixed window */
  currCount: number;
  /** Start timestamp of the current fixed window */
  windowStart: number;
}

/**
 * Creates a rate limiter using a sliding-window counter algorithm.
 *
 * Each check is O(1) — no array filtering or timestamp scanning.
 * Includes periodic cleanup of stale entries to prevent memory leaks.
 *
 * The sliding window interpolates between the current and previous
 * fixed windows to approximate a true sliding window without storing
 * individual timestamps.
 *
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum number of requests allowed in the window
 * @returns Rate limiter function that checks and records a request
 * @complexity O(1) per check, O(n) amortized cleanup where n = unique identifiers
 */
export function createRateLimiter(
  windowMs: number,
  maxRequests: number,
): (identifier: string) => { allowed: boolean; resetTime: number } {
  const windows = new Map<string, WindowState>();
  let lastCleanup = Date.now();
  const CLEANUP_INTERVAL = 60_000; // 1 minute

  return (identifier: string): { allowed: boolean; resetTime: number } => {
    const now = Date.now();

    // Periodic cleanup: remove identifiers whose windows are fully expired
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      const cutoff = now - windowMs * 2;
      for (const [id, state] of windows) {
        if (state.windowStart + windowMs <= cutoff) {
          windows.delete(id);
        }
      }
      lastCleanup = now;
    }

    let state = windows.get(identifier);

    if (state === undefined) {
      // First request from this identifier
      state = { prevCount: 0, currCount: 0, windowStart: now };
      windows.set(identifier, state);
    }

    // Rotate windows if the current window has expired
    const elapsed = now - state.windowStart;
    if (elapsed >= windowMs * 2) {
      // Both windows expired — full reset
      state.prevCount = 0;
      state.currCount = 0;
      state.windowStart = now;
    } else if (elapsed >= windowMs) {
      // Current window expired — rotate previous
      state.prevCount = state.currCount;
      state.currCount = 0;
      state.windowStart = state.windowStart + windowMs;
    }

    // Sliding window estimate: weight previous window by remaining fraction
    const windowElapsed = now - state.windowStart;
    const prevWeight = Math.max(0, 1 - windowElapsed / windowMs);
    const estimatedCount = state.prevCount * prevWeight + state.currCount;

    if (estimatedCount >= maxRequests) {
      return {
        allowed: false,
        resetTime: state.windowStart + windowMs,
      };
    }

    state.currCount++;

    return {
      allowed: true,
      resetTime: state.windowStart + windowMs,
    };
  };
}

/**
 * Rate limit check result
 */
export interface RateLimitInfo {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Maximum requests per window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Time in milliseconds until the window resets */
  resetMs: number;
}
