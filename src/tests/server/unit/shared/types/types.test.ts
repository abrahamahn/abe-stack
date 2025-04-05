import { describe, it, expect } from "vitest";

import type {
  Validator,
  FuzzyMatchResultType,
  FuzzyMatchType,
  FuzzyMatchOptions,
  PaginationOptions,
  PaginatedResult,
} from "../../../../../server/shared/types/types";

describe("types", () => {
  describe("Validator", () => {
    it("should allow validator implementation", () => {
      const validator: Validator<string> = {
        validate: (value: unknown): string => {
          if (typeof value === "string") return value;
          throw new Error("Invalid value");
        },
      };
      expect(validator).toBeDefined();
      expect(typeof validator.validate).toBe("function");
      expect(validator.validate("test")).toBe("test");
    });

    it("should handle validation errors correctly", () => {
      const validator: Validator<number> = {
        validate: (value: unknown): number => {
          if (typeof value === "number" && !isNaN(value)) return value;
          throw new Error("Not a valid number");
        },
      };

      expect(validator.validate(123)).toBe(123);
      expect(validator.validate(0)).toBe(0);
      expect(validator.validate(-10)).toBe(-10);
      expect(() => validator.validate("not a number")).toThrow(
        "Not a valid number",
      );
      expect(() => validator.validate(null)).toThrow("Not a valid number");
    });

    it("should support generic validation types", () => {
      // A validator for any object with an id property
      interface WithId {
        id: string;
      }

      const idValidator: Validator<WithId> = {
        validate: (value: unknown): WithId => {
          if (
            typeof value === "object" &&
            value !== null &&
            "id" in value &&
            typeof (value as any).id === "string"
          ) {
            return value as WithId;
          }
          throw new Error("Invalid object: missing id property");
        },
      };

      const validObj = { id: "abc123", name: "test" };
      expect(idValidator.validate(validObj)).toBe(validObj);

      expect(() => idValidator.validate({ name: "no-id" })).toThrow(
        /missing id/,
      );
      expect(() => idValidator.validate({ id: 123 })).toThrow(/missing id/);
    });
  });

  describe("FuzzyMatchResultType", () => {
    it("should allow match result with match", () => {
      const result: FuzzyMatchResultType = {
        match: "test",
      };
      expect(result).toBeDefined();
      expect(result.match).toBe("test");
      expect(result.skip).toBeUndefined();
    });

    it("should allow match result with skip", () => {
      const result: FuzzyMatchResultType = {
        match: "test",
        skip: "skip",
      };
      expect(result).toBeDefined();
      expect(result.match).toBe("test");
      expect(result.skip).toBe("skip");
    });

    it("should support empty match strings", () => {
      const result: FuzzyMatchResultType = {
        match: "",
        skip: "entire_string",
      };
      expect(result.match).toBe("");
      expect(result.skip).toBe("entire_string");
    });
  });

  describe("FuzzyMatchType", () => {
    it("should allow fuzzy match with matches and score", () => {
      const match: FuzzyMatchType = {
        matches: [{ match: "test" }, { match: "test2", skip: "skip" }],
        score: 0.8,
      };
      expect(match).toBeDefined();
      expect(match.matches).toHaveLength(2);
      expect(match.score).toBe(0.8);
    });

    it("should allow empty matches array", () => {
      const match: FuzzyMatchType = {
        matches: [],
        score: 0,
      };
      expect(match.matches).toHaveLength(0);
      expect(match.score).toBe(0);
    });

    it("should allow scores outside the 0-1 range", () => {
      // Some fuzzy matching algorithms might return scores outside the typical 0-1 range
      const matchNegative: FuzzyMatchType = {
        matches: [{ match: "test" }],
        score: -5, // Negative score
      };

      const matchHigh: FuzzyMatchType = {
        matches: [{ match: "test" }],
        score: 100, // High score
      };

      expect(matchNegative.score).toBe(-5);
      expect(matchHigh.score).toBe(100);
    });
  });

  describe("FuzzyMatchOptions", () => {
    it("should allow empty options", () => {
      const options: FuzzyMatchOptions = {};
      expect(options).toBeDefined();
      expect(options.threshold).toBeUndefined();
      expect(options.ignoreCase).toBeUndefined();
      expect(options.ignoreDiacritics).toBeUndefined();
    });

    it("should allow all options", () => {
      const options: FuzzyMatchOptions = {
        threshold: 0.8,
        ignoreCase: true,
        ignoreDiacritics: true,
      };
      expect(options).toBeDefined();
      expect(options.threshold).toBe(0.8);
      expect(options.ignoreCase).toBe(true);
      expect(options.ignoreDiacritics).toBe(true);
    });

    it("should allow partial options", () => {
      const options1: FuzzyMatchOptions = {
        threshold: 0.5,
      };

      const options2: FuzzyMatchOptions = {
        ignoreCase: false,
      };

      const options3: FuzzyMatchOptions = {
        ignoreDiacritics: true,
      };

      expect(options1.threshold).toBe(0.5);
      expect(options1.ignoreCase).toBeUndefined();

      expect(options2.threshold).toBeUndefined();
      expect(options2.ignoreCase).toBe(false);

      expect(options3.ignoreDiacritics).toBe(true);
    });
  });

  describe("PaginationOptions", () => {
    it("should allow empty options", () => {
      const options: PaginationOptions = {};
      expect(options).toBeDefined();
      expect(options.page).toBeUndefined();
      expect(options.limit).toBeUndefined();
      expect(options.sortBy).toBeUndefined();
      expect(options.sortOrder).toBeUndefined();
    });

    it("should allow all options", () => {
      const options: PaginationOptions = {
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
      };
      expect(options).toBeDefined();
      expect(options.page).toBe(1);
      expect(options.limit).toBe(10);
      expect(options.sortBy).toBe("name");
      expect(options.sortOrder).toBe("asc");
    });

    it("should allow descending sort order", () => {
      const options: PaginationOptions = {
        sortOrder: "desc",
      };
      expect(options.sortOrder).toBe("desc");
    });

    it("should validate with different pagination parameters", () => {
      const options1: PaginationOptions = {
        page: 0, // First page (zero-indexed)
        limit: 5,
      };

      const options2: PaginationOptions = {
        page: 100, // High page number
        limit: 1000, // High limit
      };

      const options3: PaginationOptions = {
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      expect(options1.page).toBe(0);
      expect(options1.limit).toBe(5);

      expect(options2.page).toBe(100);
      expect(options2.limit).toBe(1000);

      expect(options3.sortBy).toBe("createdAt");
      expect(options3.sortOrder).toBe("desc");
    });
  });

  describe("PaginatedResult", () => {
    it("should allow paginated result with items", () => {
      const result: PaginatedResult<string> = {
        items: ["item1", "item2"],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      expect(result).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("should allow empty paginated result", () => {
      const result: PaginatedResult<string> = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      expect(result).toBeDefined();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("should work with different data types", () => {
      // Number array
      const numberResult: PaginatedResult<number> = {
        items: [1, 2, 3],
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      // Object array
      interface User {
        id: number;
        name: string;
      }

      const objectResult: PaginatedResult<User> = {
        items: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      expect(numberResult.items).toEqual([1, 2, 3]);
      expect(objectResult.items[0].name).toBe("John");
      expect(objectResult.items[1].id).toBe(2);
    });

    it("should handle large datasets", () => {
      // Test with pagination values for larger datasets
      const result: PaginatedResult<number> = {
        items: Array.from({ length: 20 }, (_, i) => i + 1),
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
      };

      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(5);
    });
  });
});
