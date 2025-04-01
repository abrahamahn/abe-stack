import fs from "fs";
import path from "path";
import { promisify } from "util";

import { Container } from "inversify";
import sharp from "sharp";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { TYPES } from "@/server/infrastructure/di/types";
import { LoggerService } from "@/server/infrastructure/logging";
import {
  ImageProcessor,
  ImageOptions,
} from "@/server/infrastructure/processor/ImageProcessor";
import { MediaProcessor } from "@/server/infrastructure/processor/MediaProcessor";
import { StreamProcessor } from "@/server/infrastructure/processor/StreamProcessor";
import { FileUtils } from "@/server/infrastructure/storage/FileUtils";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

// Helper to generate unique file names
function getUniqueFilename(base: string, extension: string): string {
  return `${base}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;
}

describe("Processor Infrastructure Integration Tests", () => {
  let container: Container;
  let logger: LoggerService;
  let fileUtils: FileUtils;
  let testDir: string;

  beforeEach(async () => {
    // Setup DI container
    container = new Container();
    container.bind(TYPES.LoggerService).to(LoggerService);
    logger = container.get(TYPES.LoggerService);
    fileUtils = new FileUtils(logger);

    // Create test directory
    testDir = path.join(__dirname, "test_files");
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Use a small delay to allow file handles to be released
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      try {
        const files = fs.readdirSync(testDir);
        for (const file of files) {
          try {
            await unlink(path.join(testDir, file));
          } catch (err) {
            console.error(`Failed to delete ${file}:`, err);
          }
        }
        await rmdir(testDir);
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    }
  });

  describe("StreamProcessor", () => {
    it("should process stream with metrics", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("source", "txt"));
      const targetPath = path.join(testDir, getUniqueFilename("target", "txt"));
      const testData = "Hello, World!".repeat(1000);

      await writeFile(sourcePath, testData);

      const stats = await StreamProcessor.processStream(sourcePath, targetPath);

      expect(stats.bytesProcessed).toBe(testData.length);
      expect(stats.durationMs).toBeGreaterThan(0);
      expect(stats.bytesPerSecond).toBeGreaterThan(0);

      const processedData = await readFile(targetPath, "utf8");
      expect(processedData).toBe(testData);
    });

    it("should handle throttled streaming", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("source", "txt"));
      const targetPath = path.join(testDir, getUniqueFilename("target", "txt"));
      const testData = "Test Data".repeat(100); // Reduce data size for faster test

      await writeFile(sourcePath, testData);

      const throttleTransform = StreamProcessor.createThrottleTransform(
        10 * 1024,
      ); // 10KB/s for faster test
      const stats = await StreamProcessor.processStream(
        sourcePath,
        targetPath,
        [throttleTransform],
      );

      // Just check that the throttle function ran and completed
      expect(stats.bytesProcessed).toBe(testData.length);
      expect(stats.durationMs).toBeGreaterThan(0);
    });

    it("should track progress during streaming", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("source", "txt"));
      const targetPath = path.join(testDir, getUniqueFilename("target", "txt"));
      const testData = "Progress Test".repeat(1000);
      const fileSize = testData.length;

      await writeFile(sourcePath, testData);

      const progressUpdates: number[] = [];
      const progressTransform = StreamProcessor.createProgressTransform(
        (progress) => {
          progressUpdates.push(progress);
        },
        fileSize,
      );

      await StreamProcessor.processStream(sourcePath, targetPath, [
        progressTransform,
      ]);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(Math.max(...progressUpdates)).toBe(100);
    });
  });

  describe("ImageProcessor", () => {
    let imageProcessor: ImageProcessor;

    beforeEach(() => {
      imageProcessor = new ImageProcessor(logger, fileUtils);
    });

    it("should process and optimize an image", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("test", "jpg"));
      const targetPath = path.join(
        testDir,
        getUniqueFilename("processed", "jpg"),
      );

      // Create a test image
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .jpeg()
        .toFile(sourcePath);

      const options: ImageOptions = {
        width: 50,
        height: 50,
        quality: 80,
        format: "jpeg",
      };

      const metadata = await imageProcessor.process(
        sourcePath,
        targetPath,
        options,
      );

      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
      expect(metadata.format).toBe("jpeg");
      expect(metadata.size).toBeGreaterThan(0);
    });

    it("should generate thumbnails", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("test", "jpg"));
      const targetPath = path.join(testDir, getUniqueFilename("thumb", "webp"));

      // Create a test image
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .jpeg()
        .toFile(sourcePath);

      // Make sure we're not holding onto the file
      const thumbPath = await imageProcessor.generateThumbnail(
        sourcePath,
        targetPath,
        100,
      );

      // Use try/finally to ensure we can read the metadata even if there's an error
      try {
        const metadata = await sharp(thumbPath).metadata();
        expect(metadata.width).toBe(100);
        expect(metadata.height).toBe(100);
        expect(metadata.format).toBe("webp");
      } catch (error) {
        console.error("Error reading thumbnail metadata:", error);
        throw error;
      }
    });

    it("should extract EXIF data", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("test", "jpg"));

      // Create a test image with EXIF data
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .withMetadata({
          exif: {
            IFD0: { Copyright: "Test Copyright" },
          },
        })
        .jpeg()
        .toFile(sourcePath);

      const exifData = await imageProcessor.extractExifData(sourcePath);
      expect(exifData).toBeDefined();
    });
  });

  describe("MediaProcessor", () => {
    let mediaProcessor: MediaProcessor;

    beforeEach(() => {
      mediaProcessor = new MediaProcessor(
        logger,
        fileUtils,
        testDir,
        "http://localhost:3000/uploads",
      );
    });

    it("should process image media", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("test", "jpg"));
      const targetPath = path.join(
        testDir,
        getUniqueFilename("processed", "jpg"),
      );

      // Create a test image
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 255, b: 0, alpha: 1 },
        },
      })
        .jpeg()
        .toFile(sourcePath);

      const result = await mediaProcessor.processMedia(sourcePath, {
        width: 50,
        height: 50,
        quality: 80,
        format: "jpeg",
        targetPath: targetPath,
      });

      expect(result.contentType).toBe("image/jpeg");
      expect(result.size).toBeGreaterThan(0);
      expect(result.metadata.width).toBe(50);
      expect(result.metadata.height).toBe(50);
      expect(result.thumbnail).toBeDefined();
    });

    it("should handle base URL updates", async () => {
      const newBaseUrl = "http://localhost:4000/uploads";
      mediaProcessor.updateBaseUrl(newBaseUrl);

      // Process a file and verify the URL
      const sourcePath = path.join(testDir, getUniqueFilename("test", "txt"));
      const targetPath = path.join(
        testDir,
        getUniqueFilename("processed", "txt"),
      );

      await writeFile(sourcePath, "test");
      const result = await mediaProcessor.processMedia(sourcePath, {
        targetPath: targetPath,
      });
      expect(result.url.startsWith(newBaseUrl)).toBe(true);
    });

    // Note: Video and audio processing tests would go here, but they require
    // actual media files and ffmpeg installation. In a real environment,
    // you would want to add tests for:
    // - Video transcoding
    // - Audio processing
    // - Streaming variant generation
    // - Video thumbnail generation
    // - Audio normalization
  });
});
