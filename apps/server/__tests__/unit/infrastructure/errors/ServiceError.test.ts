import { describe, it, expect } from "vitest";

import { ServiceError } from "@/server/infrastructure/errors/ServiceError";

describe("ServiceError", () => {
  describe("constructor", () => {
    it("should create a service error with default values", () => {
      const error = new ServiceError("Service error");
      expect(error.message).toBe("Service error");
      expect(error.code).toBe("SERVICE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.metadata).toEqual({});
    });

    it("should create a service error with custom values", () => {
      const metadata = { key: "value" };
      const error = new ServiceError(
        "Custom error",
        "CUSTOM_ERROR",
        400,
        metadata,
      );
      expect(error.message).toBe("Custom error");
      expect(error.code).toBe("CUSTOM_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.metadata).toEqual(metadata);
    });
  });

  describe("notFound", () => {
    it("should create a not found error with resource and ID", () => {
      const error = ServiceError.notFound("User", "123");
      expect(error.message).toBe("User with ID '123' not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.metadata).toEqual({
        resource: "User",
        resourceId: "123",
      });
    });

    it("should create a not found error with resource only", () => {
      const error = ServiceError.notFound("User");
      expect(error.message).toBe("User not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.metadata).toEqual({
        resource: "User",
        resourceId: undefined,
      });
    });

    it("should create a not found error with custom message", () => {
      const error = ServiceError.notFound(
        "User",
        "123",
        "User profile not found",
      );
      expect(error.message).toBe("User profile not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.metadata).toEqual({
        resource: "User",
        resourceId: "123",
      });
    });
  });

  describe("validation", () => {
    it("should create a validation error with default message", () => {
      const validationErrors = {
        email: "Invalid email format",
        password: "Password too short",
      };
      const error = ServiceError.validation(undefined, validationErrors);
      expect(error.message).toBe("Validation error");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.metadata).toEqual({ validationErrors });
    });

    it("should create a validation error with custom message", () => {
      const validationErrors = {
        username: "Username already taken",
      };
      const error = ServiceError.validation(
        "User validation failed",
        validationErrors,
      );
      expect(error.message).toBe("User validation failed");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.metadata).toEqual({ validationErrors });
    });
  });

  describe("unauthorized", () => {
    it("should create an unauthorized error with default message", () => {
      const error = ServiceError.unauthorized();
      expect(error.message).toBe("Unauthorized");
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.statusCode).toBe(401);
      expect(error.metadata).toEqual({});
    });

    it("should create an unauthorized error with custom message", () => {
      const error = ServiceError.unauthorized("Invalid credentials");
      expect(error.message).toBe("Invalid credentials");
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.statusCode).toBe(401);
      expect(error.metadata).toEqual({});
    });
  });

  describe("forbidden", () => {
    it("should create a forbidden error with default message", () => {
      const error = ServiceError.forbidden();
      expect(error.message).toBe("Forbidden");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.statusCode).toBe(403);
      expect(error.metadata).toEqual({});
    });

    it("should create a forbidden error with custom message", () => {
      const error = ServiceError.forbidden("Insufficient permissions");
      expect(error.message).toBe("Insufficient permissions");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.statusCode).toBe(403);
      expect(error.metadata).toEqual({});
    });
  });
});
