import { describe, it, expect } from "vitest";

import { ServerConfig } from "@server/infrastructure/config/ConfigService";

import {
  normalizeFilename,
  getSignedFileUrl,
  FileSignatureData,
} from "../../../../../server/infrastructure/files/fileHelpers";

describe("fileHelpers", () => {
  describe("normalizeFilename", () => {
    it("should normalize filenames with special characters", () => {
      expect(normalizeFilename("test@#$%^&*()_+.jpg")).toBe(
        "test_________.jpg",
      );
    });

    it("should convert extension to lowercase", () => {
      expect(normalizeFilename("test.JPG")).toBe("test.jpg");
    });

    it("should handle multiple extensions", () => {
      expect(normalizeFilename("test.tar.gz")).toBe("test.tar.gz");
    });

    it("should handle filenames without extensions", () => {
      expect(normalizeFilename("test")).toBe("test");
    });

    it("should handle filenames with spaces", () => {
      expect(normalizeFilename("test file.jpg")).toBe("test_file.jpg");
    });

    it("should handle filenames with multiple dots", () => {
      expect(normalizeFilename("test.file.name.jpg")).toBe(
        "test.file.name.jpg",
      );
    });
  });

  describe("getSignedFileUrl", () => {
    const mockConfig: ServerConfig = {
      baseUrl: "http://localhost:3000",
      signatureSecret: Buffer.from("test-secret"),
      production: false,
      corsOrigin: "localhost",
      passwordSalt: "test-salt",
      port: 3000,
      host: "localhost",
      uploadPath: "uploads",
      tempPath: "temp",
      storagePath: "storage",
      storageUrl: "http://localhost:3000/storage",
    };

    const mockEnvironment = {
      config: mockConfig,
    };

    it("should generate a valid signed URL for GET request", () => {
      const data: FileSignatureData = {
        method: "get",
        id: "test-id",
        filename: "test.jpg",
        expirationMs: Date.now() + 3600000, // 1 hour from now
      };

      const url = getSignedFileUrl(mockEnvironment, data);

      expect(url).toBeInstanceOf(URL);
      expect(url.origin).toBe("http://localhost:3000");
      expect(url.pathname).toBe("/uploads/test-id/test.jpg");
      expect(url.searchParams.has("expiration")).toBe(true);
      expect(url.searchParams.has("signature")).toBe(true);
    });

    it("should generate a valid signed URL for PUT request", () => {
      const data: FileSignatureData = {
        method: "put",
        id: "test-id",
        filename: "test.jpg",
        expirationMs: Date.now() + 3600000, // 1 hour from now
      };

      const url = getSignedFileUrl(mockEnvironment, data);

      expect(url).toBeInstanceOf(URL);
      expect(url.origin).toBe("http://localhost:3000");
      expect(url.pathname).toBe("/uploads/test-id/test.jpg");
      expect(url.searchParams.has("expiration")).toBe(true);
      expect(url.searchParams.has("signature")).toBe(true);
    });

    it("should generate different signatures for different methods", () => {
      const getData: FileSignatureData = {
        method: "get",
        id: "test-id",
        filename: "test.jpg",
        expirationMs: Date.now() + 3600000,
      };

      const putData: FileSignatureData = {
        method: "put",
        id: "test-id",
        filename: "test.jpg",
        expirationMs: Date.now() + 3600000,
      };

      const getUrl = getSignedFileUrl(mockEnvironment, getData);
      const putUrl = getSignedFileUrl(mockEnvironment, putData);

      expect(getUrl.searchParams.get("signature")).not.toBe(
        putUrl.searchParams.get("signature"),
      );
    });

    it("should generate different signatures for different files", () => {
      const data1: FileSignatureData = {
        method: "get",
        id: "test-id-1",
        filename: "test1.jpg",
        expirationMs: Date.now() + 3600000,
      };

      const data2: FileSignatureData = {
        method: "get",
        id: "test-id-2",
        filename: "test2.jpg",
        expirationMs: Date.now() + 3600000,
      };

      const url1 = getSignedFileUrl(mockEnvironment, data1);
      const url2 = getSignedFileUrl(mockEnvironment, data2);

      expect(url1.searchParams.get("signature")).not.toBe(
        url2.searchParams.get("signature"),
      );
    });

    it("should generate different signatures for different expiration times", () => {
      const data1: FileSignatureData = {
        method: "get",
        id: "test-id",
        filename: "test.jpg",
        expirationMs: Date.now() + 3600000, // 1 hour
      };

      const data2: FileSignatureData = {
        method: "get",
        id: "test-id",
        filename: "test.jpg",
        expirationMs: Date.now() + 7200000, // 2 hours
      };

      const url1 = getSignedFileUrl(mockEnvironment, data1);
      const url2 = getSignedFileUrl(mockEnvironment, data2);

      expect(url1.searchParams.get("signature")).not.toBe(
        url2.searchParams.get("signature"),
      );
    });
  });
});
