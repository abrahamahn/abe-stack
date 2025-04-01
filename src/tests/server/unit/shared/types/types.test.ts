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
  });
});
