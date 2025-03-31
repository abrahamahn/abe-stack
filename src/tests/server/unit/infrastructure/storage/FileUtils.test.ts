import fs from "fs";
import path from "path";

import { FileUtils } from "@infrastructure/storage";

import type { ILoggerService } from "@infrastructure/logging";

// Mock modules before they are used
jest.mock("fs", () => {
  const originalModule = jest.requireActual("fs");
  return {
    ...originalModule,
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      stat: jest.fn(),
      mkdir: jest.fn(),
      unlink: jest.fn(),
      access: jest.fn(),
      copyFile: jest.fn(),
      rename: jest.fn(),
      readdir: jest.fn(),
    },
    constants: {
      F_OK: 0,
    },
    createReadStream: jest.fn(),
    createWriteStream: jest.fn(),
    existsSync: jest.fn(),
    statSync: jest.fn(),
  };
});

// Need to mock these after fs is mocked
jest.mock("util", () => {
  const originalModule = jest.requireActual("util");
  return {
    ...originalModule,
    promisify: (fn: (...args: any[]) => any) => {
      // Return the mocked fs.promises functions instead of trying to promisify
      if (fn === fs.mkdir) return fs.promises.mkdir;
      if (fn === fs.access) return fs.promises.access;
      if (fn === fs.stat) return fs.promises.stat;
      if (fn === fs.readFile) return fs.promises.readFile;
      if (fn === fs.writeFile) return fs.promises.writeFile;
      if (fn === fs.readdir) return fs.promises.readdir;
      if (fn === fs.unlink) return fs.promises.unlink;
      return originalModule.promisify(fn);
    },
  };
});

// We don't need to mock mime-types since the actual implementation doesn't use it
jest.unmock("mime-types");

// Now we can define the tests
describe("FileUtils", () => {
  let fileUtils: FileUtils;
  let mockLogger: ILoggerService;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      createLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
    } as unknown as ILoggerService;

    fileUtils = new FileUtils(mockLogger);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("readFile", () => {
    it("should read a file and return its contents", async () => {
      const filePath = "/path/to/file.txt";
      const fileContents = Buffer.from("file contents");

      // Mock the fs.promises.readFile implementation
      (fs.promises.readFile as jest.Mock).mockResolvedValue(fileContents);

      const result = await fileUtils.readFile(filePath);

      expect(fs.promises.readFile).toHaveBeenCalledWith(filePath);
      expect(result).toBe(fileContents);
    });

    it("should handle errors when reading a file", async () => {
      const filePath = "/path/to/file.txt";
      const error = new Error("File not found");

      // Mock the fs.promises.readFile implementation to throw
      (fs.promises.readFile as jest.Mock).mockRejectedValue(error);

      await expect(fileUtils.readFile(filePath)).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("writeFile", () => {
    it("should write data to a file", async () => {
      const filePath = "/path/to/file.txt";
      const data = Buffer.from("file contents");

      // Mock fs.promises functions
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await fileUtils.writeFile(filePath, data);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(filePath), {
        recursive: true,
      });
      expect(fs.promises.writeFile).toHaveBeenCalledWith(filePath, data);
    });
  });

  describe("getFileStats", () => {
    it("should get file stats", async () => {
      const filePath = "/path/to/file.txt";
      const stats = {
        size: 1024,
        mtime: new Date(),
        isFile: jest.fn().mockReturnValue(true),
        isDirectory: jest.fn().mockReturnValue(false),
      };

      // Mock the fs.promises.stat implementation
      (fs.promises.stat as jest.Mock).mockResolvedValue(stats);

      const result = await fileUtils.getFileStats(filePath);

      expect(fs.promises.stat).toHaveBeenCalledWith(filePath);
      expect(result).toBe(stats);
    });
  });

  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      const filePath = "/path/to/file.txt";

      // Mock the fs.promises.access implementation
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      const result = await fileUtils.fileExists(filePath);

      expect(fs.promises.access).toHaveBeenCalledWith(
        filePath,
        fs.constants.F_OK,
      );
      expect(result).toBe(true);
    });

    it("should return false if file does not exist", async () => {
      const filePath = "/path/to/nonexistent.txt";

      // Mock the fs.promises.access implementation to throw
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      const result = await fileUtils.fileExists(filePath);

      expect(fs.promises.access).toHaveBeenCalledWith(
        filePath,
        fs.constants.F_OK,
      );
      expect(result).toBe(false);
    });
  });

  describe("ensureDirectory", () => {
    it("should create directory if needed", async () => {
      const dirPath = "/path/to/directory";

      // Mock mkdir
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);

      await fileUtils.ensureDirectory(dirPath);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(dirPath, {
        recursive: true,
      });
    });
  });

  describe("deleteFile", () => {
    it("should delete a file if it exists", async () => {
      const filePath = "/path/to/file.txt";

      // Mock the file exists check
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      // Mock the unlink function
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await fileUtils.deleteFile(filePath);

      expect(fs.promises.unlink).toHaveBeenCalledWith(filePath);
      expect(result).toBe(true);
    });

    it("should return true if file does not exist", async () => {
      const filePath = "/path/to/nonexistent.txt";

      // Mock the file exists check
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      const result = await fileUtils.deleteFile(filePath);

      expect(fs.promises.unlink).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("detectContentType", () => {
    it("should detect content type for known extensions", () => {
      const tests = [
        { path: "/path/to/image.jpg", expected: "image/jpeg" },
        { path: "/path/to/document.pdf", expected: "application/pdf" },
        { path: "/path/to/music.mp3", expected: "audio/mpeg" },
      ];

      for (const test of tests) {
        const result = fileUtils.detectContentType(test.path);
        expect(result).toBe(test.expected);
      }
    });

    it("should return application/octet-stream for unknown extensions", () => {
      const filePath = "/path/to/unknown.xyz";

      const result = fileUtils.detectContentType(filePath);

      expect(result).toBe("application/octet-stream");
    });
  });
});
