import { ReadStream } from "fs";

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  StorageService,
  FileMetadata,
  FileSaveResult,
} from "@infrastructure/storage";

import type { ILoggerService } from "@infrastructure/logging";

describe("StorageService", () => {
  let storageService: StorageService;
  let mockLogger: ILoggerService;
  let loggerInstance: any;
  let mockStorageProvider: any;

  beforeEach(() => {
    // Create mock logger instance first
    loggerInstance = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Create mock logger
    mockLogger = {
      createLogger: vi.fn().mockReturnValue(loggerInstance),
    } as unknown as ILoggerService;

    // Create mock storage provider
    mockStorageProvider = {
      initialize: vi.fn(),
      shutdown: vi.fn(),
      saveFile: vi.fn(),
      getFile: vi.fn(),
      getFileStream: vi.fn(),
      getFileMetadata: vi.fn(),
      deleteFile: vi.fn(),
      fileExists: vi.fn(),
      listFiles: vi.fn(),
      copyFile: vi.fn(),
      moveFile: vi.fn(),
      getFileUrl: vi.fn(),
      createDirectory: vi.fn(),
    } as unknown as any;

    // Create storage service - mockLogger.createLogger will be called during construction
    storageService = new StorageService(mockLogger, mockStorageProvider);
  });

  describe("initialize", () => {
    it("should initialize the storage provider", async () => {
      // The createLogger call happens in the constructor
      expect(mockLogger.createLogger).toHaveBeenCalledWith("StorageService");

      mockStorageProvider.initialize.mockResolvedValue();

      await storageService.initialize();

      expect(mockStorageProvider.initialize).toHaveBeenCalled();
      expect(loggerInstance.info).toHaveBeenCalledWith(
        "Storage service initialized",
      );
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Initialization failed");
      mockStorageProvider.initialize.mockRejectedValue(error);

      await expect(storageService.initialize()).rejects.toThrow(error);
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to initialize storage service",
        { error: "Initialization failed" },
      );
    });
  });

  describe("shutdown", () => {
    it("should shutdown the storage provider", async () => {
      mockStorageProvider.shutdown.mockResolvedValue();

      await storageService.shutdown();

      expect(mockStorageProvider.shutdown).toHaveBeenCalled();
      expect(loggerInstance.info).toHaveBeenCalledWith(
        "Storage service shutdown",
      );
    });

    it("should handle shutdown errors", async () => {
      const error = new Error("Shutdown failed");
      mockStorageProvider.shutdown.mockRejectedValue(error);

      await expect(storageService.shutdown()).rejects.toThrow(error);
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to shutdown storage service",
        { error: "Shutdown failed" },
      );
    });
  });

  describe("createDirectory", () => {
    it("should create directory successfully", async () => {
      const dirPath = "test/dir";
      mockStorageProvider.createDirectory.mockResolvedValue();

      await storageService.createDirectory(dirPath);

      expect(mockStorageProvider.createDirectory).toHaveBeenCalledWith(dirPath);
    });

    it("should handle directory creation errors", async () => {
      const dirPath = "test/dir";
      const error = new Error("Failed to create directory");
      mockStorageProvider.createDirectory.mockRejectedValue(error);

      await expect(storageService.createDirectory(dirPath)).rejects.toThrow(
        error,
      );
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to create directory: test/dir",
        { error: "Failed to create directory" },
      );
    });
  });

  describe("listFiles", () => {
    it("should list files successfully", async () => {
      const directory = "test/dir";
      const files = ["file1.txt", "file2.pdf"];
      mockStorageProvider.listFiles.mockResolvedValue(files);

      const result = await storageService.listFiles(directory);

      expect(mockStorageProvider.listFiles).toHaveBeenCalledWith(
        directory,
        undefined,
      );
      expect(result).toEqual(files);
    });

    it("should handle list files errors", async () => {
      const directory = "test/dir";
      const error = new Error("Failed to list files");
      mockStorageProvider.listFiles.mockRejectedValue(error);

      await expect(storageService.listFiles(directory)).rejects.toThrow(error);
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to list files: test/dir",
        { error: "Failed to list files" },
      );
    });
  });

  describe("saveFile", () => {
    it("should save a file using the provider", async () => {
      const filePath = "test/file.txt";
      const fileData = Buffer.from("test content");
      const options = { contentType: "text/plain" };
      const expectedResult: FileSaveResult = {
        path: filePath,
        url: "https://example.com/test/file.txt",
        metadata: {
          contentType: "text/plain",
          size: 12,
          lastModified: new Date(),
          etag: '"123456"',
        },
      };

      mockStorageProvider.saveFile.mockResolvedValue(expectedResult);

      const result = await storageService.saveFile(filePath, fileData, options);

      expect(mockStorageProvider.saveFile).toHaveBeenCalledWith(
        filePath,
        fileData,
        options,
      );
      expect(result).toBe(expectedResult);
    });

    it("should handle errors when saving a file", async () => {
      const filePath = "test/file.txt";
      const fileData = Buffer.from("test content");
      const error = new Error("Storage error");

      mockStorageProvider.saveFile.mockRejectedValue(error);

      await expect(storageService.saveFile(filePath, fileData)).rejects.toThrow(
        "Storage error",
      );

      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to save file: test/file.txt",
        { error: "Storage error" },
      );
    });
  });

  describe("getFile", () => {
    it("should get a file using the provider", async () => {
      const filePath = "test/file.txt";
      const fileContents = Buffer.from("file contents");

      mockStorageProvider.getFile.mockResolvedValue(fileContents);

      const result = await storageService.getFile(filePath);

      expect(mockStorageProvider.getFile).toHaveBeenCalledWith(filePath);
      expect(result).toBe(fileContents);
    });

    it("should handle errors when getting a file", async () => {
      const filePath = "test/file.txt";
      const error = new Error("File not found");

      mockStorageProvider.getFile.mockRejectedValue(error);

      await expect(storageService.getFile(filePath)).rejects.toThrow(
        "File not found",
      );

      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to get file: test/file.txt",
        { error: "File not found" },
      );
    });
  });

  describe("getFileStream", () => {
    it("should get a file stream using the provider", async () => {
      const filePath = "test/file.txt";
      const options = { start: 0, end: 100 };
      const mockStream = {} as ReadStream;

      mockStorageProvider.getFileStream.mockResolvedValue(mockStream);

      const result = await storageService.getFileStream(filePath, options);

      expect(mockStorageProvider.getFileStream).toHaveBeenCalledWith(
        filePath,
        options,
      );
      expect(result).toBe(mockStream);
    });

    it("should handle errors when getting a file stream", async () => {
      const filePath = "test/file.txt";
      const error = new Error("Failed to get file stream");
      mockStorageProvider.getFileStream.mockRejectedValue(error);

      await expect(storageService.getFileStream(filePath)).rejects.toThrow(
        error,
      );
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to get file stream: test/file.txt",
        { error: "Failed to get file stream" },
      );
    });
  });

  describe("getFileMetadata", () => {
    it("should get file metadata using the provider", async () => {
      const filePath = "test/file.txt";
      const metadata: FileMetadata = {
        contentType: "text/plain",
        size: 100,
        lastModified: new Date(),
        etag: '"123456"',
      };

      mockStorageProvider.getFileMetadata.mockResolvedValue(metadata);

      const result = await storageService.getFileMetadata(filePath);

      expect(mockStorageProvider.getFileMetadata).toHaveBeenCalledWith(
        filePath,
      );
      expect(result).toBe(metadata);
    });

    it("should handle errors when getting file metadata", async () => {
      const filePath = "test/file.txt";
      const error = new Error("Failed to get metadata");
      mockStorageProvider.getFileMetadata.mockRejectedValue(error);

      await expect(storageService.getFileMetadata(filePath)).rejects.toThrow(
        error,
      );
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to get file metadata: test/file.txt",
        { error: "Failed to get metadata" },
      );
    });
  });

  describe("deleteFile", () => {
    it("should delete a file using the provider", async () => {
      const filePath = "test/file.txt";

      mockStorageProvider.deleteFile.mockResolvedValue(true);

      const result = await storageService.deleteFile(filePath);

      expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith(filePath);
      expect(result).toBe(true);
    });

    it("should handle errors when deleting a file", async () => {
      const filePath = "test/file.txt";
      const error = new Error("Failed to delete file");
      mockStorageProvider.deleteFile.mockRejectedValue(error);

      await expect(storageService.deleteFile(filePath)).rejects.toThrow(error);
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to delete file: test/file.txt",
        { error: "Failed to delete file" },
      );
    });
  });

  describe("fileExists", () => {
    it("should check if a file exists using the provider", async () => {
      const filePath = "test/file.txt";

      mockStorageProvider.fileExists.mockResolvedValue(true);

      const result = await storageService.fileExists(filePath);

      expect(mockStorageProvider.fileExists).toHaveBeenCalledWith(filePath);
      expect(result).toBe(true);
    });

    it("should handle errors when checking file existence", async () => {
      const filePath = "test/file.txt";
      const error = new Error("Failed to check file existence");
      mockStorageProvider.fileExists.mockRejectedValue(error);

      await expect(storageService.fileExists(filePath)).rejects.toThrow(error);
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to check if file exists: test/file.txt",
        { error: "Failed to check file existence" },
      );
    });
  });

  describe("getFileUrl", () => {
    it("should get a file URL using the provider", async () => {
      const filePath = "test/file.txt";
      const expiresIn = 3600;
      const url = "https://example.com/test/file.txt?expires=123456789";

      mockStorageProvider.getFileUrl.mockResolvedValue(url);

      const result = await storageService.getFileUrl(filePath, expiresIn);

      expect(mockStorageProvider.getFileUrl).toHaveBeenCalledWith(
        filePath,
        expiresIn,
      );
      expect(result).toBe(url);
    });

    it("should handle errors when getting file URL", async () => {
      const filePath = "test/file.txt";
      const error = new Error("Failed to get file URL");
      mockStorageProvider.getFileUrl.mockRejectedValue(error);

      await expect(storageService.getFileUrl(filePath)).rejects.toThrow(error);
      expect(loggerInstance.error).toHaveBeenCalledWith(
        "Failed to get file URL: test/file.txt",
        { error: "Failed to get file URL" },
      );
    });
  });
});
