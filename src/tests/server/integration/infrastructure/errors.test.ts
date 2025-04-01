import { Request, Response } from "express";
import { Container } from "inversify";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  AppError,
  NetworkError,
  InitializationError,
  ErrorHandler,
  ErrorCode,
  HttpStatus,
  GlobalErrorHandler,
  ServiceError,
} from "@infrastructure/errors";
import { ILoggerService } from "@infrastructure/logging";

import { TYPES } from "@/server/infrastructure/di/types";

describe("Error Handling Infrastructure Integration Tests", () => {
  let container: Container;
  let errorHandler: ErrorHandler;
  let mockLogger: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.spyOn>;
  let statusSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn(),
    };

    // Setup mock request and response
    mockRequest = {
      method: "GET",
      path: "/test",
      ip: "127.0.0.1",
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Setup spies
    jsonSpy = vi.spyOn(mockResponse, "json");
    statusSpy = vi.spyOn(mockResponse, "status");

    // Setup DI container
    container = new Container();
    container
      .bind<ILoggerService>(TYPES.LoggerService)
      .toConstantValue(mockLogger);
    container.bind<ErrorHandler>(TYPES.ErrorHandler).to(ErrorHandler);

    // Get error handler instance
    errorHandler = container.get<ErrorHandler>(TYPES.ErrorHandler);
  });

  describe("Error Handler Middleware", () => {
    it("should handle AppError with correct status code and response", () => {
      const error = new AppError("Test error", "TEST_ERROR", 400);

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "Test error",
            code: "TEST_ERROR",
          }),
        }),
      );
    });

    it("should handle ServiceError with metadata", () => {
      const error = new ServiceError("Service error", "SERVICE_ERROR", 503, {
        service: "TestService",
        operation: "test",
      });

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(503);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            service: "TestService",
            operation: "test",
          }),
        }),
      );
    });

    it("should handle standard Error with 500 status", () => {
      const error = new Error("Standard error");

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Infrastructure Error Integration", () => {
    it("should handle NetworkError with different scenarios", () => {
      const scenarios = [
        {
          error: new NetworkError("Connection timeout", 500, "TIMEOUT"),
          expectedCode: "NETWORK_ERROR",
        },
        {
          error: new NetworkError(
            "Connection refused",
            500,
            "CONNECTION_REFUSED",
          ),
          expectedCode: "NETWORK_ERROR",
        },
        {
          error: new NetworkError("DNS lookup failed", 500, "DNS_ERROR"),
          expectedCode: "NETWORK_ERROR",
        },
      ];

      scenarios.forEach(({ error, expectedCode }) => {
        errorHandler.handleError(
          error,
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: expectedCode,
            }),
          }),
        );
      });
    });

    it("should handle InitializationError with different components", () => {
      const components = [
        {
          component: "DatabaseService",
          message: "Failed to connect to database",
        },
        {
          component: "CacheService",
          message: "Failed to initialize cache",
        },
        {
          component: "WebSocketService",
          message: "Failed to start WebSocket server",
        },
      ];

      components.forEach(({ component, message }) => {
        const error = new InitializationError(component, message);

        errorHandler.handleError(
          error,
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: "INITIALIZATION_ERROR",
              component,
            }),
          }),
        );
      });
    });
  });

  describe("Service Error Factory Methods", () => {
    it("should create NotFoundError with correct structure", () => {
      const testCases = [
        {
          resource: "User",
          id: "123",
          expectedMessage: "User with ID '123' not found",
        },
        {
          resource: "Product",
          id: "456",
          expectedMessage: "Product with ID '456' not found",
        },
        {
          resource: "Order",
          expectedMessage: "Order not found",
        },
      ];

      testCases.forEach(({ resource, id, expectedMessage }) => {
        const error = ServiceError.notFound(resource, id);

        errorHandler.handleError(
          error,
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusSpy).toHaveBeenCalledWith(404);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: "NOT_FOUND",
              resource,
              resourceId: id,
              message: expectedMessage,
            }),
          }),
        );
      });
    });

    it("should create ValidationError with details", () => {
      const testCases = [
        {
          message: "Invalid user data",
          errors: {
            email: "Invalid email format",
            password: "Password too short",
          } as Record<string, string>,
        },
        {
          message: "Invalid product data",
          errors: {
            price: "Price must be positive",
            stock: "Stock must be integer",
          } as Record<string, string>,
        },
      ];

      testCases.forEach(({ message, errors }) => {
        const error = ServiceError.validation(message, errors);

        errorHandler.handleError(
          error,
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: "VALIDATION_ERROR",
              validationErrors: errors,
              message,
            }),
          }),
        );
      });
    });

    it("should create authorization errors", () => {
      const testCases = [
        {
          factory: ServiceError.unauthorized,
          message: "Unauthorized",
          code: "UNAUTHORIZED",
          status: 401,
        },
        {
          factory: ServiceError.forbidden,
          message: "Forbidden",
          code: "FORBIDDEN",
          status: 403,
        },
      ];

      testCases.forEach(({ factory, message, code, status }) => {
        const error = factory(message);

        errorHandler.handleError(
          error,
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusSpy).toHaveBeenCalledWith(status);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code,
              message,
            }),
          }),
        );
      });
    });
  });

  describe("Error Code and Status Integration", () => {
    it("should use correct HTTP status codes for error types", () => {
      const testCases = [
        {
          error: ServiceError.unauthorized(),
          expectedStatus: HttpStatus.UNAUTHORIZED,
        },
        {
          error: ServiceError.forbidden(),
          expectedStatus: HttpStatus.FORBIDDEN,
        },
        {
          error: ServiceError.notFound("Resource"),
          expectedStatus: HttpStatus.NOT_FOUND,
        },
        {
          error: ServiceError.validation("Invalid"),
          expectedStatus: HttpStatus.BAD_REQUEST,
        },
      ];

      testCases.forEach(({ error, expectedStatus }) => {
        errorHandler.handleError(
          error,
          mockRequest as Request,
          mockResponse as Response,
        );
        expect(statusSpy).toHaveBeenCalledWith(expectedStatus);
      });
    });

    it("should map error codes correctly", () => {
      const testCases = [
        {
          error: new AppError("Test", ErrorCode.BAD_REQUEST),
          expectedCode: "BAD_REQUEST",
        },
        {
          error: new AppError("Test", ErrorCode.NOT_FOUND),
          expectedCode: "NOT_FOUND",
        },
        {
          error: new AppError("Test", ErrorCode.FORBIDDEN),
          expectedCode: "FORBIDDEN",
        },
      ];

      testCases.forEach(({ error, expectedCode }) => {
        errorHandler.handleError(
          error,
          mockRequest as Request,
          mockResponse as Response,
        );
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: expectedCode }),
          }),
        );
      });
    });
  });

  describe("Production vs Development Error Handling", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should hide error details in production", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("Internal implementation detail");

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Internal server error",
          }),
        }),
      );
    });

    it("should show error details in development", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Internal implementation detail");

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Internal implementation detail",
            stack: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("Global Error Handler Integration", () => {
    it("should register global handlers correctly", () => {
      const processOnSpy = vi.spyOn(process, "on");

      GlobalErrorHandler.register(mockLogger);

      expect(processOnSpy).toHaveBeenCalledWith(
        "uncaughtException",
        expect.any(Function),
      );
      expect(processOnSpy).toHaveBeenCalledWith(
        "unhandledRejection",
        expect.any(Function),
      );
    });

    it("should log uncaught exceptions", () => {
      GlobalErrorHandler.register(mockLogger);

      const error = new Error("Uncaught error");
      process.emit("uncaughtException", error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Uncaught Exception",
        expect.objectContaining({
          error: "Uncaught error",
          stack: expect.any(String),
        }),
      );
    });

    it("should log unhandled rejections", () => {
      GlobalErrorHandler.register(mockLogger);

      const reason = new Error("Unhandled rejection");
      const promise = Promise.resolve();
      process.emit("unhandledRejection", reason, promise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unhandled Promise Rejection",
        expect.objectContaining({
          reason: "Unhandled rejection",
          stack: expect.any(String),
        }),
      );
    });
  });
});
