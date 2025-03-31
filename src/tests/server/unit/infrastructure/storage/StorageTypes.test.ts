import { Stream } from "stream";

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
  });

  describe("FileOutput", () => {
    it("should accept Buffer as file output", () => {
      const output: FileOutput = Buffer.from("test data");
      expect(Buffer.isBuffer(output)).toBe(true);
    });
  });
});
