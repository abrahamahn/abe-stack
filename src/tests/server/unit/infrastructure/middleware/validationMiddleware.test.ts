import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  validateRequest,
  validateQuery,
  validateParams,
} from "@/server/infrastructure/middleware/validationMiddleware";

describe("Validation Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  describe("validateRequest", () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0),
    });

    it("should pass valid request body", () => {
      mockReq.body = { name: "John", age: 25 };
      validateRequest(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should reject invalid request body", () => {
      mockReq.body = { name: "John", age: -1 };
      validateRequest(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction,
      );
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Validation error",
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: "age",
              message: expect.stringContaining("greater than or equal to 0"),
            }),
          ]),
        }),
      );
    });

    it("should handle missing required fields", () => {
      mockReq.body = { age: 25 };
      validateRequest(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction,
      );
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Validation error",
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: "name",
              message: expect.stringContaining("required"),
            }),
          ]),
        }),
      );
    });
  });

  describe("validateQuery", () => {
    const schema = Joi.object({
      page: Joi.number().min(1),
      limit: Joi.number().max(100),
    });

    it("should pass valid query parameters", () => {
      mockReq.query = { page: "1", limit: "50" };
      validateQuery(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should reject invalid query parameters", () => {
      mockReq.query = { page: "0", limit: "200" };
      validateQuery(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction,
      );
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Query parameter validation error",
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: "page",
              message: expect.stringContaining("greater than or equal to 1"),
            }),
            expect.objectContaining({
              field: "limit",
              message: expect.stringContaining("less than or equal to 100"),
            }),
          ]),
        }),
      );
    });
  });

  describe("validateParams", () => {
    const schema = Joi.object({
      id: Joi.string().uuid(),
      type: Joi.string().valid("user", "admin"),
    });

    it("should pass valid URL parameters", () => {
      mockReq.params = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        type: "user",
      };
      validateParams(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should reject invalid URL parameters", () => {
      mockReq.params = { id: "invalid-uuid", type: "invalid" };
      validateParams(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction,
      );
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "URL parameter validation error",
        errors: [
          {
            field: "id",
            message: '"id" must be a valid GUID',
          },
          {
            field: "type",
            message: '"type" must be one of [user, admin]',
          },
        ],
      });
    });
  });
});
