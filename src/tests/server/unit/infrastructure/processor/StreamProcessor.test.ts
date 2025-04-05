import fs from "fs";
import { Transform, Readable, Writable } from "stream";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { StreamProcessor } from "@infrastructure/processor";

// Mock fs module
vi.mock("fs", () => {
  return {
    default: {
      createReadStream: vi.fn(),
      createWriteStream: vi.fn(),
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      mkdir: vi.fn(),
      access: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
      unlink: vi.fn(),
      promises: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readdir: vi.fn(),
        mkdir: vi.fn(),
        access: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
      },
    },
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
      mkdir: vi.fn(),
      access: vi.fn(),
      stat: vi.fn(),
      unlink: vi.fn(),
    },
  };
});

describe("StreamProcessor", () => {
  let mockReadStream: Readable;
  let mockWriteStream: Writable;
  let mockTransform: Transform;

  beforeEach(() => {
    // Create mock streams
    mockReadStream = new Readable({
      read() {
        this.push(Buffer.from("test data"));
        this.push(null);
      },
    });

    mockWriteStream = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    mockTransform = new Transform({
      transform(chunk, _encoding, callback) {
        callback(null, chunk);
      },
    });

    // Configure fs mock functions to return our streams
    (
      fs.createReadStream as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockReadStream);
    (
      fs.createWriteStream as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockWriteStream);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe("createReadStream", () => {
    it("should create a read stream with default options", () => {
      const filePath = "/path/to/file.txt";
      const stream = StreamProcessor.createReadStream(filePath);

      expect(fs.createReadStream).toHaveBeenCalledWith(filePath, {});
      expect(stream).toBeDefined();
    });

    it("should create a read stream with custom options", () => {
      const filePath = "/path/to/file.txt";
      const options = {
        start: 0,
        end: 100,
        highWaterMark: 1024,
      };

      const stream = StreamProcessor.createReadStream(filePath, options);

      expect(fs.createReadStream).toHaveBeenCalledWith(filePath, options);
      expect(stream).toBeDefined();
    });
  });

  describe("createWriteStream", () => {
    it("should create a write stream with default options", () => {
      const filePath = "/path/to/file.txt";
      const stream = StreamProcessor.createWriteStream(filePath);

      expect(fs.createWriteStream).toHaveBeenCalledWith(filePath, {});
      expect(stream).toBeDefined();
    });

    it("should create a write stream with custom options", () => {
      const filePath = "/path/to/file.txt";
      const options = {
        highWaterMark: 1024,
      };

      const stream = StreamProcessor.createWriteStream(filePath, options);

      expect(fs.createWriteStream).toHaveBeenCalledWith(filePath, options);
      expect(stream).toBeDefined();
    });

    it("should create directory if it doesn't exist", () => {
      const filePath = "/path/to/file.txt";
      const dirPath = "/path/to";

      vi.mocked(fs.existsSync).mockReturnValue(false);

      StreamProcessor.createWriteStream(filePath);

      expect(fs.existsSync).toHaveBeenCalledWith(dirPath);
      expect(fs.mkdirSync).toHaveBeenCalledWith(dirPath, { recursive: true });
    });
  });

  describe("processStream", () => {
    beforeEach(() => {
      // Mock process.platform to be non-Windows for these tests
      const originalPlatform = process.platform;
      vi.spyOn(process, "platform", "get").mockReturnValue("linux");

      // Restore after tests
      return () => {
        vi.spyOn(process, "platform", "get").mockReturnValue(originalPlatform);
      };
    });

    it("should process stream with string paths", async () => {
      const sourcePath = "/path/to/source.txt";
      const targetPath = "/path/to/target.txt";

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        // Return true for source file, and for the target directory
        return path === sourcePath || path === "/path/to";
      });
      vi.mocked(fs.createReadStream).mockReturnValue(mockReadStream as any);
      vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);

      const result = await StreamProcessor.processStream(
        sourcePath,
        targetPath,
      );

      expect(result).toEqual({
        bytesProcessed: expect.any(Number),
        durationMs: expect.any(Number),
        bytesPerSecond: expect.any(Number),
      });
    });

    it("should process stream with stream objects", async () => {
      const result = await StreamProcessor.processStream(
        mockReadStream,
        mockWriteStream,
      );

      expect(result).toEqual({
        bytesProcessed: expect.any(Number),
        durationMs: expect.any(Number),
        bytesPerSecond: expect.any(Number),
      });
    });

    it("should process stream with transforms", async () => {
      const result = await StreamProcessor.processStream(
        mockReadStream,
        mockWriteStream,
        [mockTransform],
      );

      expect(result).toEqual({
        bytesProcessed: expect.any(Number),
        durationMs: expect.any(Number),
        bytesPerSecond: expect.any(Number),
      });
    });

    it("should handle stream errors", async () => {
      const error = new Error("Stream error");
      const errorStream = new Readable({
        read() {
          this.emit("error", error);
        },
      });

      await expect(
        StreamProcessor.processStream(errorStream, mockWriteStream),
      ).rejects.toThrow("Stream error");
    });
  });

  describe("createThrottleTransform", () => {
    it("should create a throttle transform stream", () => {
      const bytesPerSecond = 1024;
      const transform = StreamProcessor.createThrottleTransform(bytesPerSecond);

      expect(transform).toBeInstanceOf(Transform);
    });

    it("should throttle data to specified rate", async () => {
      const bytesPerSecond = 100;
      const transform = StreamProcessor.createThrottleTransform(bytesPerSecond);
      const chunks: Buffer[] = [];

      // Create a readable stream that emits chunks
      const source = new Readable({
        read() {
          this.push(Buffer.alloc(50));
          this.push(Buffer.alloc(50));
          this.push(null);
        },
      });

      // Create a writable stream that collects chunks
      const destination = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      // Process the stream
      await StreamProcessor.processStream(source, destination, [transform]);

      // Verify chunks were processed
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].length).toBe(50);
    });
  });

  describe("createProgressTransform", () => {
    it("should create a progress transform stream", () => {
      const progressCallback = vi.fn();
      const transform =
        StreamProcessor.createProgressTransform(progressCallback);

      expect(transform).toBeInstanceOf(Transform);
    });

    it("should report progress with total size", async () => {
      const progressCallback = vi.fn();
      const totalSize = 100;
      const transform = StreamProcessor.createProgressTransform(
        progressCallback,
        totalSize,
      );

      // Create a readable stream that emits chunks
      const source = new Readable({
        read() {
          this.push(Buffer.alloc(50));
          this.push(Buffer.alloc(50));
          this.push(null);
        },
      });

      // Create a writable stream
      const destination = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      // Process the stream
      await StreamProcessor.processStream(source, destination, [transform]);

      // Verify progress was reported
      expect(progressCallback).toHaveBeenCalledWith(50, 50);
      expect(progressCallback).toHaveBeenCalledWith(100, 100);
    });

    it("should report progress without total size", async () => {
      const progressCallback = vi.fn();
      const transform =
        StreamProcessor.createProgressTransform(progressCallback);

      // Create a readable stream that emits chunks
      const source = new Readable({
        read() {
          this.push(Buffer.alloc(50));
          this.push(Buffer.alloc(50));
          this.push(null);
        },
      });

      // Create a writable stream
      const destination = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      // Process the stream
      await StreamProcessor.processStream(source, destination, [transform]);

      // Verify progress was reported
      expect(progressCallback).toHaveBeenCalledWith(0, 50);
      expect(progressCallback).toHaveBeenCalledWith(0, 100);
    });
  });

  describe("createChunkingTransform", () => {
    it("should create a chunking transform stream", () => {
      const chunkSize = 1024;
      const transform = StreamProcessor.createChunkingTransform(chunkSize);

      expect(transform).toBeInstanceOf(Transform);
    });

    it("should chunk data into specified sizes", async () => {
      const chunkSize = 50;
      const transform = StreamProcessor.createChunkingTransform(chunkSize);
      const chunks: Buffer[] = [];

      // Create a readable stream that emits chunks
      const source = new Readable({
        read() {
          this.push(Buffer.alloc(120));
          this.push(null);
        },
      });

      // Create a writable stream that collects chunks
      const destination = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      // Process the stream
      await StreamProcessor.processStream(source, destination, [transform]);

      // Verify chunks were created correctly
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(chunkSize);
      expect(chunks[1].length).toBe(chunkSize);
      expect(chunks[2].length).toBe(20); // Remaining bytes
    });
  });
});
