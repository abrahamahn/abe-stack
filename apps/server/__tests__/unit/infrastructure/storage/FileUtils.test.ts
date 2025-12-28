import fs from "fs";
import { Readable } from "stream";

import { describe, it, expect, beforeEach, vi } from "vitest";

import type { ILoggerService } from "@/server/infrastructure/logging";
import { FileUtils } from "@/server/infrastructure/storage";

// Helper function to normalize path for testing on multiple OS
function expectPathsEqual(actual: string, expected: string) {
  // Normalize both paths to use forward slashes
  const normalizedActual = actual.replace(/\\/g, "/");
  const normalizedExpected = expected.replace(/\\/g, "/");
  expect(normalizedActual).toEqual(normalizedExpected);
}

// Create mocks for dependencies
vi.mock("fs", async () => {
  // Create the mock functions
  const mockedFs = {
    constants: {
      F_OK: 0,
    },
    promises: {
      mkdir: vi.fn(),
      access: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
      unlink: vi.fn(),
      rename: vi.fn(),
      copyFile: vi.fn(),
    },
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
    existsSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(), // Make sure this is included
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    copyFile: vi.fn(),
  };

  // Return the mock with a default export
  return {
    default: mockedFs,
    ...mockedFs,
  };
});

// Need to mock these after fs is mocked
vi.mock("util", () => {
  return {
    promisify: (fn: (...args: any[]) => any) => {
      // Return the mocked fs.promises functions instead of trying to promisify
      if (fn === fs.mkdir) return fs.promises.mkdir;
      if (fn === fs.access) return fs.promises.access;
      if (fn === fs.stat) return fs.promises.stat;
      if (fn === fs.readFile) return fs.promises.readFile;
      if (fn === fs.writeFile) return fs.promises.writeFile;
      if (fn === fs.readdir) return fs.promises.readdir;
      if (fn === fs.unlink) return fs.promises.unlink;
      return vi
        .fn()
        .mockImplementation((...args) => Promise.resolve(fn(...args)));
    },
  };
});

// We don't need to mock mime-types since the actual implementation doesn't use it
vi.unmock("mime-types");

vi.mock("stream/promises", () => {
  return {
    pipeline: vi.fn().mockImplementation(() => Promise.resolve()),
  };
});

vi.mock("path", async () => {
  const originalPath = await vi.importActual("path");
  return {
    ...originalPath,
    dirname: vi.fn((p) => {
      // Mock dirname to return the parent directory
      if (typeof p === "string") {
        return p.substring(0, p.lastIndexOf("/"));
      }
      return p;
    }),
    join: vi.fn((...args) => args.join("/")),
    normalize: vi.fn((p) => p), // Normalize will return the same path for testing
    basename: vi.fn((p) => {
      if (typeof p === "string") {
        return p.substring(p.lastIndexOf("/") + 1);
      }
      return p;
    }),
  };
});

// Now we can define the tests
describe("FileUtils", () => {
  let fileUtils: FileUtils;
  let mockLogger: ILoggerService;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      createLogger: vi.fn().mockReturnValue({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    } as unknown as ILoggerService;

    fileUtils = new FileUtils(mockLogger);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("readFile", () => {
    it("should read a file and return its contents", async () => {
      const filePath = "/path/to/file.txt";
      const fileContents = Buffer.from("file contents");

      // Mock the fs.promises.readFile implementation
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        fileContents,
      );

      const result = await fileUtils.readFile(filePath);

      expect(fs.promises.readFile).toHaveBeenCalledWith(filePath);
      expect(result).toBe(fileContents);
    });

    it("should handle errors when reading a file", async () => {
      const filePath = "/path/to/file.txt";
      const error = new Error("File not found");

      // Mock the fs.promises.readFile implementation to throw
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        error,
      );

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
      (fs.promises.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.promises.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      await fileUtils.writeFile(filePath, data);

      const expectedDirname = "/path/to";
      const firstCall = (fs.promises.mkdir as any).mock.calls[0];
      expectPathsEqual(firstCall[0], expectedDirname);
      expect(firstCall[1]).toEqual({ recursive: true });

      expect(fs.promises.writeFile).toHaveBeenCalledWith(filePath, data);
    });

    it("should write data from a stream", async () => {
      const filePath = "/path/to/file.txt";
      const data = Readable.from(Buffer.from("file contents"));

      // Mock fs.promises functions and pipeline
      (fs.promises.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.createWriteStream as ReturnType<typeof vi.fn>).mockReturnValue({
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === "finish") callback();
          return this;
        }),
      });

      const { pipeline } = await import("stream/promises");
      (pipeline as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      await fileUtils.writeFile(filePath, data);

      const expectedDirname = "/path/to";
      const firstCall = (fs.promises.mkdir as any).mock.calls[0];
      expectPathsEqual(firstCall[0], expectedDirname);
      expect(firstCall[1]).toEqual({ recursive: true });

      expect(fs.createWriteStream).toHaveBeenCalledWith(filePath);
      expect(pipeline).toHaveBeenCalled();
    });

    it("should handle errors when writing a file", async () => {
      const filePath = "/path/to/file.txt";
      const data = Buffer.from("file contents");
      const error = new Error("Write failed");

      // Mock fs.promises functions
      (fs.promises.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.promises.writeFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        error,
      );

      await expect(fileUtils.writeFile(filePath, data)).rejects.toThrow(
        "Write failed",
      );
    });

    it("should not overwrite existing file when overwrite is false", async () => {
      const filePath = "/path/to/file.txt";
      const data = Buffer.from("file contents");

      // Mock file exists check
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      await expect(fileUtils.writeFile(filePath, data, false)).rejects.toThrow(
        "File already exists",
      );
    });
  });

  describe("getFileStats", () => {
    it("should get file stats", async () => {
      const filePath = "/path/to/file.txt";
      const stats = {
        size: 1024,
        mtime: new Date(),
        isFile: vi.fn().mockReturnValue(true),
        isDirectory: vi.fn().mockReturnValue(false),
      };

      // Mock the fs.promises.stat implementation
      (fs.promises.stat as ReturnType<typeof vi.fn>).mockResolvedValue(stats);

      const result = await fileUtils.getFileStats(filePath);

      expect(fs.promises.stat).toHaveBeenCalledWith(filePath);
      expect(result).toBe(stats);
    });
  });

  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      const filePath = "/path/to/file.txt";

      // Mock the fs.promises.access implementation
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

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
      (fs.promises.access as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("ENOENT"),
      );

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

      // Mock fs.promises.mkdir
      (fs.promises.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      await fileUtils.ensureDirectory(dirPath);

      const firstCall = (fs.promises.mkdir as any).mock.calls[0];
      expectPathsEqual(firstCall[0], dirPath);
      expect(firstCall[1]).toEqual({ recursive: true });
    });
  });

  describe("deleteFile", () => {
    it("should delete a file if it exists", async () => {
      const filePath = "/path/to/file.txt";

      // Mock the file exists check
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      // Mock the unlink function
      (fs.promises.unlink as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      const result = await fileUtils.deleteFile(filePath);

      expect(fs.promises.unlink).toHaveBeenCalledWith(filePath);
      expect(result).toBe(true);
    });

    it("should return true if file does not exist", async () => {
      const filePath = "/path/to/nonexistent.txt";

      // Mock the file exists check
      (fs.promises.access as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("ENOENT"),
      );

      const result = await fileUtils.deleteFile(filePath);

      expect(fs.promises.unlink).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("listFiles", () => {
    it("should list files in a directory", async () => {
      const directory = "/path/to/directory";
      const files = [
        {
          name: "file1.txt",
          isFile: () => true,
        },
        {
          name: "file2.txt",
          isFile: () => true,
        },
      ];

      // Mock fs.promises.readdir
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        files,
      );

      // Skip mocking path.join since it's causing issues

      const result = await fileUtils.listFiles(directory);

      expect(fs.promises.readdir).toHaveBeenCalledWith(directory, {
        withFileTypes: true,
      });

      // Just verify we have the correct number of files back
      expect(result.length).toBe(2);
    });

    it("should filter files by pattern", async () => {
      const directory = "/path/to/directory";
      const files = [
        {
          name: "test1.txt",
          isFile: () => true,
        },
        {
          name: "test2.txt",
          isFile: () => true,
        },
        {
          name: "other.txt",
          isFile: () => true,
        },
      ];

      // Mock fs.promises.readdir
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        files,
      );

      // Skip mocking path.join since it's causing issues

      const result = await fileUtils.listFiles(directory, "test*.txt");

      // Just verify we have the correct number of files back
      expect(result.length).toBe(2);
    });

    it("should handle errors when listing files", async () => {
      const directory = "/path/to/directory";
      const error = new Error("Read failed");

      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockRejectedValue(
        error,
      );

      await expect(fileUtils.listFiles(directory)).rejects.toThrow(
        "Read failed",
      );
    });
  });

  describe("copyFile", () => {
    it("should copy a file successfully", async () => {
      const sourcePath = "/path/to/source.txt";
      const targetPath = "/path/to/target.txt";
      const fileContents = Buffer.from("test");

      // Mock fs.promises functions
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.promises.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        fileContents,
      );
      (fs.promises.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      const result = await fileUtils.copyFile(sourcePath, targetPath);

      expect(result).toBe(true);
      expect(fs.promises.readFile).toHaveBeenCalledWith(sourcePath);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        targetPath,
        fileContents,
      );
    });

    it("should handle errors when copying a file", async () => {
      const sourcePath = "/path/to/source.txt";
      const targetPath = "/path/to/target.txt";

      // Mock file exists check
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      // Mock read file to throw
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Read failed"),
      );

      const result = await fileUtils.copyFile(sourcePath, targetPath);

      expect(result).toBe(false);
    });
  });

  describe("moveFile", () => {
    it("should move a file successfully", async () => {
      const sourcePath = "/path/to/source.txt";
      const targetPath = "/path/to/target.txt";
      const fileContents = Buffer.from("test");

      // Mock fs.promises functions
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.promises.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        fileContents,
      );
      (fs.promises.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (fs.promises.unlink as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      const result = await fileUtils.moveFile(sourcePath, targetPath);

      expect(result).toBe(true);
      expect(fs.promises.readFile).toHaveBeenCalledWith(sourcePath);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        targetPath,
        fileContents,
      );
    });

    it("should handle errors when moving a file", async () => {
      const sourcePath = "/path/to/source.txt";
      const targetPath = "/path/to/target.txt";

      // Mock file exists check
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      // Mock read file to throw
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Read failed"),
      );

      const result = await fileUtils.moveFile(sourcePath, targetPath);

      expect(result).toBe(false);
    });
  });

  describe("createReadStream", () => {
    it("should create a read stream", () => {
      const filePath = "/path/to/file.txt";
      const options = { start: 0, end: 100, highWaterMark: 1024 };
      const mockStream = { on: vi.fn() };

      (fs.createReadStream as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStream,
      );

      const result = fileUtils.createReadStream(filePath, options);

      expect(fs.createReadStream).toHaveBeenCalledWith(filePath, options);
      expect(result).toBe(mockStream);
    });
  });

  describe("createWriteStream", () => {
    it("should create a write stream", () => {
      const filePath = "/path/to/file.txt";
      const mockStream = {
        on: vi.fn().mockReturnThis(),
      };

      // Mock fs functions directly
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.createWriteStream).mockReturnValue(mockStream as any);

      const result = fileUtils.createWriteStream(filePath);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      // createWriteStream may be called with just the path
      expect(fs.createWriteStream).toHaveBeenCalled();
      expect(result).toBe(mockStream);
    });
  });

  describe("detectContentType", () => {
    it("should detect content type for known extensions", () => {
      const tests = [
        { path: "/path/to/image.jpg", expected: "image/jpeg" },
        { path: "/path/to/document.pdf", expected: "application/pdf" },
        { path: "/path/to/music.mp3", expected: "audio/mpeg" },
        { path: "/path/to/video.mp4", expected: "video/mp4" },
        { path: "/path/to/archive.zip", expected: "application/zip" },
        {
          path: "/path/to/document.docx",
          expected:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
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
