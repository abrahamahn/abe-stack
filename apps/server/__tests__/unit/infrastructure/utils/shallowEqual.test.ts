import { describe, it, expect } from "vitest";

import { shallowEqual } from "../../../../../server/infrastructure/utils/shallowEqual";

describe("shallowEqual", () => {
  describe("primitive values", () => {
    it("should return true for identical primitive values", () => {
      expect(shallowEqual(1, 1)).toBe(true);
      expect(shallowEqual("test", "test")).toBe(true);
      expect(shallowEqual(true, true)).toBe(true);
      expect(shallowEqual(null, null)).toBe(true);
      expect(shallowEqual(undefined, undefined)).toBe(true);
    });

    it("should return false for different primitive values", () => {
      expect(shallowEqual(1, 2)).toBe(false);
      expect(shallowEqual("test", "other")).toBe(false);
      expect(shallowEqual(true, false)).toBe(false);
      expect(shallowEqual(null, undefined)).toBe(false);
    });
  });

  describe("arrays", () => {
    it("should return true for identical arrays", () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(shallowEqual(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
      expect(shallowEqual([], [])).toBe(true);
    });

    it("should return false for arrays with different lengths", () => {
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(shallowEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it("should return false for arrays with different values", () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(shallowEqual(["a", "b"], ["a", "c"])).toBe(false);
    });

    it("should return false when comparing array with non-array", () => {
      expect(shallowEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
      expect(shallowEqual([1, 2], "1,2")).toBe(false);
    });
  });

  describe("objects", () => {
    it("should return true for identical objects", () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(shallowEqual({}, {})).toBe(true);
    });

    it("should return true for objects with same keys in different order", () => {
      expect(shallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });

    it("should return false for objects with different keys", () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it("should return false for objects with different values", () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    });

    it("should return false when comparing object with non-object", () => {
      expect(shallowEqual({ a: 1 }, [1])).toBe(false);
      expect(shallowEqual({ a: 1 }, "a:1")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle nested objects", () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { b: 1 } };
      expect(shallowEqual(obj1, obj2)).toBe(false); // Shallow comparison
    });

    it("should handle circular references", () => {
      const obj1: any = { a: 1 };
      obj1.self = obj1;
      const obj2: any = { a: 1 };
      obj2.self = obj2;
      expect(shallowEqual(obj1, obj2)).toBe(true);
    });

    it("should handle undefined and null values", () => {
      expect(shallowEqual({ a: undefined }, { a: undefined })).toBe(true);
      expect(shallowEqual({ a: null }, { a: null })).toBe(true);
      expect(shallowEqual({ a: undefined }, { a: null })).toBe(false);
    });
  });
});
