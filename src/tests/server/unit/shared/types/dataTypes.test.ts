import { describe, it, expect } from "vitest";

import { uuid, datetime } from "../../../../../server/shared/types/dataTypes";

describe("dataTypes", () => {
  describe("uuid validator", () => {
    it("should validate valid UUIDs", () => {
      const validUUIDs = [
        "123e4567-e89b-12d3-a456-426614174000",
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "7f9e23d3-7108-4f3b-b5b2-45d0f8946e4a",
      ];

      validUUIDs.forEach((validUUID) => {
        const result = uuid.validate(validUUID);
        expect(result).toBe(validUUID);
      });
    });

    it("should reject invalid UUIDs", () => {
      const invalidUUIDs = [
        "not-a-uuid",
        "123e4567-e89b-12d3-a456", // Incomplete
        "123e4567-e89b-12d3-a456-42661417400", // Too short
        "123e4567-e89b-12d3-a456-4266141740000", // Too long
        "123e4567-e89b-12d3-a456-42661417400g", // Invalid character
        "", // Empty string
        "123e4567-e89b-12d3-a456-42661417400", // Missing character
      ];

      invalidUUIDs.forEach((invalidUUID) => {
        const result = uuid.validate(invalidUUID);
        expect(result).toEqual({
          message: `${JSON.stringify(invalidUUID)} is not a valid UUID.`,
        });
      });
    });

    it("should handle null and undefined", () => {
      expect(uuid.validate(null)).toEqual({
        message: "null is not a valid UUID.",
      });
      expect(uuid.validate(undefined)).toEqual({
        message: "undefined is not a valid UUID.",
      });
    });

    it("should handle non-string types", () => {
      expect(uuid.validate(123)).toEqual({
        message: "123 is not a valid UUID.",
      });
      expect(uuid.validate(true)).toEqual({
        message: "true is not a valid UUID.",
      });
      expect(uuid.validate({})).toEqual({
        message: "{} is not a valid UUID.",
      });
      expect(uuid.validate([])).toEqual({
        message: "[] is not a valid UUID.",
      });
    });

    it("should have an inspect method", () => {
      expect(uuid.inspect()).toBe("UUID");
    });
  });

  describe("datetime validator", () => {
    it("should validate valid ISO 8601 datetime strings", () => {
      const validDatetimes = [
        "2024-03-14T12:00:00Z",
        "2024-03-14T12:00:00.000Z",
        "2024-03-14T12:00:00.123Z",
        "2024-03-14T12:00:00.456Z",
        "2024-03-14T12:00:00.789Z",
      ];

      validDatetimes.forEach((validDatetime) => {
        const result = datetime.validate(validDatetime);
        expect(result).toBe(validDatetime);
      });
    });

    it("should reject invalid datetime strings", () => {
      const invalidDatetimes = [
        "not-a-datetime",
        "2024-03-14", // Missing time
        "12:00:00Z", // Missing date
        "2024-13-14T12:00:00Z", // Invalid month
        "2024-03-14T25:00:00Z", // Invalid hour
        "2024-03-14T12:60:00Z", // Invalid minute
        "2024-03-14T12:00:60Z", // Invalid second
        "2024-03-14T12:00:00.1234Z", // Too many decimal places
        "", // Empty string
      ];

      invalidDatetimes.forEach((invalidDatetime) => {
        const result = datetime.validate(invalidDatetime);
        expect(result).toEqual({
          message: `${JSON.stringify(invalidDatetime)} is not a valid ISO 8601 datetime string.`,
        });
      });
    });

    it("should handle null and undefined", () => {
      expect(datetime.validate(null)).toEqual({
        message: "null is not a valid ISO 8601 datetime string.",
      });
      expect(datetime.validate(undefined)).toEqual({
        message: "undefined is not a valid ISO 8601 datetime string.",
      });
    });

    it("should handle non-string values", () => {
      expect(datetime.validate(123)).toEqual({
        message: "123 is not a valid ISO 8601 datetime string.",
      });
      expect(datetime.validate(true)).toEqual({
        message: "true is not a valid ISO 8601 datetime string.",
      });
      expect(datetime.validate({})).toEqual({
        message: "{} is not a valid ISO 8601 datetime string.",
      });
      expect(datetime.validate([])).toEqual({
        message: "[] is not a valid ISO 8601 datetime string.",
      });
    });

    it("should have an inspect method", () => {
      expect(datetime.inspect()).toBe("Datetime");
    });
  });
});
