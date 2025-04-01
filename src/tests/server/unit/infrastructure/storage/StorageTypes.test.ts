import { ReadStream } from "fs";
import { Stream, Readable } from "stream";

import { describe, it, expect } from "vitest";

import {
  FileMetadata,
  StorageSaveOptions,
  StreamOptions,
  FileSaveResult,
  FileData,
  FileOutput,
} from "@infrastructure/storage";

describe("StorageTypes", () => {
  describe("FileMetadata", () => {
    it("should create file metadata with required fields", () => {
      const metadata: FileMetadata = {
        contentType: "image/jpeg",
        size: 1024,
        lastModified: new Date(),
      };

      expect(metadata.contentType).toBe("image/jpeg");
      expect(metadata.size).toBe(1024);
      expect(metadata.lastModified).toBeInstanceOf(Date);
    });

    it("should create file metadata with optional fields", () => {
      const metadata: FileMetadata = {
        contentType: "image/jpeg",
        size: 1024,
        lastModified: new Date(),
        etag: "abc123",
        dimensions: { width: 800, height: 600 },
        duration: 120,
        custom: { key: "value" },
      };

      expect(metadata.etag).toBe("abc123");
      expect(metadata.dimensions).toEqual({ width: 800, height: 600 });
      expect(metadata.duration).toBe(120);
      expect(metadata.custom).toEqual({ key: "value" });
    });

    it("should handle different content types", () => {
      const metadata: FileMetadata = {
        contentType: "video/mp4",
        size: 1024,
        lastModified: new Date(),
      };

      expect(metadata.contentType).toBe("video/mp4");
    });

    it("should handle zero file size", () => {
      const metadata: FileMetadata = {
        contentType: "text/plain",
        size: 0,
        lastModified: new Date(),
      };

      expect(metadata.size).toBe(0);
    });
  });

  describe("StorageSaveOptions", () => {
    it("should create storage save options with optional fields", () => {
      const options: StorageSaveOptions = {
        contentType: "image/jpeg",
        overwrite: true,
        metadata: { key: "value" },
        stream: {
          start: 0,
          end: 100,
          bufferSize: 1024,
          highWaterMark: 2048,
        },
      };

      expect(options.contentType).toBe("image/jpeg");
      expect(options.overwrite).toBe(true);
      expect(options.metadata).toEqual({ key: "value" });
      expect(options.stream).toBeDefined();
    });

    it("should handle media processing options", () => {
      const options: StorageSaveOptions = {
        contentType: "image/jpeg",
        width: 800,
        height: 600,
        quality: 85,
        format: "webp",
      };

      expect(options.width).toBe(800);
      expect(options.height).toBe(600);
      expect(options.quality).toBe(85);
      expect(options.format).toBe("webp");
    });

    it("should handle video processing options", () => {
      const options: StorageSaveOptions = {
        contentType: "video/mp4",
        width: 1920,
        height: 1080,
        quality: 90,
        format: "mp4",
      };

      expect(options.width).toBe(1920);
      expect(options.height).toBe(1080);
      expect(options.quality).toBe(90);
      expect(options.format).toBe("mp4");
    });

    it("should handle audio processing options", () => {
      const options: StorageSaveOptions = {
        contentType: "audio/mp3",
        quality: 320,
        format: "mp3",
      };

      expect(options.quality).toBe(320);
      expect(options.format).toBe("mp3");
    });
  });

  describe("StreamOptions", () => {
    it("should create stream options with optional fields", () => {
      const options: StreamOptions = {
        start: 0,
        end: 100,
        bufferSize: 1024,
        highWaterMark: 2048,
      };

      expect(options.start).toBe(0);
      expect(options.end).toBe(100);
      expect(options.bufferSize).toBe(1024);
      expect(options.highWaterMark).toBe(2048);
    });

    it("should handle partial stream options", () => {
      const options: StreamOptions = {
        start: 100,
        end: 200,
      };

      expect(options.start).toBe(100);
      expect(options.end).toBe(200);
      expect(options.bufferSize).toBeUndefined();
      expect(options.highWaterMark).toBeUndefined();
    });

    it("should handle zero values", () => {
      const options: StreamOptions = {
        start: 0,
        end: 0,
        bufferSize: 0,
        highWaterMark: 0,
      };

      expect(options.start).toBe(0);
      expect(options.end).toBe(0);
      expect(options.bufferSize).toBe(0);
      expect(options.highWaterMark).toBe(0);
    });
  });

  describe("FileSaveResult", () => {
    it("should create file save result with required fields", () => {
      const result: FileSaveResult = {
        path: "/test/file.jpg",
        url: "http://localhost:3000/storage/test/file.jpg",
        metadata: {
          contentType: "image/jpeg",
          size: 1024,
          lastModified: new Date(),
        },
      };

      expect(result.path).toBe("/test/file.jpg");
      expect(result.url).toBe("http://localhost:3000/storage/test/file.jpg");
      expect(result.metadata).toBeDefined();
    });

    it("should create file save result with processing information", () => {
      const result: FileSaveResult = {
        path: "/test/file.jpg",
        url: "http://localhost:3000/storage/test/file.jpg",
        metadata: {
          contentType: "image/jpeg",
          size: 1024,
          lastModified: new Date(),
        },
        processing: {
          originalSize: 2048,
          processedSize: 1024,
          transformations: ["resize", "compress"],
          thumbnail: "http://localhost:3000/storage/test/file-thumb.jpg",
        },
      };

      expect(result.processing).toBeDefined();
      expect(result.processing?.originalSize).toBe(2048);
      expect(result.processing?.processedSize).toBe(1024);
      expect(result.processing?.transformations).toEqual([
        "resize",
        "compress",
      ]);
      expect(result.processing?.thumbnail).toBe(
        "http://localhost:3000/storage/test/file-thumb.jpg",
      );
    });

    it("should handle partial processing information", () => {
      const result: FileSaveResult = {
        path: "/test/file.jpg",
        url: "http://localhost:3000/storage/test/file.jpg",
        metadata: {
          contentType: "image/jpeg",
          size: 1024,
          lastModified: new Date(),
        },
        processing: {
          originalSize: 2048,
          processedSize: 1024,
        },
      };

      expect(result.processing?.originalSize).toBe(2048);
      expect(result.processing?.processedSize).toBe(1024);
      expect(result.processing?.transformations).toBeUndefined();
      expect(result.processing?.thumbnail).toBeUndefined();
    });
  });

  describe("FileData", () => {
    it("should accept Buffer as file data", () => {
      const data: FileData = Buffer.from("test data");
      expect(Buffer.isBuffer(data)).toBe(true);
    });

    it("should accept Stream as file data", () => {
      const data: FileData = new Stream();
      expect(data).toBeInstanceOf(Stream);
    });

    it("should accept ReadStream as file data", () => {
      const data: FileData = new Readable() as ReadStream;
      expect(data).toBeInstanceOf(Readable);
    });

    it("should handle empty Buffer", () => {
      const data: FileData = Buffer.from("");
      expect(Buffer.isBuffer(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  describe("FileOutput", () => {
    it("should accept Buffer as file output", () => {
      const output: FileOutput = Buffer.from("test data");
      expect(Buffer.isBuffer(output)).toBe(true);
    });

    it("should accept ReadStream as file output", () => {
      const output: FileOutput = new Readable() as ReadStream;
      expect(output).toBeInstanceOf(Readable);
    });

    it("should handle empty Buffer", () => {
      const output: FileOutput = Buffer.from("");
      expect(Buffer.isBuffer(output)).toBe(true);
      expect(output.length).toBe(0);
    });
  });
});
