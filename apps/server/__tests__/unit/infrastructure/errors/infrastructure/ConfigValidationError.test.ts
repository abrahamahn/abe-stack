import { describe, it, expect } from "vitest";

import { ConfigValidationError } from "@/server/infrastructure/errors/infrastructure/ConfigValidationError";

describe("ConfigValidationError", () => {
  it("should create a config validation error with message and errors", () => {
    const message = "Configuration validation failed";
    const errors = [
      "Database URL is required",
      "Port must be a number",
      "API key is missing",
    ];
    const error = new ConfigValidationError(message, errors);

    expect(error.message).toBe(message);
    expect(error.name).toBe("ConfigValidationError");
    expect(error.errors).toEqual(errors);
  });

  it("should format error message with validation errors", () => {
    const message = "Configuration validation failed";
    const errors = [
      "Database URL is required",
      "Port must be a number",
      "API key is missing",
    ];
    const error = new ConfigValidationError(message, errors);
    const formattedMessage = error.getFormattedMessage();

    const expectedMessage = [
      message,
      "",
      "Validation errors:",
      "- Database URL is required",
      "- Port must be a number",
      "- API key is missing",
    ].join("\n");

    expect(formattedMessage).toBe(expectedMessage);
  });

  it("should handle empty error list", () => {
    const message = "Configuration validation failed";
    const error = new ConfigValidationError(message, []);

    expect(error.message).toBe(message);
    expect(error.errors).toEqual([]);
    expect(error.getFormattedMessage()).toBe(
      [message, "", "Validation errors:"].join("\n"),
    );
  });

  it("should maintain stack trace", () => {
    const error = new ConfigValidationError("Test error", []);
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("ConfigValidationError");
  });

  it("should handle single validation error", () => {
    const message = "Configuration validation failed";
    const errors = ["Database URL is required"];
    const error = new ConfigValidationError(message, errors);

    expect(error.getFormattedMessage()).toBe(
      [message, "", "Validation errors:", "- Database URL is required"].join(
        "\n",
      ),
    );
  });

  it("should handle special characters in error messages", () => {
    const message = "Configuration validation failed";
    const errors = ["URL contains invalid characters: @#$%"];
    const error = new ConfigValidationError(message, errors);

    expect(error.getFormattedMessage()).toBe(
      [
        message,
        "",
        "Validation errors:",
        "- URL contains invalid characters: @#$%",
      ].join("\n"),
    );
  });

  it("should handle long error messages", () => {
    const message = "Configuration validation failed";
    const errors = [
      "This is a very long error message that should be properly formatted and displayed in the output without any truncation or formatting issues",
    ];
    const error = new ConfigValidationError(message, errors);

    expect(error.getFormattedMessage()).toBe(
      [
        message,
        "",
        "Validation errors:",
        "- This is a very long error message that should be properly formatted and displayed in the output without any truncation or formatting issues",
      ].join("\n"),
    );
  });
});
