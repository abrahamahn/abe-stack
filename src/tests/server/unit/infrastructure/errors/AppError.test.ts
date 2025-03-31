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
});
