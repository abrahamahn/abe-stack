import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getPath } from "@infrastructure/files";

describe("pathHelpers", () => {
  describe("getPath", () => {
    const originalCwd = process.cwd;

    beforeEach(() => {
      // Mock process.cwd to return a consistent path for testing
      process.cwd = vi.fn().mockReturnValue("/test/root");
    });

    afterEach(() => {
      // Restore original process.cwd
      process.cwd = originalCwd;
    });

    it("should join paths correctly", () => {
      const result = getPath("uploads/test.jpg");
      expect(result).toBe("/test/root/uploads/test.jpg");
    });

    it("should handle absolute paths", () => {
      const result = getPath("/absolute/path/test.jpg");
      expect(result).toBe("/absolute/path/test.jpg");
    });

    it("should handle empty path", () => {
      const result = getPath("");
      expect(result).toBe("/test/root");
    });

    it("should handle path with multiple segments", () => {
      const result = getPath("uploads/2024/01/test.jpg");
      expect(result).toBe("/test/root/uploads/2024/01/test.jpg");
    });

    it("should handle path with special characters", () => {
      const result = getPath("uploads/test@#$%^&*()_+.jpg");
      expect(result).toBe("/test/root/uploads/test@#$%^&*()_+.jpg");
    });

    it("should handle path with spaces", () => {
      const result = getPath("uploads/test file.jpg");
      expect(result).toBe("/test/root/uploads/test file.jpg");
    });

    it("should handle path with dots", () => {
      const result = getPath("uploads/test.file.jpg");
      expect(result).toBe("/test/root/uploads/test.file.jpg");
    });

    it("should handle path with parent directory references", () => {
      const result = getPath("uploads/../test.jpg");
      expect(result).toBe("/test/root/test.jpg");
    });
  });
});
