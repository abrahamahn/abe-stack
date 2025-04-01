import { Request, Response } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { IErrorHandler } from "@/server/infrastructure/errors/IErrorHandler";

// Create a mock implementation of IErrorHandler for testing
class MockErrorHandler implements IErrorHandler {
  handleError(error: Error, _req: Request, res: Response): Response {
    return res.status(500).json({ error: error.message });
  }
}

describe("IErrorHandler", () => {
  let mockErrorHandler: IErrorHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockErrorHandler = new MockErrorHandler();
    mockRequest = {
      method: "GET",
      path: "/api/test",
      ip: "127.0.0.1",
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it("should implement handleError method", () => {
    const error = new Error("Test error");
    mockErrorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Test error",
    });
  });

  it("should handle different types of errors", () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "CustomError";
      }
    }

    const customError = new CustomError("Custom error");
    mockErrorHandler.handleError(
      customError,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Custom error",
    });
  });

  it("should return Response object", () => {
    const error = new Error("Test error");
    const result = mockErrorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(result).toBe(mockResponse);
  });
});
