import { describe, it, expect } from "vitest";

import {
  InfrastructureError,
  CacheError,
  NetworkError,
  ExternalServiceError,
} from "@/server/infrastructure/errors/infrastructure/InfrastructureError";

describe("InfrastructureError", () => {
  describe("InfrastructureError", () => {
    it("should create an infrastructure error with default code", () => {
      const error = new InfrastructureError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("INFRASTRUCTURE_ERROR");
    });

    it("should create an infrastructure error with custom code", () => {
      const error = new InfrastructureError("Test error", "CUSTOM_ERROR");
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("CUSTOM_ERROR");
    });

    it("should maintain stack trace", () => {
      const error = new InfrastructureError("Test error");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("InfrastructureError");
    });

    it("should serialize to JSON correctly", () => {
      const error = new InfrastructureError("Test error", "CUSTOM_ERROR");
      const json = error.toJSON();

      expect(json).toEqual({
        name: "InfrastructureError",
        message: "Test error",
        code: "CUSTOM_ERROR",
      });
    });
  });

  describe("CacheError", () => {
    it("should create a cache error with operation only", () => {
      const error = new CacheError("get");
      expect(error.message).toBe("Cache operation 'get' failed");
      expect(error.code).toBe("CACHE_ERROR");
      expect(error.operation).toBe("get");
      expect(error.key).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it("should create a cache error with operation and key", () => {
      const error = new CacheError("set", "user:123");
      expect(error.message).toBe(
        "Cache operation 'set' for key 'user:123' failed",
      );
      expect(error.operation).toBe("set");
      expect(error.key).toBe("user:123");
    });

    it("should create a cache error with Error cause", () => {
      const cause = new Error("Connection failed");
      const error = new CacheError("delete", "session:456", cause);
      expect(error.message).toBe(
        "Cache operation 'delete' for key 'session:456' failed: Connection failed",
      );
      expect(error.cause).toBe(cause);
    });

    it("should create a cache error with string cause", () => {
      const error = new CacheError("get", "post:789", "Key not found");
      expect(error.message).toBe(
        "Cache operation 'get' for key 'post:789' failed: Key not found",
      );
      expect(error.cause).toBe("Key not found");
    });

    it("should maintain stack trace", () => {
      const error = new CacheError("test");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("CacheError");
    });

    it("should serialize to JSON correctly", () => {
      const cause = new Error("Test cause");
      const error = new CacheError("test", "test:key", cause);
      const json = error.toJSON();

      expect(json).toEqual({
        name: "InfrastructureError",
        message: "Cache operation 'test' for key 'test:key' failed: Test cause",
        code: "CACHE_ERROR",
        operation: "test",
        key: "test:key",
        cause: "Test cause",
      });
    });
  });

  describe("NetworkError", () => {
    it("should create a network error with no parameters", () => {
      const error = new NetworkError();
      expect(error.message).toBe("Network request failed");
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.url).toBeUndefined();
      expect(error.statusCode).toBe(500);
      expect(error.cause).toBeUndefined();
    });

    it("should create a network error with URL", () => {
      const error = new NetworkError("https://api.example.com/users");
      expect(error.message).toBe(
        "Network request to 'https://api.example.com/users' failed",
      );
      expect(error.url).toBe("https://api.example.com/users");
    });

    it("should create a network error with URL and status code", () => {
      const error = new NetworkError("https://api.example.com/posts", 404);
      expect(error.message).toBe(
        "Network request to 'https://api.example.com/posts' failed with status 404",
      );
      expect(error.statusCode).toBe(404);
    });

    it("should create a network error with Error cause", () => {
      const cause = new Error("Timeout");
      const error = new NetworkError(
        "https://api.example.com/comments",
        500,
        cause,
      );
      expect(error.message).toBe(
        "Network request to 'https://api.example.com/comments' failed with status 500: Timeout",
      );
      expect(error.cause).toBe(cause);
    });

    it("should create a network error with string cause", () => {
      const error = new NetworkError(
        "https://api.example.com/auth",
        401,
        "Invalid token",
      );
      expect(error.message).toBe(
        "Network request to 'https://api.example.com/auth' failed with status 401: Invalid token",
      );
      expect(error.cause).toBe("Invalid token");
    });

    it("should maintain stack trace", () => {
      const error = new NetworkError();
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("NetworkError");
    });

    it("should serialize to JSON correctly", () => {
      const cause = new Error("Test cause");
      const error = new NetworkError("https://test.com", 500, cause);
      const json = error.toJSON();

      expect(json).toEqual({
        name: "InfrastructureError",
        message:
          "Network request to 'https://test.com' failed with status 500: Test cause",
        code: "NETWORK_ERROR",
        url: "https://test.com",
        statusCode: 500,
        cause: "Test cause",
      });
    });
  });

  describe("ExternalServiceError", () => {
    it("should create an external service error with service and operation", () => {
      const error = new ExternalServiceError(
        "PaymentGateway",
        "processPayment",
      );
      expect(error.message).toBe(
        "External service 'PaymentGateway' operation 'processPayment' failed",
      );
      expect(error.code).toBe("EXTERNAL_SERVICE_ERROR");
      expect(error.service).toBe("PaymentGateway");
      expect(error.operation).toBe("processPayment");
      expect(error.cause).toBeUndefined();
    });

    it("should create an external service error with Error cause", () => {
      const cause = new Error("Invalid card");
      const error = new ExternalServiceError(
        "PaymentGateway",
        "validateCard",
        cause,
      );
      expect(error.message).toBe(
        "External service 'PaymentGateway' operation 'validateCard' failed: Invalid card",
      );
      expect(error.cause).toBe(cause);
    });

    it("should create an external service error with string cause", () => {
      const error = new ExternalServiceError(
        "EmailService",
        "sendEmail",
        "SMTP error",
      );
      expect(error.message).toBe(
        "External service 'EmailService' operation 'sendEmail' failed: SMTP error",
      );
      expect(error.cause).toBe("SMTP error");
    });

    it("should maintain stack trace", () => {
      const error = new ExternalServiceError("test", "test");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("ExternalServiceError");
    });

    it("should serialize to JSON correctly", () => {
      const cause = new Error("Test cause");
      const error = new ExternalServiceError("test", "test", cause);
      const json = error.toJSON();

      expect(json).toEqual({
        name: "InfrastructureError",
        message: "External service 'test' operation 'test' failed: Test cause",
        code: "EXTERNAL_SERVICE_ERROR",
        service: "test",
        operation: "test",
        cause: "Test cause",
      });
    });
  });
});
