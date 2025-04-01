import { describe, it, expect } from "vitest";

import {
  fuzzyMatch,
  fuzzyMatchScore,
  fuzzyMatchScore2,
  type FuzzyMatchResult,
} from "../../../../../server/shared/utils/fuzzyMatch";

describe("fuzzyMatch", () => {
  describe("fuzzyMatch function", () => {
    it("should match exact strings", () => {
      const result = fuzzyMatch("test", "test");
      expect(result).toEqual([{ match: "test" }]);
    });

    it("should handle partial matches", () => {
      const result = fuzzyMatch("test", "testing");
      expect(result).toEqual([{ match: "test" }, { skip: "ing" }]);
    });

    it("should handle multiple matches", () => {
      const result = fuzzyMatch("test", "testtest");
      expect(result).toEqual([{ match: "test" }, { match: "test" }]);
    });

    it("should handle case-insensitive matches", () => {
      const result = fuzzyMatch("TEST", "test");
      expect(result).toEqual([{ match: "test" }]);
    });

    it("should handle empty strings", () => {
      const result = fuzzyMatch("", "");
      expect(result).toEqual([]);
    });

    it("should handle pattern longer than text", () => {
      const result = fuzzyMatch("testing", "test");
      expect(result).toEqual([{ match: "test" }]);
    });

    it("should handle text longer than pattern", () => {
      const result = fuzzyMatch("test", "testing");
      expect(result).toEqual([{ match: "test" }, { skip: "ing" }]);
    });

    it("should handle non-matching characters", () => {
      const result = fuzzyMatch("test", "xytest");
      expect(result).toEqual([{ skip: "xy" }, { match: "test" }]);
    });

    it("should handle backtracking for better matches", () => {
      const result = fuzzyMatch("test", "tstest");
      expect(result).toEqual([{ skip: "ts" }, { match: "test" }]);
    });

    it("should merge consecutive matches and skips", () => {
      const result = fuzzyMatch("test", "testtest");
      expect(result).toEqual([{ match: "test" }, { match: "test" }]);
    });
  });

  describe("fuzzyMatchScore function", () => {
    it("should return 0 for undefined match", () => {
      expect(fuzzyMatchScore(undefined)).toBe(0);
    });

    it("should return 1 for perfect match", () => {
      const match: FuzzyMatchResult[] = [{ match: "test" }];
      expect(fuzzyMatchScore(match)).toBe(1);
    });

    it("should return lower score for partial match", () => {
      const match: FuzzyMatchResult[] = [{ match: "test" }, { skip: "ing" }];
      expect(fuzzyMatchScore(match)).toBeLessThan(1);
    });

    it("should handle multiple matches", () => {
      const match: FuzzyMatchResult[] = [
        { match: "test" },
        { skip: "ing" },
        { match: "test" },
      ];
      expect(fuzzyMatchScore(match)).toBeGreaterThan(0);
    });

    it("should handle empty matches", () => {
      const match: FuzzyMatchResult[] = [];
      expect(fuzzyMatchScore(match)).toBe(0);
    });
  });

  describe("fuzzyMatchScore2 function", () => {
    it("should return 0 for undefined match", () => {
      expect(fuzzyMatchScore2(undefined)).toBe(0);
    });

    it("should return higher score for matches at start", () => {
      const match1: FuzzyMatchResult[] = [{ match: "test" }];
      const match2: FuzzyMatchResult[] = [{ skip: "xy" }, { match: "test" }];
      expect(fuzzyMatchScore2(match1)).toBeGreaterThan(
        fuzzyMatchScore2(match2),
      );
    });

    it("should handle multiple matches", () => {
      const match: FuzzyMatchResult[] = [
        { match: "test" },
        { skip: "ing" },
        { match: "test" },
      ];
      expect(fuzzyMatchScore2(match)).toBeGreaterThan(0);
    });

    it("should handle empty matches", () => {
      const match: FuzzyMatchResult[] = [];
      expect(fuzzyMatchScore2(match)).toBe(0);
    });

    it("should handle longer matches", () => {
      const match1: FuzzyMatchResult[] = [{ match: "test" }];
      const match2: FuzzyMatchResult[] = [{ match: "testing" }];
      expect(fuzzyMatchScore2(match2)).toBeGreaterThan(
        fuzzyMatchScore2(match1),
      );
    });
  });
});
