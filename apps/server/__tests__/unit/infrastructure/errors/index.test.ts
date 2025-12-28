import { describe, it, expect } from "vitest";

import * as errors from "@/server/infrastructure/errors";

describe("Error exports", () => {
  it("should export base error classes", () => {
    expect(errors.AppError).toBeDefined();
    expect(errors.ServiceError).toBeDefined();
  });

  it("should export API error classes", () => {
    expect(errors.ApiError).toBeDefined();
    expect(errors.ApiNotFoundError).toBeDefined();
    expect(errors.ApiValidationError).toBeDefined();
    expect(errors.UnauthorizedError).toBeDefined();
    expect(errors.ForbiddenError).toBeDefined();
    expect(errors.ApiConflictError).toBeDefined();
    expect(errors.InternalServerError).toBeDefined();
    expect(errors.TooManyRequestsError).toBeDefined();
  });

  it("should export infrastructure error classes", () => {
    expect(errors.InfrastructureError).toBeDefined();
    expect(errors.CacheError).toBeDefined();
    expect(errors.NetworkError).toBeDefined();
    expect(errors.ExternalServiceError).toBeDefined();
    expect(errors.InfrastructureDatabaseError).toBeDefined();
    expect(errors.EntityNotFoundError).toBeDefined();
    expect(errors.UniqueConstraintError).toBeDefined();
    expect(errors.ForeignKeyConstraintError).toBeDefined();
  });

  it("should export technical error classes", () => {
    expect(errors.TechnicalError).toBeDefined();
    expect(errors.ConfigurationError).toBeDefined();
    expect(errors.InitializationError).toBeDefined();
    expect(errors.SystemError).toBeDefined();
  });

  it("should export error handler", () => {
    expect(errors.ErrorHandler).toBeDefined();
    expect(errors.errorHandler).toBeDefined();
  });

  it("should export error codes", () => {
    expect(errors.ErrorCode).toBeDefined();
    expect(errors.ErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    expect(errors.ErrorCode.NOT_IMPLEMENTED).toBe("NOT_IMPLEMENTED");
    expect(errors.ErrorCode.BAD_REQUEST).toBe("BAD_REQUEST");
    expect(errors.ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(errors.ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
    expect(errors.ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
    expect(errors.ErrorCode.CONFLICT).toBe("CONFLICT");
    expect(errors.ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(errors.ErrorCode.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE");
    expect(errors.ErrorCode.DATABASE_ERROR).toBe("DATABASE_ERROR");
    expect(errors.ErrorCode.EXTERNAL_SERVICE_ERROR).toBe(
      "EXTERNAL_SERVICE_ERROR",
    );
  });

  it("should export HTTP status codes", () => {
    expect(errors.HttpStatus).toBeDefined();
    expect(errors.HttpStatus.OK).toBe(200);
    expect(errors.HttpStatus.BAD_REQUEST).toBe(400);
    expect(errors.HttpStatus.UNAUTHORIZED).toBe(401);
    expect(errors.HttpStatus.FORBIDDEN).toBe(403);
    expect(errors.HttpStatus.NOT_FOUND).toBe(404);
    expect(errors.HttpStatus.CONFLICT).toBe(409);
    expect(errors.HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
    expect(errors.HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    expect(errors.HttpStatus.SERVICE_UNAVAILABLE).toBe(503);
  });

  it("should export predefined error types", () => {
    expect(errors.ValidationError).toBeDefined();
    expect(errors.AuthenticationError).toBeDefined();
    expect(errors.PermissionError).toBeDefined();
    expect(errors.NotFoundError).toBeDefined();
    expect(errors.ConflictError).toBeDefined();
    expect(errors.ServiceUnavailableError).toBeDefined();
    expect(errors.DatabaseError).toBeDefined();
  });

  it("should export error factory functions", () => {
    expect(errors.createValidationError).toBeDefined();
    expect(errors.createNotFoundError).toBeDefined();
    expect(errors.createAuthenticationError).toBeDefined();
    expect(errors.createPermissionError).toBeDefined();
    expect(errors.createConflictError).toBeDefined();
  });

  it("should export global error handler", () => {
    expect(errors.GlobalErrorHandler).toBeDefined();
    expect(errors.GlobalErrorHandler.register).toBeDefined();
  });
});
