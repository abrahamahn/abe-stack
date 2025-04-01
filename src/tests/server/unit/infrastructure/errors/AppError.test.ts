import { describe, it, expect } from "vitest";

import { AppError } from "@/server/infrastructure/errors/AppError";

describe("AppError", () => {
  it("should create an app error with default values", () => {
    const error = new AppError("Application error");
    expect(error.message).toBe("Application error");
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.metadata).toEqual({});
    expect(error.name).toBe("AppError");
  });

  it("should create an app error with custom code", () => {
    const error = new AppError("Custom error", "CUSTOM_ERROR");
    expect(error.message).toBe("Custom error");
    expect(error.code).toBe("CUSTOM_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.metadata).toEqual({});
  });

  it("should create an app error with custom status code", () => {
    const error = new AppError("Not found", "NOT_FOUND", 404);
    expect(error.message).toBe("Not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.statusCode).toBe(404);
    expect(error.metadata).toEqual({});
  });

  it("should create an app error with metadata", () => {
    const metadata = {
      userId: "123",
      action: "create",
      timestamp: new Date().toISOString(),
    };
    const error = new AppError(
      "Operation failed",
      "OPERATION_ERROR",
      500,
      metadata,
    );
    expect(error.message).toBe("Operation failed");
    expect(error.code).toBe("OPERATION_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.metadata).toEqual(metadata);
  });

  it("should convert to JSON format", () => {
    const metadata = { key: "value" };
    const error = new AppError("Custom error", "CUSTOM_ERROR", 400, metadata);
    const json = error.toJSON();
    expect(json).toEqual({
      name: "AppError",
      message: "Custom error",
      code: "CUSTOM_ERROR",
      statusCode: 400,
      metadata,
      stack: error.stack,
    });
  });

  it("should convert to string format", () => {
    const error = new AppError("Test error", "TEST_ERROR");
    const string = error.toString();
    expect(string).toBe("AppError [TEST_ERROR]: Test error");
  });

  it("should maintain stack trace", () => {
    const error = new AppError("Test error");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("AppError");
  });

  it("should extend Error class", () => {
    const error = new AppError("Test error");
    expect(error).toBeInstanceOf(Error);
  });

  it("should handle empty message", () => {
    const error = new AppError("");
    expect(error.message).toBe("");
    expect(error.toString()).toBe("AppError [INTERNAL_ERROR]: ");
  });

  it("should handle complex metadata with circular references", () => {
    const circularObj: any = { key: "value" };
    circularObj.self = circularObj;

    const error = new AppError("Test error", "TEST_ERROR", 500, {
      circular: circularObj,
    });
    const json = error.toJSON();

    expect(() => JSON.stringify(json)).not.toThrow();
    expect(json.metadata).toHaveProperty("circular");
  });

  it("should handle metadata with non-serializable values", () => {
    const metadata = {
      fn: () => console.log("test"),
      symbol: Symbol("test"),
      date: new Date("2024-01-01"),
    };

    const error = new AppError("Test error", "TEST_ERROR", 500, metadata);
    const json = error.toJSON();

    expect(() => JSON.stringify(json)).not.toThrow();
    expect(json.metadata).toHaveProperty("date");
  });

  it("should preserve metadata immutability", () => {
    const metadata = { key: "value" };
    const error = new AppError("Test error", "TEST_ERROR", 500, metadata);

    metadata.key = "changed";
    expect(error.metadata.key).toBe("value");
  });

  describe("inheritance behavior", () => {
    class CustomError extends AppError {
      constructor(message: string) {
        super(message, "CUSTOM_ERROR", 418);
      }
    }

    it("should properly inherit from AppError", () => {
      const error = new CustomError("Custom implementation");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("CustomError");
      expect(error.code).toBe("CUSTOM_ERROR");
      expect(error.statusCode).toBe(418);
    });

    it("should maintain proper stack trace in inherited errors", () => {
      const error = new CustomError("Test error");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("CustomError");
    });

    it("should properly serialize inherited errors", () => {
      const error = new CustomError("Test error");
      const json = error.toJSON();

      expect(json).toEqual({
        name: "CustomError",
        message: "Test error",
        code: "CUSTOM_ERROR",
        statusCode: 418,
        metadata: {},
        stack: error.stack,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined metadata", () => {
      const error = new AppError("Test error", "TEST_ERROR", 500, undefined);
      expect(error.metadata).toEqual({});
    });

    it("should handle null metadata", () => {
      const error = new AppError("Test error", "TEST_ERROR", 500, null as any);
      expect(error.metadata).toEqual({});
    });

    it("should handle invalid status codes", () => {
      const error = new AppError("Test error", "TEST_ERROR", -1);
      expect(error.statusCode).toBe(-1); // Should preserve the invalid status code
    });

    it("should handle metadata with undefined and null values", () => {
      const metadata = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: "test",
      };
      const error = new AppError("Test error", "TEST_ERROR", 500, metadata);
      const json = error.toJSON();

      expect(json.metadata).toHaveProperty("nullValue", null);
      expect(json.metadata).not.toHaveProperty("undefinedValue");
      expect(json.metadata).toHaveProperty("validValue", "test");
    });
  });

  describe("error chain", () => {
    it("should handle nested errors", () => {
      const originalError = new Error("Original error");
      const metadata = { cause: originalError };
      const error = new AppError(
        "Wrapped error",
        "WRAPPED_ERROR",
        500,
        metadata,
      );
      const json = error.toJSON();

      expect(json.metadata).toHaveProperty("cause");
      expect(() => JSON.stringify(json)).not.toThrow();
    });

    it("should preserve error hierarchy in inheritance chain", () => {
      class FirstLevelError extends AppError {}
      class SecondLevelError extends FirstLevelError {}

      const error = new SecondLevelError("Multi-level error");
      expect(error).toBeInstanceOf(SecondLevelError);
      expect(error).toBeInstanceOf(FirstLevelError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });
});
