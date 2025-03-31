import { InfrastructureError } from "@/server/infrastructure/errors/infrastructure/InfrastructureError";

describe("InfrastructureError", () => {
  it("should create an infrastructure error with message and code", () => {
    const error = new InfrastructureError("Test error", "TEST_ERROR");
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.name).toBe("InfrastructureError");
  });

  it("should maintain proper stack trace", () => {
    const error = new InfrastructureError("Test error", "TEST_ERROR");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("InfrastructureError");
  });

  it("should convert to JSON format", () => {
    const error = new InfrastructureError("Test error", "TEST_ERROR");
    const json = error.toJSON();
    expect(json).toEqual({
      code: "TEST_ERROR",
      message: "Test error",
      name: "InfrastructureError",
    });
  });

  it("should extend Error class", () => {
    const error = new InfrastructureError("Test error", "TEST_ERROR");
    expect(error).toBeInstanceOf(Error);
  });

  it("should capture stack trace", () => {
    const error = new InfrastructureError("Test error", "TEST_ERROR");
    const stackLines = error.stack?.split("\n") || [];
    expect(stackLines[0]).toContain("InfrastructureError: Test error");
    expect(stackLines.length).toBeGreaterThan(1);
  });
});
