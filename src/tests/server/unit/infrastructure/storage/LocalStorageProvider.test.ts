import fs from "fs";
import path from "path";

import { v4 as uuidv4 } from "uuid";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { FileUtils, LocalStorageProvider } from "@/server/infrastructure/";
import type { ILoggerService } from "@/server/infrastructure/logging";
import { MediaProcessor } from "@/server/infrastructure/processor/MediaProcessor";
// Mock dependencies
vi.mock("fs");
vi.mock("uuid");
vi.mock("@infrastructure/storage/FileUtils");
vi.mock("@infrastructure/storage/processor/MediaProcessor");
vi.mock("path", () => ({
  ...vi.importActual("path"),
  join: vi.fn(),
  dirname: vi.fn(),
  relative: vi.fn(),
}));

describe("LocalStorageProvider", () => {
  let storageProvider: LocalStorageProvider;
  let mockLogger: ILoggerService;
  let mockFileUtils: any;
  let mockMediaProcessor: any;
  let mockConfigProvider: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock UUID
    (uuidv4 as ReturnType<typeof vi.fn>).mockReturnValue("mock-uuid");

    // Mock path methods
    (path.join as ReturnType<typeof vi.fn>).mockImplementation((...args: any) =>
      args.join("/"),
    );
    (path.dirname as ReturnType<typeof vi.fn>).mockImplementation((p: any) =>
      p.substring(0, p.lastIndexOf("/")),
    );
    (path.relative as ReturnType<typeof vi.fn>).mockImplementation(
      (from: any, to: any) => to.replace(from + "/", ""),
    );

    // Create mock logger
    mockLogger = {
      createLogger: vi.fn().mockReturnValue({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    } as unknown as ILoggerService;

    // Create config
    mockConfigProvider = {
      config: {
        basePath: "/storage",
        baseUrl: "https://example.com/files",
        tempDir: "/tmp",
      },
      configService: {} as any,
      getConfig: () => mockConfigProvider.config,
      getConfigSchema: () => ({}),
      loadConfig: () => Promise.resolve(),
    };

    // Mock fs.existsSync
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    // Mock FileUtils and MediaProcessor
    mockFileUtils = new FileUtils(mockLogger) as any;
    mockMediaProcessor = {
      processMedia: vi.fn().mockResolvedValue({
        path: "/storage/images/photo.jpg",
        url: "https://example.com/files/images/photo.jpg",
        contentType: "image/jpeg",
        size: 12345,
        metadata: {
          dimensions: { width: 800, height: 600 },
        },
      }),
    };

    (MediaProcessor as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockMediaProcessor,
    );
    (FileUtils as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockFileUtils,
    );

    // Create storage provider
    storageProvider = new LocalStorageProvider(mockLogger, mockConfigProvider);
  });

  describe("constructor", () => {
    it("should create instance and respect test environment", () => {
      // Reset existsSync to test directory creation
      (fs.existsSync as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false);

      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;

      // Set non-test environment to verify directory checks
      process.env.NODE_ENV = "development";
      process.env.DISABLE_REAL_STORAGE = undefined;

      // Re-create instance
      storageProvider = new LocalStorageProvider(
        mockLogger,
        mockConfigProvider,
      );

      // Check if directories were checked
      expect(fs.existsSync).toHaveBeenCalledWith("/storage");
      expect(fs.existsSync).toHaveBeenCalledWith("/tmp");

      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
      process.env.DISABLE_REAL_STORAGE = "true";
    });
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      await storageProvider.initialize();

      expect(mockLogger.createLogger).toHaveBeenCalledWith(
        "LocalStorageProvider",
      );
      const logger = (mockLogger.createLogger as ReturnType<typeof vi.fn>).mock
        .results[0].value;
      expect(logger.info).toHaveBeenCalledWith(
        "LocalStorageProvider initialized",
        {
          basePath: "/storage",
          tempDir: "/tmp",
          baseUrl: "https://example.com/files",
        },
      );
    });
  });

  describe("shutdown", () => {
    it("should shutdown successfully", async () => {
      await storageProvider.shutdown();
      // Verify any cleanup if needed
    });
  });

  describe("updateBaseUrl", () => {
    it("should update base URL", () => {
      const newBaseUrl = "https://new-example.com/files";
      storageProvider.updateBaseUrl(newBaseUrl);

      // Verify URL update
      const result = storageProvider.getFileUrl("test.jpg");
      expect(result).toBe("https://new-example.com/files/test.jpg");
    });
  });

  describe("createDirectory", () => {
    it("should create directory successfully", async () => {
      const dirPath = "test/dir";
      const absolutePath = "/storage/test/dir";

      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      mockFileUtils.ensureDirectory.mockResolvedValue(undefined);

      await storageProvider.createDirectory(dirPath);
      expect(mockFileUtils.ensureDirectory).toHaveBeenCalledWith(absolutePath);
    });

    it("should handle directory creation errors", async () => {
      const dirPath = "test/dir";
      const absolutePath = "/storage/test/dir";
      const error = new Error("Failed to create directory");

      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      mockFileUtils.ensureDirectory.mockRejectedValue(error);

      await expect(storageProvider.createDirectory(dirPath)).rejects.toThrow(
        error,
      );
    });
  });

  describe("getFile", () => {
    it("should get file successfully", async () => {
      const filePath = "test/file.txt";
      const absolutePath = "/storage/test/file.txt";
      const fileContent = Buffer.from("test content");

      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      mockFileUtils.fileExists.mockResolvedValue(true);
      mockFileUtils.readFile.mockResolvedValue(fileContent);

      const result = await storageProvider.getFile(filePath);
      expect(result).toEqual(fileContent);
    });

    it("should handle non-existent files", async () => {
      const filePath = "nonexistent.txt";
      const absolutePath = "/storage/nonexistent.txt";

      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      mockFileUtils.fileExists.mockResolvedValue(false);

      await expect(storageProvider.getFile(filePath)).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("getFileStream", () => {
    it("should get file stream successfully", async () => {
      const filePath = "test/file.txt";
      const absolutePath = "/storage/test/file.txt";
      const mockStream = { on: vi.fn() };

      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      mockFileUtils.fileExists.mockResolvedValue(true);
      mockFileUtils.createReadStream.mockReturnValue(mockStream);

      const result = await storageProvider.getFileStream(filePath);
      expect(result).toBe(mockStream);
    });

    it("should handle non-existent files", async () => {
      const filePath = "nonexistent.txt";
      const absolutePath = "/storage/nonexistent.txt";

      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      mockFileUtils.fileExists.mockResolvedValue(false);

      await expect(storageProvider.getFileStream(filePath)).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("getFileUrl", () => {
    it("should generate correct URL for a file", async () => {
      const filePath = "images/photo.jpg";
      const url = await storageProvider.getFileUrl(filePath);

      expect(url).toBe("https://example.com/files/images/photo.jpg");
    });

    it("should handle paths with leading slashes", async () => {
      const filePath = "/images/photo.jpg";
      const url = await storageProvider.getFileUrl(filePath);

      expect(url).toBe("https://example.com/files/images/photo.jpg");
    });

    it("should add expiration time if provided", async () => {
      const filePath = "images/photo.jpg";
      const expiresIn = 3600; // 1 hour

      // Mock Date.now
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1000000000000); // Fixed timestamp

      try {
        const url = await storageProvider.getFileUrl(filePath, expiresIn);

        expect(url).toBe(
          "https://example.com/files/images/photo.jpg?expires=1000003600",
        );
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  describe("saveFile", () => {
    it("should save a regular file", async () => {
      const filePath = "documents/report.pdf";
      const fileData = Buffer.from("file content");
      const absolutePath = "/storage/documents/report.pdf";
      const tempPath = "/tmp/mock-uuid";
      const contentType = "application/pdf";
      const stats = {
        size: 12,
        mtime: new Date(),
      };

      // Mock file utilities
      mockFileUtils.writeFile.mockResolvedValue(undefined);
      mockFileUtils.detectContentType.mockReturnValue(contentType);
      mockFileUtils.ensureDirectory.mockResolvedValue(undefined);
      mockFileUtils.moveFile.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue(stats as any);

      // Mock path.join to return the absolute path
      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      (path.dirname as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        "/storage/documents",
      );

      const result = await storageProvider.saveFile(filePath, fileData);

      expect(mockFileUtils.writeFile).toHaveBeenCalledWith(tempPath, fileData);
      expect(mockFileUtils.detectContentType).toHaveBeenCalledWith(tempPath);
      expect(mockFileUtils.ensureDirectory).toHaveBeenCalledWith(
        "/storage/documents",
      );
      expect(mockFileUtils.moveFile).toHaveBeenCalledWith(
        tempPath,
        absolutePath,
      );
      expect(mockFileUtils.getFileStats).toHaveBeenCalledWith(absolutePath);

      expect(result).toEqual({
        path: filePath,
        url: "https://example.com/files/documents/report.pdf",
        metadata: {
          contentType,
          size: stats.size,
          lastModified: stats.mtime,
          etag: expect.any(String),
          custom: undefined,
        },
      });
    });

    it("should save and process an image file", async () => {
      const filePath = "images/photo.jpg";
      const fileData = Buffer.from("image content");
      const absolutePath = "/storage/images/photo.jpg";
      const tempPath = "/tmp/mock-uuid";
      const contentType = "image/jpeg";
      const stats = {
        size: 1024,
        mtime: new Date(),
      };

      // Mock utilities for image processing
      mockFileUtils.writeFile.mockResolvedValue(undefined);
      mockFileUtils.detectContentType.mockReturnValue(contentType);
      mockFileUtils.ensureDirectory.mockResolvedValue(undefined);
      mockFileUtils.moveFile.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue(stats as any);

      // Mock path.join to return the absolute path
      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);
      (path.dirname as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        "/storage/images",
      );

      // Mock media processor
      mockMediaProcessor.processMedia.mockResolvedValue({
        path: absolutePath,
        url: "https://example.com/files/images/photo.jpg",
        contentType,
        size: stats.size,
        dimensions: { width: 800, height: 600 },
      });

      const result = await storageProvider.saveFile(filePath, fileData);

      expect(mockFileUtils.writeFile).toHaveBeenCalledWith(tempPath, fileData);
      expect(mockFileUtils.detectContentType).toHaveBeenCalledWith(tempPath);
      expect(mockMediaProcessor.processMedia).toHaveBeenCalledWith(tempPath, {
        width: undefined,
        height: undefined,
        quality: undefined,
        format: undefined,
        targetPath: absolutePath,
      });
      expect(mockFileUtils.deleteFile).toHaveBeenCalledWith(tempPath);

      expect(result).toEqual({
        path: filePath,
        url: "https://example.com/files/images/photo.jpg",
        metadata: {
          contentType,
          dimensions: { width: 800, height: 600 },
          size: stats.size,
          lastModified: expect.any(Date),
          etag: expect.any(String),
          custom: undefined,
        },
      });
    });
  });

  describe("getFileMetadata", () => {
    it("should get metadata for a file", async () => {
      const filePath = "documents/report.pdf";
      const absolutePath = "/storage/documents/report.pdf";
      const contentType = "application/pdf";
      const stats = {
        size: 1024,
        mtime: new Date(),
        getTime: () => stats.mtime.getTime(),
      };

      // Mock path.join to return the absolute path
      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);

      // Mock file utilities
      mockFileUtils.fileExists.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue(stats as any);
      mockFileUtils.detectContentType.mockReturnValue(contentType);

      const result = await storageProvider.getFileMetadata(filePath);

      expect(mockFileUtils.fileExists).toHaveBeenCalledWith(absolutePath);
      expect(mockFileUtils.getFileStats).toHaveBeenCalledWith(absolutePath);
      expect(mockFileUtils.detectContentType).toHaveBeenCalledWith(
        absolutePath,
      );

      expect(result).toEqual({
        contentType,
        size: stats.size,
        lastModified: stats.mtime,
        etag: expect.any(String),
      });
    });

    it("should throw error if file does not exist", async () => {
      const filePath = "nonexistent.txt";
      const absolutePath = "/storage/nonexistent.txt";

      // Mock path.join to return the absolute path
      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);

      // Mock file utilities
      mockFileUtils.fileExists.mockResolvedValue(false);

      await expect(storageProvider.getFileMetadata(filePath)).rejects.toThrow(
        "File not found: nonexistent.txt",
      );
    });
  });

  describe("listFiles", () => {
    it("should list files in a directory", async () => {
      const directory = "documents";
      const absolutePath = "/storage/documents";
      const files = [
        "/storage/documents/file1.txt",
        "/storage/documents/file2.pdf",
        "/storage/documents/subdir/file3.doc",
      ];

      // Mock path.join to return the absolute path
      (path.join as ReturnType<typeof vi.fn>).mockReturnValueOnce(absolutePath);

      // Mock file utilities
      mockFileUtils.listFiles.mockResolvedValue(files);

      const result = await storageProvider.listFiles(directory);

      expect(mockFileUtils.listFiles).toHaveBeenCalledWith(
        absolutePath,
        undefined,
      );
      expect(result).toEqual([
        "documents/file1.txt",
        "documents/file2.pdf",
        "documents/subdir/file3.doc",
      ]);
    });
  });
});
