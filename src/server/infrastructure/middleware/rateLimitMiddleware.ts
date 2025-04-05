import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

import { TooManyRequestsError } from "@/server/infrastructure/errors";

// Extend Express Request type to include user
declare module "express" {
  interface Request {
    user?: {
      id: string;
      [key: string]: unknown;
    };
  }
}

// Rate limiter configurations for different endpoints
export const rateLimiters = {
  // Login - 5 attempts per minute
  login: new RateLimiterMemory({
    points: 5, // Number of attempts
    duration: 60, // Per 60 seconds
    blockDuration: 300, // Block for 5 minutes after too many attempts
  }),

  // Register - 3 attempts per 5 minutes
  register: new RateLimiterMemory({
    points: 3,
    duration: 300, // Per 5 minutes
    blockDuration: 600, // Block for 10 minutes after too many attempts
  }),

  // Password reset - 3 attempts per 30 minutes
  passwordReset: new RateLimiterMemory({
    points: 3,
    duration: 1800, // Per 30 minutes
    blockDuration: 3600, // Block for 1 hour after too many attempts
  }),

  // Token refresh - 10 attempts per minute
  tokenRefresh: new RateLimiterMemory({
    points: 10,
    duration: 60,
    blockDuration: 300,
  }),

  // Email verification - 5 attempts per hour
  emailVerification: new RateLimiterMemory({
    points: 5,
    duration: 3600, // Per hour
    blockDuration: 7200, // Block for 2 hours after too many attempts
  }),

  // MFA verification - 3 attempts per 10 minutes
  mfaVerify: new RateLimiterMemory({
    points: 3,
    duration: 600, // Per 10 minutes
    blockDuration: 1800, // Block for 30 minutes after too many attempts
  }),

  // API general limit - 100 requests per minute
  api: new RateLimiterMemory({
    points: 100,
    duration: 60,
  }),
};

/**
 * Reset all rate limiters - useful for testing
 */
export const resetAllRateLimiters = async (): Promise<void> => {
  // For testing, clear all limiters
  for (const limiter of Object.values(rateLimiters)) {
    // @ts-expect-error - resetKeys exists but isn't in the types
    if (typeof limiter.resetKeys === "function") {
      // @ts-expect-error - accessing method that exists at runtime
      await limiter.resetKeys();
    }
  }
};

/**
 * Get IP address from request
 * Handles various proxy scenarios and header formats
 */
export const getIpAddress = (req: Request): string => {
  // Try X-Forwarded-For header first (common in proxy setups)
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // If it's a comma separated list, get the first IP which is the client's
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(",")[0].trim();
    return ips;
  }

  // Fall back to other headers or the remoteAddress
  return (
    (req.headers["x-real-ip"] as string) ||
    req.connection.remoteAddress ||
    "unknown"
  );
};

/**
 * Rate limiting middleware
 * @param limiterKey Key of the rate limiter to use from the rateLimiters object
 */
export const rateLimitMiddleware = (limiterKey: keyof typeof rateLimiters) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const limiter = rateLimiters[limiterKey];

    if (!limiter) {
      // If no limiter configured for this key, just pass through
      return next();
    }

    // Use IP for anonymous users, userId+IP for authenticated users
    const userId = req.user?.id;
    const ip = getIpAddress(req);
    const key = userId ? `${userId}_${ip}` : ip;

    try {
      const rateLimitResult = await limiter.consume(key);

      // Set headers for rate limit info
      if (rateLimitResult) {
        res.set("X-RateLimit-Limit", String(limiter.points));
        res.set(
          "X-RateLimit-Remaining",
          String(rateLimitResult.remainingPoints),
        );
        res.set(
          "X-RateLimit-Reset",
          String(
            Math.round(Date.now() / 1000 + rateLimitResult.msBeforeNext / 1000),
          ),
        );
      }

      // If we get here, the request is allowed
      next();
    } catch (error) {
      // Check if this is a rate limit rejection (RateLimiterRes)
      if (
        error instanceof Error &&
        (error.name === "RateLimiterRes" ||
          (typeof error === "object" &&
            error !== null &&
            "remainingPoints" in error))
      ) {
        // Cast to an object with msBeforeNext
        const rateLimitError = error as unknown as { msBeforeNext: number };
        const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000) || 1;

        // Set headers
        res.set("Retry-After", String(retryAfter));
        res.set("X-RateLimit-Limit", String(limiter.points));
        res.set("X-RateLimit-Remaining", "0");
        res.set(
          "X-RateLimit-Reset",
          String(Math.round(Date.now() / 1000 + retryAfter)),
        );

        // Return rate limit error
        res.status(429).json({
          success: false,
          message: "Too many requests, please try again later",
          retryAfter: retryAfter,
        });
      } else {
        // For any other errors, log and continue
        console.error("Rate limiting error:", error);
        next();
      }
    }
  };
};

/**
 * Create a specialized rate limiter for specific security events
 * This can be used outside the HTTP middleware context
 */
export class SecurityRateLimiter {
  private limiter: RateLimiterMemory;

  constructor(options: {
    points: number;
    duration: number;
    blockDuration?: number;
  }) {
    this.limiter = new RateLimiterMemory(options);
  }

  /**
   * Check if an action is allowed
   * @param key The identifier for this action (userId, IP, etc)
   * @returns True if allowed, false if rate limited
   */
  async isAllowed(key: string): Promise<boolean> {
    try {
      await this.limiter.consume(key);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Record a failed attempt and throw error if limited
   * @param key The identifier for this action
   * @throws TooManyRequestsError if rate limit exceeded
   */
  async recordFailedAttempt(key: string): Promise<void> {
    try {
      await this.limiter.consume(key);
    } catch (_error) {
      throw new TooManyRequestsError(
        "Too many failed attempts. Please try again later.",
      );
    }
  }

  /**
   * Get current limit status for a key
   * @param key The identifier to check
   * @returns Points remaining and ms until reset
   */
  async getLimitStatus(
    key: string,
  ): Promise<{ remainingPoints: number; msBeforeNext: number }> {
    try {
      const res = await this.limiter.get(key);
      return {
        remainingPoints: res ? res.remainingPoints : this.limiter.points,
        msBeforeNext: res ? res.msBeforeNext : 0,
      };
    } catch (_error) {
      return {
        remainingPoints: 0,
        msBeforeNext: 300000, // Default 5 minutes
      };
    }
  }

  /**
   * Reset rate limit for a key
   * @param key The identifier to reset
   */
  async resetLimit(key: string): Promise<void> {
    await this.limiter.delete(key);
  }

  /**
   * Reset all keys (useful for testing)
   */
  async resetAllLimits(): Promise<void> {
    // @ts-expect-error - resetKeys exists but isn't in the types
    if (typeof this.limiter.resetKeys === "function") {
      // @ts-expect-error - accessing method that exists at runtime
      await this.limiter.resetKeys();
    }
  }
}
