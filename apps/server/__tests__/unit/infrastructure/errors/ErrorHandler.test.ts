import { Request, Response } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { AppError } from "@/server/infrastructure/errors/AppError";
import { ErrorHandler } from "@/server/infrastructure/errors/ErrorHandler";
import { NetworkError } from "@/server/infrastructure/errors/infrastructure/InfrastructureError";
import { ServiceError } from "@/server/infrastructure/errors/ServiceError";
import { InitializationError } from "@/server/infrastructure/errors/TechnicalError";
import { ILoggerService } from "@/server/infrastructure/logging";

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;
  let mockLogger: ILoggerService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      createLogger: vi.fn(),
      withContext: vi.fn(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    mockRequest = {
      method: "GET",
      path: "/test",
      ip: "127.0.0.1",
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    errorHandler = new ErrorHandler(mockLogger);
  });

  it("should handle standard Error", () => {
    const error = new Error("Standard error");

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Unhandled error: Standard error",
      expect.any(Object),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);

    // Use expect.any for the error message since it can vary in development vs production
    const jsonResponse = (mockResponse.json as any).mock.calls[0][0];
    expect(jsonResponse).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "INTERNAL_ERROR",
        }),
      }),
    );
  });

  it("should handle ServiceError", () => {
    const error = new ServiceError("Service error", "SERVICE_ERROR", 400, {
      detail: "test",
    });

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "API Error: Service error",
      expect.any(Object),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: "Service error",
        code: "SERVICE_ERROR",
        detail: "test",
      },
    });
  });

  it("should handle NetworkError", () => {
    const error = new NetworkError(
      "https://api.example.com",
      503,
      "Network timeout",
    );

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Network Error: Network request to 'https://api.example.com' failed with status 503: Network timeout",
      expect.any(Object),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: error.message,
        code: "NETWORK_ERROR",
      },
    });
  });

  it("should handle InitializationError", () => {
    const error = new InitializationError(
      "TestComponent",
      "Failed to initialize",
    );

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Initialization Error: Failed to initialize TestComponent: Failed to initialize",
      expect.any(Object),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: error.message,
        code: "INITIALIZATION_ERROR",
        component: "TestComponent",
      },
    });
  });

  it("should handle AppError", () => {
    const error = new AppError("App error", "APP_ERROR", 418);

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "App Error: App error",
      expect.any(Object),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(418);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: "App error",
        code: "APP_ERROR",
      },
    });
  });

  it("should handle production environment", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const error = new Error("Sensitive error");

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      },
    });

    process.env.NODE_ENV = originalEnv;
  });

  it("should handle development environment", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const error = new Error("Debug error");

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: "Debug error",
        code: "INTERNAL_ERROR",
        stack: expect.any(String),
      },
    });

    process.env.NODE_ENV = originalEnv;
  });

  it("should handle ServiceError with status code >= 500", () => {
    const error = new ServiceError("Critical error", "CRITICAL", 500);

    errorHandler.handleError(
      error,
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "API Error: Critical error",
      expect.any(Object),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });
});
