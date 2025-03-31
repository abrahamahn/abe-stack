import { ReadStream } from "fs";

import {
  StorageService,
  IStorageProvider,
  FileMetadata,
  FileSaveResult,
} from "@infrastructure/storage";

import type { ILoggerService } from "@infrastructure/logging";

describe("StorageService", () => {
  let storageService: StorageService;
  let mockLogger: ILoggerService;
  let loggerInstance: any;
  let mockStorageProvider: jest.Mocked<IStorageProvider>;

  beforeEach(() => {
    // Create mock logger instance first
    loggerInstance = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create mock logger
    mockLogger = {
      createLogger: jest.fn().mockReturnValue(loggerInstance),
    } as unknown as ILoggerService;

    // Create mock storage provider
    mockStorageProvider = {
      initialize: jest.fn(),
      shutdown: jest.fn(),
      saveFile: jest.fn(),
      getFile: jest.fn(),
      getFileStream: jest.fn(),
      getFileMetadata: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      listFiles: jest.fn(),
      copyFile: jest.fn(),
      moveFile: jest.fn(),
      getFileUrl: jest.fn(),
    } as unknown as jest.Mocked<IStorageProvider>;

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
  });

  describe("deleteFile", () => {
    it("should delete a file using the provider", async () => {
      const filePath = "test/file.txt";

      mockStorageProvider.deleteFile.mockResolvedValue(true);

      const result = await storageService.deleteFile(filePath);

      expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith(filePath);
      expect(result).toBe(true);
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
  });
});
