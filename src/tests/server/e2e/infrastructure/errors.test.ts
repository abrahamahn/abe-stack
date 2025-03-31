import { Request, Response } from "express";
import { Container } from "inversify";

import {
  AppError,
  NetworkError,
  DatabaseError,
  ConfigurationError,
  InitializationError,
  ErrorHandler,
  ErrorCode,
  HttpStatus,
  GlobalErrorHandler,
  ServiceError,
} from "@infrastructure/errors";
import { ILoggerService } from "@infrastructure/logging";

import { TYPES } from "@/server/infrastructure/di/types";

// Mock domain errors for testing
const UserErrors = {
  NotFound: class extends ServiceError {
    constructor(userId: string) {
      super(`User with ID ${userId} not found`, "USER_NOT_FOUND", 404, {
        userId,
      });
    }
  },
};

class DomainValidationError extends ServiceError {
  constructor(
    entity: string,
    details: Array<{ field: string; message: string }>,
  ) {
    super(`Validation failed for ${entity}`, "VALIDATION_ERROR", 400, {
      details,
    });
  }
}

describe("Error Handling Infrastructure Integration Tests", () => {
  let container: Container;
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<ILoggerService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createLogger: jest.fn().mockReturnThis(),
      withContext: jest.fn().mockReturnThis(),
      debugObj: jest.fn(),
      infoObj: jest.fn(),
      warnObj: jest.fn(),
      errorObj: jest.fn(),
      addTransport: jest.fn(),
      setTransports: jest.fn(),
      setMinLevel: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
    };

    // Setup mock request and response
    mockRequest = {
      method: "GET",
      path: "/test",
      ip: "127.0.0.1",
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup spies
    jsonSpy = jest.spyOn(mockResponse, "json");
    statusSpy = jest.spyOn(mockResponse, "status");

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

  describe("Domain Error Integration", () => {
    it("should handle UserError correctly", () => {
      const error = new UserErrors.NotFound("123");

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "USER_NOT_FOUND",
          }),
        }),
      );
    });

    it("should handle validation errors with details", () => {
      const error = new DomainValidationError("User", [
        {
          field: "email",
          message: "Invalid email format",
        },
      ]);

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: "email",
                message: "Invalid email format",
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe("Infrastructure Error Integration", () => {
    it("should handle DatabaseError with proper logging", () => {
      const error = new DatabaseError(
        "Database operation 'query' failed for users: Connection failed",
        {
          operation: "query",
          entity: "users",
          cause: "Connection failed",
        },
      );

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Database operation"),
        expect.any(Object),
      );
    });

    it("should handle NetworkError with status code", () => {
      const error = new NetworkError(
        "https://api.example.com",
        503,
        "Service unavailable",
      );

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "NETWORK_ERROR",
          }),
        }),
      );
    });
  });

  describe("Technical Error Integration", () => {
    it("should handle ConfigurationError appropriately", () => {
      const error = new ConfigurationError(
        "Invalid configuration",
        "DATABASE_URL",
      );

      errorHandler.handleError(
        error,
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle InitializationError with component info", () => {
      const error = new InitializationError(
        "DatabaseService",
        "Connection failed",
      );

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
          }),
        }),
      );
    });
  });

  describe("Error Factory Methods", () => {
    it("should create NotFoundError with correct structure", () => {
      const error = ServiceError.notFound("User", "123");

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
            resource: "User",
            resourceId: "123",
          }),
        }),
      );
    });

    it("should create ValidationError with details", () => {
      const error = ServiceError.validation("Invalid input", {
        email: "Invalid email format",
        password: "Password too short",
      });

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
            validationErrors: expect.any(Object),
          }),
        }),
      );
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
      const processOnSpy = jest.spyOn(process, "on");

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
