// shared/src/utils/rate-limit.ts
/**
 * Rate Limiting Utilities
 *
 * Security-focused rate limiting to prevent abuse.
 */

/**
 * Creates a simple rate limiter based on a Map.
 * Includes periodic cleanup to prevent memory leaks.
 *
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum number of requests allowed in the window
 * @returns Rate limiter function
 */
export function createRateLimiter(
  windowMs: number,
  maxRequests: number,
): (identifier: string) => { allowed: boolean; resetTime: number } {
  const requests = new Map<string, number[]>();
  let lastCleanup = Date.now();
  const CLEANUP_INTERVAL = 60000; // 1 minute

  return (identifier: string): { allowed: boolean; resetTime: number } => {
    const now = Date.now();

    // Periodic cleanup of all identifiers within this limiter instance
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      for (const [id, times] of requests.entries()) {
        const valid = times.filter((t) => now - t < windowMs);
        if (valid.length === 0) {
          requests.delete(id);
        } else {
          requests.set(id, valid);
        }
      }
      lastCleanup = now;
    }

    const requestTimes = requests.get(identifier) ?? [];

    // Remove requests outside the time window for THIS identifier
    const validRequests = requestTimes.filter((time) => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        resetTime: (validRequests[0] ?? now) + windowMs,
      };
    }

    validRequests.push(now);
    requests.set(identifier, validRequests);

    return {
      allowed: true,
      resetTime: now + windowMs,
    };
  };
}
