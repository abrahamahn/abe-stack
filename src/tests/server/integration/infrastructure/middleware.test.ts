import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  rateLimitMiddleware,
  SecurityRateLimiter,
} from "@/server/infrastructure/middleware/rateLimitMiddleware";
import {
  validateRequest,
  validateQuery,
  validateParams,
} from "@/server/infrastructure/middleware/validationMiddleware";

describe("Middleware Infrastructure Integration Tests", () => {
  describe("Validation Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
      mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      nextFunction = vi.fn();
    });

    describe("Request Body Validation", () => {
      it("should validate valid request body", () => {
        const schema = Joi.object({
          username: Joi.string().required(),
          email: Joi.string().email().required(),
        });

        mockRequest = {
          body: {
            username: "testuser",
            email: "test@example.com",
          },
        };

        validateRequest(schema)(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it("should reject invalid request body", () => {
        const schema = Joi.object({
          username: Joi.string().required(),
          email: Joi.string().email().required(),
        });

        mockRequest = {
          body: {
            username: "",
            email: "invalid-email",
          },
        };

        validateRequest(schema)(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Validation error",
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: "username",
                message: expect.any(String),
              }),
              expect.objectContaining({
                field: "email",
                message: expect.any(String),
              }),
            ]),
          }),
        );
      });

      it("should strip unknown fields", () => {
        const schema = Joi.object({
          username: Joi.string().required(),
        });

        mockRequest = {
          body: {
            username: "testuser",
            unknown: "field",
          },
        };

        validateRequest(schema)(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe("Query Parameter Validation", () => {
      it("should validate valid query parameters", () => {
        const schema = Joi.object({
          page: Joi.number().integer().min(1),
          limit: Joi.number().integer().min(1).max(100),
        });

        mockRequest = {
          query: {
            page: "1",
            limit: "10",
          },
        };

        validateQuery(schema)(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it("should reject invalid query parameters", () => {
        const schema = Joi.object({
          page: Joi.number().integer().min(1),
          limit: Joi.number().integer().min(1).max(100),
        });

        mockRequest = {
          query: {
            page: "-1",
            limit: "1000",
          },
        };

        validateQuery(schema)(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe("URL Parameter Validation", () => {
      it("should validate valid URL parameters", () => {
        const schema = Joi.object({
          id: Joi.string().uuid().required(),
        });

        mockRequest = {
          params: {
            id: "123e4567-e89b-12d3-a456-426614174000",
          },
        };

        validateParams(schema)(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it("should reject invalid URL parameters", () => {
        const schema = Joi.object({
          id: Joi.string().uuid().required(),
        });

        mockRequest = {
          params: {
            id: "invalid-uuid",
          },
        };

        validateParams(schema)(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe("Rate Limiting Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        ip: "127.0.0.1",
        connection: {
          remoteAddress: "127.0.0.1",
        } as any,
      };
      mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        set: vi.fn(),
      };
      nextFunction = vi.fn();
    });

    describe("HTTP Middleware", () => {
      it("should allow requests within rate limit", async () => {
        await rateLimitMiddleware("api")(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it("should block requests exceeding rate limit", async () => {
        // Make multiple requests to exceed limit
        for (let i = 0; i < 101; i++) {
          await rateLimitMiddleware("api")(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction,
          );
        }

        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(mockResponse.set).toHaveBeenCalledWith(
          "Retry-After",
          expect.any(String),
        );
      });

      it("should handle authenticated users", async () => {
        mockRequest.user = { id: "test-user" };

        await rateLimitMiddleware("api")(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it("should respect different limits for different endpoints", async () => {
        // Login has lower limit than API
        for (let i = 0; i < 6; i++) {
          await rateLimitMiddleware("login")(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction,
          );
        }

        expect(mockResponse.status).toHaveBeenCalledWith(429);
      });
    });

    describe("Security Rate Limiter", () => {
      let limiter: SecurityRateLimiter;

      beforeEach(() => {
        limiter = new SecurityRateLimiter({
          points: 3,
          duration: 60,
          blockDuration: 300,
        });
      });

      it("should track failed attempts", async () => {
        const key = "test-key";

        // First attempts should succeed
        expect(await limiter.isAllowed(key)).toBe(true);
        await limiter.recordFailedAttempt(key);

        const status = await limiter.getLimitStatus(key);
        expect(status.remainingPoints).toBeLessThan(3);
      });

      it("should block after too many attempts", async () => {
        const key = "test-key";

        // Exhaust attempts
        for (let i = 0; i < 3; i++) {
          await limiter.recordFailedAttempt(key);
        }

        // Next attempt should be blocked
        await expect(limiter.recordFailedAttempt(key)).rejects.toThrow(
          "Too many failed attempts",
        );
      });

      it("should reset limits", async () => {
        const key = "test-key";

        // Record some failed attempts
        await limiter.recordFailedAttempt(key);
        await limiter.recordFailedAttempt(key);

        // Reset the limit
        await limiter.resetLimit(key);

        // Should have full points again
        const status = await limiter.getLimitStatus(key);
        expect(status.remainingPoints).toBe(3);
      });

      it("should provide accurate limit status", async () => {
        const key = "test-key";

        const initialStatus = await limiter.getLimitStatus(key);
        expect(initialStatus.remainingPoints).toBe(3);
        expect(initialStatus.msBeforeNext).toBe(0);

        await limiter.recordFailedAttempt(key);

        const updatedStatus = await limiter.getLimitStatus(key);
        expect(updatedStatus.remainingPoints).toBe(2);
        expect(updatedStatus.msBeforeNext).toBeGreaterThan(0);
      });
    });
  });
});
