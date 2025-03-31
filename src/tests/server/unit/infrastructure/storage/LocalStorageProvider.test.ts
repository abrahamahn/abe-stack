import fs from "fs";
import path from "path";

import { v4 as uuidv4 } from "uuid";

import {
  FileUtils,
  LocalStorageProvider,
  MediaProcessor,
} from "@/server/infrastructure/";
import type { ILoggerService } from "@/server/infrastructure/logging";
// Mock dependencies
jest.mock("fs");
jest.mock("uuid");
jest.mock("@infrastructure/storage/FileUtils");
jest.mock("@infrastructure/storage/processor/MediaProcessor");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn(),
  dirname: jest.fn(),
  relative: jest.fn(),
}));

describe("LocalStorageProvider", () => {
  let storageProvider: LocalStorageProvider;
  let mockLogger: ILoggerService;
  let mockFileUtils: jest.Mocked<FileUtils>;
  let mockMediaProcessor: jest.Mocked<MediaProcessor>;
  let mockConfigProvider: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock UUID
    (uuidv4 as jest.Mock).mockReturnValue("mock-uuid");

    // Mock path.join and path.dirname
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    (path.dirname as jest.Mock).mockImplementation((p) =>
      p.substring(0, p.lastIndexOf("/")),
    );
    (path.relative as jest.Mock).mockImplementation((from, to) =>
      to.replace(from + "/", ""),
    );

    // Create mock logger
    mockLogger = {
      createLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
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
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock FileUtils and MediaProcessor
    mockFileUtils = new FileUtils(mockLogger) as jest.Mocked<FileUtils>;
    mockMediaProcessor = jest.createMockFromModule<MediaProcessor>(
      "@infrastructure/storage/processor/MediaProcessor",
    ) as jest.Mocked<MediaProcessor>;
    mockMediaProcessor.processMedia = jest.fn().mockResolvedValue({
      path: "/storage/images/photo.jpg",
      url: "https://example.com/files/images/photo.jpg",
      contentType: "image/jpeg",
      size: 12345,
    });

    (MediaProcessor as jest.Mock).mockImplementation(() => mockMediaProcessor);

    // Mock constructor dependencies
    (FileUtils as jest.Mock).mockImplementation(() => mockFileUtils);

    // Create storage provider
    storageProvider = new LocalStorageProvider(mockLogger, mockConfigProvider);
  });

  describe("constructor", () => {
    it("should create instance and respect test environment", () => {
      // Reset existsSync to test directory creation
      (fs.existsSync as jest.Mock)
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
      const logger = (mockLogger.createLogger as jest.Mock).mock.results[0]
        .value;
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
      Date.now = jest.fn(() => 1000000000000); // Fixed timestamp

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
      (path.join as jest.Mock).mockReturnValueOnce(absolutePath);
      (path.dirname as jest.Mock).mockReturnValueOnce("/storage/documents");

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
      (path.join as jest.Mock).mockReturnValueOnce(absolutePath);
      (path.dirname as jest.Mock).mockReturnValueOnce("/storage/images");

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
      (path.join as jest.Mock).mockReturnValueOnce(absolutePath);

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
      (path.join as jest.Mock).mockReturnValueOnce(absolutePath);

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
      (path.join as jest.Mock).mockReturnValueOnce(absolutePath);

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
