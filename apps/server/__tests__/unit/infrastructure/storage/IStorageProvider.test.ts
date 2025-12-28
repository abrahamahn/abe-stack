import { ReadStream } from "fs";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { IStorageProvider } from "@infrastructure/storage";

describe("IStorageProvider", () => {
  let mockProvider: IStorageProvider;

  beforeEach(() => {
    mockProvider = {
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
      updateBaseUrl: vi.fn(),
      createDirectory: vi.fn().mockResolvedValue(undefined),
      saveFile: vi.fn().mockResolvedValue({ success: true, path: "test.txt" }),
      getFile: vi.fn().mockResolvedValue(Buffer.from("test")),
      getFileStream: vi
        .fn()
        .mockResolvedValue({ on: vi.fn() } as unknown as ReadStream),
      getFileMetadata: vi.fn().mockResolvedValue({
        size: 1024,
        mtime: new Date(),
        contentType: "text/plain",
      }),
      deleteFile: vi.fn().mockResolvedValue(true),
      fileExists: vi.fn().mockResolvedValue(true),
      listFiles: vi.fn().mockResolvedValue(["file1.txt", "file2.txt"]),
      copyFile: vi.fn().mockResolvedValue(true),
      moveFile: vi.fn().mockResolvedValue(true),
      getFileUrl: vi.fn().mockResolvedValue("http://example.com/file.txt"),
    };
  });

  describe("initialization", () => {
    it("should initialize and shutdown", async () => {
      await mockProvider.initialize();
      expect(mockProvider.initialize).toHaveBeenCalled();

      await mockProvider.shutdown();
      expect(mockProvider.shutdown).toHaveBeenCalled();
    });
  });

  describe("base URL", () => {
    it("should update base URL", () => {
      mockProvider.updateBaseUrl("http://new-url.com");
      expect(mockProvider.updateBaseUrl).toHaveBeenCalledWith(
        "http://new-url.com",
      );
    });
  });

  describe("file operations", () => {
    it("should create directory", async () => {
      await mockProvider.createDirectory("/test/dir");
      expect(mockProvider.createDirectory).toHaveBeenCalledWith("/test/dir");
    });

    it("should save file", async () => {
      const result = await mockProvider.saveFile(
        "/test.txt",
        Buffer.from("test"),
      );
      expect(mockProvider.saveFile).toHaveBeenCalledWith(
        "/test.txt",
        expect.any(Buffer),
      );
      expect(result).toEqual({ success: true, path: "test.txt" });
    });

    it("should get file", async () => {
      const result = await mockProvider.getFile("/test.txt");
      expect(mockProvider.getFile).toHaveBeenCalledWith("/test.txt");
      expect(result).toBeInstanceOf(Buffer);
    });

    it("should get file stream", async () => {
      const result = await mockProvider.getFileStream("/test.txt");
      expect(mockProvider.getFileStream).toHaveBeenCalledWith("/test.txt");
      expect(result).toBeDefined();
      expect(result.on).toBeDefined();
    });

    it("should get file metadata", async () => {
      const result = await mockProvider.getFileMetadata("/test.txt");
      expect(mockProvider.getFileMetadata).toHaveBeenCalledWith("/test.txt");
      expect(result).toHaveProperty("size");
      expect(result).toHaveProperty("mtime");
      expect(result).toHaveProperty("contentType");
    });

    it("should delete file", async () => {
      const result = await mockProvider.deleteFile("/test.txt");
      expect(mockProvider.deleteFile).toHaveBeenCalledWith("/test.txt");
      expect(result).toBe(true);
    });

    it("should check file existence", async () => {
      const result = await mockProvider.fileExists("/test.txt");
      expect(mockProvider.fileExists).toHaveBeenCalledWith("/test.txt");
      expect(result).toBe(true);
    });

    it("should list files", async () => {
      const result = await mockProvider.listFiles("/test");
      expect(mockProvider.listFiles).toHaveBeenCalledWith("/test");
      expect(result).toEqual(["file1.txt", "file2.txt"]);
    });

    it("should copy file", async () => {
      const result = await mockProvider.copyFile("/source.txt", "/target.txt");
      expect(mockProvider.copyFile).toHaveBeenCalledWith(
        "/source.txt",
        "/target.txt",
      );
      expect(result).toBe(true);
    });

    it("should move file", async () => {
      const result = await mockProvider.moveFile("/source.txt", "/target.txt");
      expect(mockProvider.moveFile).toHaveBeenCalledWith(
        "/source.txt",
        "/target.txt",
      );
      expect(result).toBe(true);
    });

    it("should get file URL", async () => {
      const result = await mockProvider.getFileUrl("/test.txt");
      expect(mockProvider.getFileUrl).toHaveBeenCalledWith("/test.txt");
      expect(result).toBe("http://example.com/file.txt");
    });
  });
});
