import { URL } from "url";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  normalizeFilename,
  getSignedFileUrl,
  type FileSignatureData,
} from "@infrastructure/files/fileHelpers";
import { getPath } from "@infrastructure/files/pathHelpers";

describe("File Infrastructure Integration Tests", () => {
  describe("File Helpers", () => {
    describe("normalizeFilename", () => {
      it("should normalize filenames with special characters", () => {
        const testCases = [
          {
            input: "My File (1).PDF",
            expected: "My_File_1_.pdf",
          },
          {
            input: "user@example.com_avatar.jpg",
            expected: "user_example.com_avatar.jpg",
          },
          {
            input: "document#123.PDF",
            expected: "document_123.pdf",
          },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(normalizeFilename(input)).toBe(expected);
        });
      });

      it("should handle filenames with multiple extensions", () => {
        const testCases = [
          {
            input: "archive.tar.gz",
            expected: "archive.tar.gz",
          },
          {
            input: "document.min.js",
            expected: "document.min.js",
          },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(normalizeFilename(input)).toBe(expected);
        });
      });

      it("should handle filenames without extensions", () => {
        const testCases = [
          {
            input: "README",
            expected: "README",
          },
          {
            input: "Dockerfile",
            expected: "Dockerfile",
          },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(normalizeFilename(input)).toBe(expected);
        });
      });
    });

    describe("getSignedFileUrl", () => {
      const mockConfig = {
        baseUrl: "https://example.com",
        signatureSecret: Buffer.from("test-secret"),
        production: false,
        corsOrigin: "*",
        passwordSalt: "test-salt",
        port: 3000,
        host: "localhost",
        uploadPath: "/uploads",
        tempPath: "/temp",
        storagePath: "/storage",
        storageUrl: "https://storage.example.com",
      };

      const mockEnvironment = {
        config: mockConfig,
      };

      it("should generate signed URLs for file access", () => {
        const data: FileSignatureData = {
          method: "get",
          id: "123",
          filename: "test.jpg",
          expirationMs: Date.now() + 3600000, // 1 hour from now
        };

        const url = getSignedFileUrl(mockEnvironment, data);

        expect(url).toBeInstanceOf(URL);
        expect(url.origin).toBe(mockConfig.baseUrl);
        expect(url.pathname).toBe(`/uploads/${data.id}/${data.filename}`);
        expect(url.searchParams.has("expiration")).toBe(true);
        expect(url.searchParams.has("signature")).toBe(true);
      });

      it("should generate signed URLs for file upload", () => {
        const data: FileSignatureData = {
          method: "put",
          id: "456",
          filename: "upload.pdf",
          expirationMs: Date.now() + 1800000, // 30 minutes from now
        };

        const url = getSignedFileUrl(mockEnvironment, data);

        expect(url).toBeInstanceOf(URL);
        expect(url.origin).toBe(mockConfig.baseUrl);
        expect(url.pathname).toBe(`/uploads/${data.id}/${data.filename}`);
        expect(url.searchParams.has("expiration")).toBe(true);
        expect(url.searchParams.has("signature")).toBe(true);
      });

      it("should handle normalized filenames in signed URLs", () => {
        const data: FileSignatureData = {
          method: "get",
          id: "789",
          filename: "My File (1).PDF",
          expirationMs: Date.now() + 7200000, // 2 hours from now
        };

        const url = getSignedFileUrl(mockEnvironment, data);
        const normalizedFilename = normalizeFilename(data.filename);

        expect(url.pathname).toBe(`/uploads/${data.id}/${normalizedFilename}`);
      });

      it("should generate different signatures for different expiration times", () => {
        const data1: FileSignatureData = {
          method: "get",
          id: "123",
          filename: "test.jpg",
          expirationMs: Date.now() + 3600000,
        };

        const data2: FileSignatureData = {
          ...data1,
          expirationMs: Date.now() + 7200000,
        };

        const url1 = getSignedFileUrl(mockEnvironment, data1);
        const url2 = getSignedFileUrl(mockEnvironment, data2);

        expect(url1.searchParams.get("signature")).not.toBe(
          url2.searchParams.get("signature"),
        );
      });
    });
  });

  describe("Path Helpers", () => {
    const originalCwd = process.cwd;

    beforeEach(() => {
      // Mock process.cwd() to return a consistent path for testing
      process.cwd = vi.fn().mockReturnValue("/test/root");
    });

    afterEach(() => {
      // Restore original process.cwd
      process.cwd = originalCwd;
    });

    it("should resolve relative paths correctly", () => {
      const testCases = [
        {
          input: "uploads",
          expected: "/test/root/uploads",
        },
        {
          input: "data/files",
          expected: "/test/root/data/files",
        },
        {
          input: "./config",
          expected: "/test/root/config",
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(getPath(input)).toBe(expected);
      });
    });

    it("should handle absolute paths", () => {
      const testCases = [
        {
          input: "/absolute/path",
          expected: "/absolute/path",
        },
        {
          input: "/var/log",
          expected: "/var/log",
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(getPath(input)).toBe(expected);
      });
    });

    it("should handle paths with special characters", () => {
      const testCases = [
        {
          input: "path with spaces",
          expected: "/test/root/path with spaces",
        },
        {
          input: "path/with/parent",
          expected: "/test/root/path/with/parent",
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(getPath(input)).toBe(expected);
      });
    });
  });
});
