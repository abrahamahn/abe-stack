import { describe, it, expect } from "vitest";

import {
  ValidationError,
  MissingRequiredFieldError,
  InvalidFieldValueError,
  ValidationErrorDetail,
} from "@/server/infrastructure/errors/infrastructure/ValidationError";

describe("ValidationError", () => {
  describe("ValidationError", () => {
    it("should create a validation error with details only", () => {
      const details: ValidationErrorDetail[] = [
        { field: "name", message: "Name is required" },
        { field: "email", message: "Invalid email format" },
      ];
      const error = new ValidationError(details);
      expect(error.message).toBe("Validation failed");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.details).toEqual(details);
    });

    it("should create a validation error with entity", () => {
      const details: ValidationErrorDetail[] = [
        { field: "username", message: "Username is taken" },
      ];
      const error = new ValidationError(details, "User");
      expect(error.message).toBe("Validation failed for User");
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("should create a validation error with custom code", () => {
      const details: ValidationErrorDetail[] = [
        { field: "password", message: "Password is too weak" },
      ];
      const error = new ValidationError(details, "User", "WEAK_PASSWORD");
      expect(error.message).toBe("Validation failed for User");
      expect(error.code).toBe("WEAK_PASSWORD");
    });

    it("should convert to JSON format", () => {
      const details: ValidationErrorDetail[] = [
        { field: "age", message: "Age must be a number", code: "TYPE_ERROR" },
      ];
      const error = new ValidationError(details);
      const json = error.toJSON();
      expect(json).toEqual({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        name: "ValidationError",
        details,
        entity: undefined,
      });
    });

    it("should maintain stack trace", () => {
      const error = new ValidationError([{ field: "test", message: "test" }]);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("ValidationError");
    });

    it("should handle empty details array", () => {
      const error = new ValidationError([]);
      expect(error.details).toEqual([]);
      expect(error.message).toBe("Validation failed");
    });

    it("should handle details with custom codes", () => {
      const details: ValidationErrorDetail[] = [
        { field: "email", message: "Invalid format", code: "EMAIL_FORMAT" },
        { field: "password", message: "Too short", code: "PASSWORD_LENGTH" },
      ];
      const error = new ValidationError(details);
      expect(error.details).toEqual(details);
    });
  });

  describe("MissingRequiredFieldError", () => {
    it("should create a missing required field error with fields only", () => {
      const fields = ["firstName", "lastName"];
      const error = new MissingRequiredFieldError(fields);
      expect(error.message).toBe("Validation failed");
      expect(error.code).toBe("MISSING_REQUIRED_FIELDS");
      expect(error.details).toEqual([
        {
          field: "firstName",
          message: "Field is required",
          code: "REQUIRED_FIELD",
        },
        {
          field: "lastName",
          message: "Field is required",
          code: "REQUIRED_FIELD",
        },
      ]);
    });

    it("should create a missing required field error with entity", () => {
      const fields = ["title", "content"];
      const error = new MissingRequiredFieldError(fields, "Post");
      expect(error.message).toBe("Validation failed for Post");
      expect(error.code).toBe("MISSING_REQUIRED_FIELDS");
      expect(error.details).toEqual([
        {
          field: "title",
          message: "Field is required",
          code: "REQUIRED_FIELD",
        },
        {
          field: "content",
          message: "Field is required",
          code: "REQUIRED_FIELD",
        },
      ]);
    });

    it("should maintain stack trace", () => {
      const error = new MissingRequiredFieldError(["test"]);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("MissingRequiredFieldError");
    });

    it("should handle empty fields array", () => {
      const error = new MissingRequiredFieldError([]);
      expect(error.details).toEqual([]);
      expect(error.message).toBe("Validation failed");
    });

    it("should serialize to JSON correctly", () => {
      const error = new MissingRequiredFieldError(["test"], "Test");
      const json = error.toJSON();

      expect(json).toEqual({
        name: "ValidationError",
        message: "Validation failed for Test",
        code: "MISSING_REQUIRED_FIELDS",
        details: [
          {
            field: "test",
            message: "Field is required",
            code: "REQUIRED_FIELD",
          },
        ],
        entity: "Test",
      });
    });
  });

  describe("InvalidFieldValueError", () => {
    it("should create an invalid field value error with field and message only", () => {
      const error = new InvalidFieldValueError("email", "Invalid email format");
      expect(error.message).toBe("Validation failed");
      expect(error.code).toBe("INVALID_FIELD_VALUE");
      expect(error.details).toEqual([
        {
          field: "email",
          message: "Invalid email format",
          code: "INVALID_VALUE",
        },
      ]);
    });

    it("should create an invalid field value error with entity", () => {
      const error = new InvalidFieldValueError(
        "price",
        "Price must be positive",
        "Product",
      );
      expect(error.message).toBe("Validation failed for Product");
      expect(error.code).toBe("INVALID_FIELD_VALUE");
      expect(error.details).toEqual([
        {
          field: "price",
          message: "Price must be positive",
          code: "INVALID_VALUE",
        },
      ]);
    });

    it("should maintain stack trace", () => {
      const error = new InvalidFieldValueError("test", "test");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("InvalidFieldValueError");
    });

    it("should handle empty message", () => {
      const error = new InvalidFieldValueError("test", "");
      expect(error.details[0].message).toBe("");
    });

    it("should serialize to JSON correctly", () => {
      const error = new InvalidFieldValueError("test", "test", "Test");
      const json = error.toJSON();

      expect(json).toEqual({
        name: "ValidationError",
        message: "Validation failed for Test",
        code: "INVALID_FIELD_VALUE",
        details: [
          {
            field: "test",
            message: "test",
            code: "INVALID_VALUE",
          },
        ],
        entity: "Test",
      });
    });
  });
});
