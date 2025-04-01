import { Request, Response, NextFunction } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  rateLimitMiddleware,
  SecurityRateLimiter,
} from "@/server/infrastructure/middleware/rateLimitMiddleware";

describe("Rate Limit Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      connection: {
        remoteAddress: "127.0.0.1",
        write: vi.fn(),
        connect: vi.fn(),
        setEncoding: vi.fn(),
        destroySoon: vi.fn(),
        ...Object.fromEntries(
          Array.from({ length: 84 }, (_, i) => [`method${i}`, vi.fn()]),
        ),
      } as any,
      user: undefined,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      set: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  describe("IP Address Resolution", () => {
    it("should use X-Forwarded-For header when available", () => {
      mockReq.headers = { "x-forwarded-for": "192.168.1.1" };
      const middleware = rateLimitMiddleware("api");
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should use X-Real-IP header when available", () => {
      mockReq.headers = { "x-real-ip": "192.168.1.2" };
      const middleware = rateLimitMiddleware("api");
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should fallback to remoteAddress", () => {
      const middleware = rateLimitMiddleware("api");
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("Rate Limiting", () => {
    it("should allow requests within limit", async () => {
      const middleware = rateLimitMiddleware("api");
      await middleware(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should block requests exceeding limit", async () => {
      const middleware = rateLimitMiddleware("login");
      // Make 6 requests (limit is 5)
      for (let i = 0; i < 6; i++) {
        await middleware(mockReq as Request, mockRes as Response, nextFunction);
      }
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Too many requests, please try again later",
        }),
      );
    });

    it("should handle authenticated users with userId", async () => {
      mockReq.user = { id: "user123" };
      const middleware = rateLimitMiddleware("api");
      await middleware(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("SecurityRateLimiter", () => {
    let limiter: SecurityRateLimiter;

    beforeEach(() => {
      limiter = new SecurityRateLimiter({
        points: 3,
        duration: 60,
        blockDuration: 120,
      });
    });

    it("should allow actions within limit", async () => {
      const result = await limiter.isAllowed("test-key");
      expect(result).toBe(true);
    });

    it("should block actions exceeding limit", async () => {
      // Make 4 attempts (limit is 3)
      for (let i = 0; i < 4; i++) {
        await limiter.recordFailedAttempt("test-key");
      }
      await expect(limiter.recordFailedAttempt("test-key")).rejects.toThrow(
        "Too many failed attempts",
      );
    });

    it("should return correct limit status", async () => {
      const status = await limiter.getLimitStatus("test-key");
      expect(status).toHaveProperty("remainingPoints", 3);
      expect(status).toHaveProperty("msBeforeNext");
    });

    it("should reset limit", async () => {
      await limiter.recordFailedAttempt("test-key");
      await limiter.resetLimit("test-key");
      const status = await limiter.getLimitStatus("test-key");
      expect(status.remainingPoints).toBe(3);
    });
  });
});
