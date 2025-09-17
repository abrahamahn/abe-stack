import { Request, Response, NextFunction } from "express";
import {
  RateLimiterMemory,
  RateLimiterRes,
  RateLimiterRedis,
  RateLimiterAbstract,
} from "rate-limiter-flexible";

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

/**
 * Rate limiter configuration options
 */
export interface RateLimiterOptions {
  /** Maximum number of points (requests) within duration */
  points: number;

  /** Duration in seconds */
  duration: number;

  /** Duration to block in seconds after points are consumed */
  blockDuration?: number;

  /** Custom key prefix to distinguish different rate limiters */
  keyPrefix?: string;

  /** Redis client instance for distributed rate limiting */
  redisClient?: any;

  /** Store type - 'memory' (default) or 'redis' */
  storeType?: "memory" | "redis";
}

/**
 * Response format for rate limit status
 */
export interface RateLimitStatus {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Number of attempts remaining */
  remaining: number;

  /** Total points allowed in the time window */
  limit: number;

  /** Seconds until the rate limit resets */
  resetIn: number;

  /** Timestamp when the rate limit resets */
  resetAt: Date;
}

/**
 * Options for customizing rate limit headers
 */
export interface RateLimitHeaderOptions {
  /** Whether to include rate limit headers in responses */
  enableHeaders?: boolean;

  /** Custom header name for limit total (default: X-RateLimit-Limit) */
  limitHeader?: string;

  /** Custom header name for remaining attempts (default: X-RateLimit-Remaining) */
  remainingHeader?: string;

  /** Custom header name for reset time (default: X-RateLimit-Reset) */
  resetHeader?: string;

  /** Custom header name for retry after (default: Retry-After) */
  retryAfterHeader?: string;
}

/**
 * Options for customizing IP resolution
 */
export interface IPResolutionOptions {
  /** List of trusted proxies (IP addresses or CIDR ranges) */
  trustedProxies?: string[];

  /** Custom headers to check for IP address (in order of precedence) */
  ipHeaders?: string[];

  /** Skip IP resolution and always use a fixed key */
  skipIPResolution?: boolean;

  /** Whether to trust X-Forwarded-For header (default: true) */
  trustXForwardedFor?: boolean;
}

/**
 * Configuration for rate limit middleware
 */
export interface RateLimitConfig {
  /** Rate limiter options */
  limiterOptions: RateLimiterOptions;

  /** Header customization options */
  headerOptions?: RateLimitHeaderOptions;

  /** IP resolution options */
  ipOptions?: IPResolutionOptions;

  /** Whether to include user ID in rate limit key when available */
  includeUserInKey?: boolean;

  /** Whether to skip rate limiting for certain requests */
  skip?: (req: Request) => boolean | Promise<boolean>;

  /** Custom key generator function */
  keyGenerator?: (req: Request) => string | Promise<string>;

  /** Custom error handler */
  onRateLimited?: (
    req: Request,
    res: Response,
    next: NextFunction,
    rateLimitInfo: RateLimitStatus
  ) => void;
}

// Default header options
const DEFAULT_HEADER_OPTIONS: Required<RateLimitHeaderOptions> = {
  enableHeaders: true,
  limitHeader: "X-RateLimit-Limit",
  remainingHeader: "X-RateLimit-Remaining",
  resetHeader: "X-RateLimit-Reset",
  retryAfterHeader: "Retry-After",
};

// Default IP resolution options
const DEFAULT_IP_OPTIONS: Required<IPResolutionOptions> = {
  trustedProxies: ["127.0.0.1", "::1"],
  ipHeaders: [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ],
  skipIPResolution: false,
  trustXForwardedFor: true,
};

// Improve type safety for RateLimiterRes
interface RateLimiterResType extends RateLimiterRes {
  msBeforeNext: number;
  remainingPoints: number;
  consumedPoints: number;
}

/**
 * Creates a rate limiter based on the provided options
 */
export function createRateLimiter(
  options: RateLimiterOptions
): RateLimiterAbstract {
  // Extract common options for store
  const commonOptions = {
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration,
    keyPrefix: options.keyPrefix,
  };

  // Determine which type of store to use
  if (options.storeType === "redis" && options.redisClient) {
    return new RateLimiterRedis({
      ...commonOptions,
      storeClient: options.redisClient,
    });
  }

  // Default to memory store
  return new RateLimiterMemory(commonOptions);
}

// Initialize rate limiters with memory implementation by default
export const rateLimiters: Record<string, RateLimiterAbstract> = {
  // Login - 5 attempts per minute
  login: new RateLimiterMemory({
    points: 5, // Number of attempts
    duration: 60, // Per 60 seconds
    blockDuration: 300, // Block for 5 minutes after too many attempts
    keyPrefix: "rl:login",
  }),

  // Register - 3 attempts per 5 minutes
  register: new RateLimiterMemory({
    points: 3,
    duration: 300, // Per 5 minutes
    blockDuration: 600, // Block for 10 minutes after too many attempts
    keyPrefix: "rl:register",
  }),

  // Password reset - 3 attempts per 30 minutes
  passwordReset: new RateLimiterMemory({
    points: 3,
    duration: 1800, // Per 30 minutes
    blockDuration: 3600, // Block for 1 hour after too many attempts
    keyPrefix: "rl:pwreset",
  }),

  // Token refresh - 10 attempts per minute
  tokenRefresh: new RateLimiterMemory({
    points: 10,
    duration: 60,
    blockDuration: 300,
    keyPrefix: "rl:token",
  }),

  // Email verification - 5 attempts per hour
  emailVerification: new RateLimiterMemory({
    points: 5,
    duration: 3600, // Per hour
    blockDuration: 7200, // Block for 2 hours after too many attempts
    keyPrefix: "rl:email",
  }),

  // MFA verification - 3 attempts per 10 minutes
  mfaVerify: new RateLimiterMemory({
    points: 3,
    duration: 600, // Per 10 minutes
    blockDuration: 1800, // Block for 30 minutes after too many attempts
    keyPrefix: "rl:mfa",
  }),

  // API general limit - 100 requests per minute
  api: new RateLimiterMemory({
    points: 100,
    duration: 60,
    keyPrefix: "rl:api",
  }),
};

/**
 * Configure rate limiters to use Redis for distributed applications
 * @param redisClient Redis client instance
 * @param options Additional options for Redis configuration
 */
export const configureDistributedRateLimiting = (
  redisClient: any,
  options: { prefix?: string } = {}
): void => {
  const prefix = options.prefix || "rl";

  // Recreate all limiters with Redis
  for (const [key, limiter] of Object.entries(rateLimiters)) {
    // Extract current configuration
    const config = {
      points: limiter.points,
      duration: limiter.duration,
      // Use type assertion to access blockDuration
      blockDuration: (limiter as any).blockDurationMs
        ? (limiter as any).blockDurationMs / 1000
        : undefined,
      keyPrefix: `${prefix}:${key}`,
      storeType: "redis" as const,
      redisClient,
    };

    // Replace with Redis implementation
    rateLimiters[key] = createRateLimiter(config);
  }
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
export const getIpAddress = (
  req: Request,
  options: IPResolutionOptions = DEFAULT_IP_OPTIONS
): string => {
  if (options.skipIPResolution) {
    return "unknown";
  }

  // Try custom headers in order of precedence
  for (const header of options.ipHeaders || DEFAULT_IP_OPTIONS.ipHeaders) {
    const headerValue = req.headers[header.toLowerCase()];
    if (headerValue) {
      if (Array.isArray(headerValue)) {
        if (headerValue[0]) {
          return extractIpFromHeader(
            headerValue[0],
            options.trustXForwardedFor
          );
        }
      } else {
        return extractIpFromHeader(headerValue, options.trustXForwardedFor);
      }
    }
  }

  // Fall back to connection remoteAddress
  return req.connection.remoteAddress || "unknown";
};

/**
 * Helper to extract IP from header value
 */
const extractIpFromHeader = (
  headerValue: string,
  trustXForwardedFor: boolean = true
): string => {
  if (trustXForwardedFor && headerValue.includes(",")) {
    // When behind multiple proxies, the client IP is the first one
    return headerValue.split(",")[0].trim();
  }
  return headerValue.trim();
};

/**
 * Rate limiting middleware
 * @param limiterKey Key of the rate limiter to use from the rateLimiters object
 * @param options Additional configuration options
 */
export const rateLimitMiddleware = (
  limiterKey: keyof typeof rateLimiters,
  options: Partial<RateLimitConfig> = {}
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const limiter = rateLimiters[limiterKey];

    if (!limiter) {
      // If no limiter configured for this key, just pass through
      return next();
    }

    // Check if we should skip rate limiting
    if (options.skip && (await Promise.resolve(options.skip(req)))) {
      return next();
    }

    const headerOptions: Required<RateLimitHeaderOptions> = {
      ...DEFAULT_HEADER_OPTIONS,
      ...options.headerOptions,
    };

    const ipOptions: Required<IPResolutionOptions> = {
      ...DEFAULT_IP_OPTIONS,
      ...options.ipOptions,
    };

    // Generate key for rate limiting
    let key: string;
    try {
      if (options.keyGenerator) {
        key = await Promise.resolve(options.keyGenerator(req));
      } else {
        // Use IP for anonymous users, userId+IP for authenticated users if includeUserInKey is true
        const userId = options.includeUserInKey !== false && req.user?.id;
        const ip = getIpAddress(req, ipOptions);
        key = userId ? `${userId}_${ip}` : ip;
      }
    } catch (error) {
      // If key generation fails, log and continue
      console.error("Rate limiting key generation error:", error);
      return next();
    }

    try {
      // Try to consume a point
      const rateLimitResult = await limiter.consume(key);

      // Only set headers if enabled
      if (headerOptions.enableHeaders) {
        // Set headers for rate limit info
        res.set(headerOptions.limitHeader, String(limiter.points));
        res.set(
          headerOptions.remainingHeader,
          String(rateLimitResult.remainingPoints)
        );
        res.set(
          headerOptions.resetHeader,
          String(
            Math.round(Date.now() / 1000 + rateLimitResult.msBeforeNext / 1000)
          )
        );
      }

      // If we get here, the request is allowed
      next();
      return;
    } catch (error) {
      // Check if this is a rate limit rejection (RateLimiterRes)
      if (
        error instanceof Error &&
        (error.name === "RateLimiterRes" ||
          (typeof error === "object" &&
            error !== null &&
            "remainingPoints" in error &&
            "msBeforeNext" in error))
      ) {
        // Cast to RateLimiterRes with proper typing
        const rateLimitError = error as unknown as RateLimiterResType;
        const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000) || 1;
        const resetTime = Math.round(Date.now() / 1000 + retryAfter);

        // Create rate limit status object
        const rateLimitStatus: RateLimitStatus = {
          allowed: false,
          remaining: 0,
          limit: limiter.points,
          resetIn: retryAfter,
          resetAt: new Date(resetTime * 1000),
        };

        // Set headers if enabled
        if (headerOptions.enableHeaders) {
          res.set(headerOptions.retryAfterHeader, String(retryAfter));
          res.set(headerOptions.limitHeader, String(limiter.points));
          res.set(headerOptions.remainingHeader, "0");
          res.set(headerOptions.resetHeader, String(resetTime));
        }

        // Use custom error handler if provided
        if (options.onRateLimited) {
          options.onRateLimited(req, res, next, rateLimitStatus);
          return;
        }

        // Default rate limit error response
        res.status(429).json({
          success: false,
          message: "Too many requests, please try again later",
          retryAfter: retryAfter,
          resetAt: rateLimitStatus.resetAt.toISOString(),
          error: "RATE_LIMIT_EXCEEDED",
        });
        return;
      } else {
        // For any other errors, log and continue
        console.error("Rate limiting error:", error);
        next();
        return;
      }
    }
  };
};

/**
 * Create a specialized rate limiter for specific security events
 * This can be used outside the HTTP middleware context
 */
export class SecurityRateLimiter {
  private limiter: RateLimiterAbstract;
  private keyPrefix: string;

  constructor(options: RateLimiterOptions) {
    this.keyPrefix = options.keyPrefix || "security";
    this.limiter = createRateLimiter({
      ...options,
      keyPrefix: this.keyPrefix,
    });
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
    } catch (error) {
      // If this is a rate limiter error
      if (error && typeof error === "object" && "msBeforeNext" in error) {
        const rateLimitError = error as RateLimiterResType;
        const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000) || 1;
        throw new TooManyRequestsError(
          "Too many failed attempts. Please try again later.",
          {
            retryAfter,
            resetAt: new Date(
              Date.now() + rateLimitError.msBeforeNext
            ).toISOString(),
          }
        );
      }

      // If it's another type of error, just throw it
      throw error;
    }
  }

  /**
   * Consume points without throwing (for non-critical rate limiting)
   * @param key The identifier to consume points for
   * @param points Number of points to consume (default: 1)
   * @returns Rate limit status
   */
  async consumePoints(
    key: string,
    points: number = 1
  ): Promise<RateLimitStatus> {
    if (!key) {
      throw new Error("Rate limiting key cannot be empty");
    }

    try {
      // Use proper typing to handle the mismatch
      const res = (await this.limiter.consume(
        key,
        points
      )) as RateLimiterResType;
      return {
        allowed: true,
        remaining: res.remainingPoints,
        limit: this.limiter.points,
        resetIn: Math.ceil(res.msBeforeNext / 1000),
        resetAt: new Date(Date.now() + res.msBeforeNext),
      };
    } catch (error) {
      if (error && typeof error === "object" && "msBeforeNext" in error) {
        const rateLimitError = error as RateLimiterResType;
        return {
          allowed: false,
          remaining: 0,
          limit: this.limiter.points,
          resetIn: Math.ceil(rateLimitError.msBeforeNext / 1000),
          resetAt: new Date(Date.now() + rateLimitError.msBeforeNext),
        };
      }

      // For other errors, return a fallback
      return {
        allowed: false,
        remaining: 0,
        limit: this.limiter.points,
        resetIn: 300, // Default 5 minutes
        resetAt: new Date(Date.now() + 300000),
      };
    }
  }

  /**
   * Get current limit status for a key
   * @param key The identifier to check
   * @returns Rate limit status information
   */
  async getLimitStatus(key: string): Promise<RateLimitStatus> {
    try {
      const res = await this.limiter.get(key);
      if (!res) {
        return {
          allowed: true,
          remaining: this.limiter.points,
          limit: this.limiter.points,
          resetIn: 0,
          resetAt: new Date(),
        };
      }

      return {
        allowed: res.remainingPoints > 0,
        remaining: res.remainingPoints,
        limit: this.limiter.points,
        resetIn: Math.ceil(res.msBeforeNext / 1000),
        resetAt: new Date(Date.now() + res.msBeforeNext),
      };
    } catch (_error) {
      return {
        allowed: false,
        remaining: 0,
        limit: this.limiter.points,
        resetIn: 300, // Default 5 minutes
        resetAt: new Date(Date.now() + 300000),
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
   * Apply additional penalty to a key (consumes more points)
   * @param key The identifier to penalize
   * @param points Number of points to consume as penalty (default: 1)
   */
  async applyPenalty(key: string, points: number = 1): Promise<void> {
    if (!key) {
      throw new Error("Rate limiting key cannot be empty");
    }

    if (points <= 0) {
      return; // Nothing to do for zero or negative points
    }

    try {
      // Get current points data
      const res = (await this.limiter.get(key)) as RateLimiterResType | null;

      if (res) {
        // Calculate points to consume - either the requested amount or all remaining
        const pointsToConsume = Math.min(res.remainingPoints, points);

        if (pointsToConsume > 0) {
          // TypeScript doesn't recognize the overloaded method, so we use a workaround
          const consumeMethod = this.limiter.consume as unknown as (
            key: string,
            pointsToConsume?: number
          ) => Promise<RateLimiterResType>;

          await consumeMethod(key, pointsToConsume);
        }
      } else {
        // If no data yet, consume some points to record the penalty
        const pointsToConsume = Math.min(this.limiter.points - 1, points);

        if (pointsToConsume > 0) {
          // TypeScript doesn't recognize the overloaded method, so we use a workaround
          const consumeMethod = this.limiter.consume as unknown as (
            key: string,
            pointsToConsume?: number
          ) => Promise<RateLimiterResType>;

          await consumeMethod(key, pointsToConsume);
        }
      }
    } catch (error) {
      // Ignore all errors from penalty application but log them
      console.error("Error applying rate limit penalty:", error);
    }
  }

  /**
   * Reward good behavior by adding points back
   * @param key The identifier to reward
   * @param points Number of points to reward (default: 1)
   */
  async reward(key: string, points: number = 1): Promise<void> {
    try {
      await this.limiter.reward(key, points);
    } catch (error) {
      // Ignore errors from reward
    }
  }

  /**
   * Block a key for a specified duration
   * @param key The identifier to block
   * @param durationSeconds Duration to block in seconds (default: use limiter's blockDuration)
   */
  async blockKey(key: string, _durationSeconds?: number): Promise<void> {
    try {
      // Custom implementation - consume all available points to simulate blocking
      // Get current points
      const res = await this.limiter.get(key);

      if (res && res.remainingPoints > 0) {
        // If there are points to consume, consume them all
        // Use type assertion to handle the mismatch between TypeScript types and actual API
        await (this.limiter as any).consume(key, res.remainingPoints);
      } else if (!res) {
        // If no data yet, consume all available points
        await (this.limiter as any).consume(key, this.limiter.points);
      }

      // The key is now blocked until the rate limit resets
    } catch (error) {
      // Ignore errors from block
    }
  }

  /**
   * Check if a key is currently blocked
   * @param key The identifier to check
   * @returns Whether the key is blocked
   */
  async isBlocked(key: string): Promise<boolean> {
    try {
      const res = await this.limiter.get(key);
      // A key is blocked if it has no points left and has msBeforeNext > 0
      return res ? res.remainingPoints <= 0 && res.msBeforeNext > 0 : false;
    } catch (_error) {
      return false;
    }
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

// Export additional utility functions

/**
 * Creates a rate limit key combining multiple parts
 */
export const createRateLimitKey = (
  ...parts: (string | undefined | null)[]
): string => {
  return parts.filter(Boolean).join(":");
};

/**
 * Creates an IP-based rate limiter middleware with common settings
 */
export const ipRateLimiter = (
  pointsPerMinute: number,
  options: Partial<RateLimitConfig> = {}
) => {
  const limiter = new RateLimiterMemory({
    points: pointsPerMinute,
    duration: 60, // 1 minute
    keyPrefix: options.limiterOptions?.keyPrefix || "ip-limit",
    blockDuration: options.limiterOptions?.blockDuration,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting?
    if (options.skip && (await Promise.resolve(options.skip(req)))) {
      return next();
    }

    // Get IP address
    const ipOptions = { ...DEFAULT_IP_OPTIONS, ...options.ipOptions };
    const ip = getIpAddress(req, ipOptions);

    // Set header options
    const headerOptions = {
      ...DEFAULT_HEADER_OPTIONS,
      ...options.headerOptions,
    };

    try {
      // Consume a point
      const rateLimitResult = await limiter.consume(ip);

      // Set headers if enabled
      if (headerOptions.enableHeaders) {
        res.set(headerOptions.limitHeader, String(limiter.points));
        res.set(
          headerOptions.remainingHeader,
          String(rateLimitResult.remainingPoints)
        );
        res.set(
          headerOptions.resetHeader,
          String(
            Math.round(Date.now() / 1000 + rateLimitResult.msBeforeNext / 1000)
          )
        );
      }

      // Request is allowed
      next();
    } catch (error) {
      // Handle rate limit exceeded
      if (error && typeof error === "object" && "msBeforeNext" in error) {
        const rateLimitError = error as RateLimiterRes;
        const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000) || 1;
        const resetTime = Math.round(Date.now() / 1000 + retryAfter);

        // Create rate limit status
        const rateLimitStatus: RateLimitStatus = {
          allowed: false,
          remaining: 0,
          limit: limiter.points,
          resetIn: retryAfter,
          resetAt: new Date(resetTime * 1000),
        };

        // Set headers if enabled
        if (headerOptions.enableHeaders) {
          res.set(headerOptions.retryAfterHeader, String(retryAfter));
          res.set(headerOptions.limitHeader, String(limiter.points));
          res.set(headerOptions.remainingHeader, "0");
          res.set(headerOptions.resetHeader, String(resetTime));
        }

        // Use custom handler if provided
        if (options.onRateLimited) {
          return options.onRateLimited(req, res, next, rateLimitStatus);
        }

        // Default response
        res.status(429).json({
          success: false,
          message:
            "Rate limit exceeded. Too many requests from this IP address.",
          retryAfter: retryAfter,
          resetAt: rateLimitStatus.resetAt.toISOString(),
          error: "IP_RATE_LIMIT_EXCEEDED",
        });
      } else {
        // For other errors, just pass through
        console.error("IP rate limiting error:", error);
        next();
      }
    }
  };
};

/**
 * Create a custom rate limiter with specified options
 * @param options Rate limiter configuration
 * @returns A configured rate limiter instance
 */
export const createCustomRateLimiter = (
  options: RateLimiterOptions
): RateLimiterAbstract => {
  return createRateLimiter(options);
};
