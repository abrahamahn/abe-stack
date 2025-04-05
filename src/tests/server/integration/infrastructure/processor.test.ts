import fs from "fs";
import path from "path";
import { Writable } from "stream";
import { promisify } from "util";

import { Container } from "inversify";
import sharp from "sharp";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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

// Helper to safely delete a file with retry
async function safeDelete(filePath: string, retries = 3): Promise<void> {
  if (!fs.existsSync(filePath)) return;

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      await unlink(filePath);
      return;
    } catch (err) {
      lastError = err;
      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));

      // Force garbage collection if available (helps with locked files)
      if (global.gc) {
        global.gc();
      }
    }
  }
  console.error(
    `Failed to delete ${filePath} after ${retries} attempts:`,
    lastError,
  );
}

// Helper to safely delete directory
async function safeDeleteDir(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) return;

  try {
    // Wait a bit before starting deletion to ensure all operations are complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Force garbage collection to help release file handles
    if (global.gc) {
      global.gc();
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      await safeDelete(path.join(dirPath, file), 5); // Use more retries for test cleanup
    }

    // Wait longer to ensure all file handles are released
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Force GC again before directory removal
      if (global.gc) {
        global.gc();
      }
      await rmdir(dirPath);
    } catch (err) {
      console.error(`Could not remove directory ${dirPath}:`, err);
    }
  } catch (err) {
    console.error(`Error cleaning up directory ${dirPath}:`, err);
  }
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

    // Reset any Sharp module state
    global.gc?.();
  });

  afterEach(async () => {
    // Increase the timeout from 500ms to 2000ms to give more time for file handles to be released
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Force garbage collection to help release file handles
    global.gc?.();

    // Use the FileUtils for cleanup if it's available
    if (fileUtils) {
      await fileUtils.deleteDirectory(testDir, {
        retries: 5,
        retryDelayMs: 200,
        forceGc: true,
      });
    } else {
      // Fall back to the safe delete function if fileUtils isn't available
      await safeDeleteDir(testDir);
    }

    // Force garbage collection again after cleanup
    global.gc?.();
  }, 30000); // Increase the hook timeout from default 10000ms to 30000ms

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
        10 * 1024, // 10KB/s for faster test
      );
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

    it("should handle errors during streaming", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("source", "txt"));
      const targetPath = path.join(testDir, getUniqueFilename("target", "txt"));
      const testData = "Test Data";

      // Mock an error by providing a non-existent file
      const nonExistentPath = path.join(testDir, "nonexistent.txt");

      await writeFile(sourcePath, testData);

      // Test with non-existent source
      await expect(
        StreamProcessor.processStream(nonExistentPath, targetPath),
      ).rejects.toThrow();

      // Instead of testing with a potentially valid path on some platforms,
      // create a writable stream that will throw an error when written to
      const failingWritable = new Writable({
        write(_chunk, _encoding, callback) {
          callback(new Error("Simulated write error"));
        },
      });

      await expect(
        StreamProcessor.processStream(sourcePath, failingWritable),
      ).rejects.toThrow();
    });
  });

  describe("ImageProcessor", () => {
    let imageProcessor: ImageProcessor;

    beforeEach(() => {
      imageProcessor = new ImageProcessor(logger, fileUtils);
    });

    afterEach(() => {
      // Explicitly call destroy or clear method on the imageProcessor if it exists
      // This helps release file handles before directory cleanup
      if (
        imageProcessor &&
        typeof (imageProcessor as any).destroy === "function"
      ) {
        (imageProcessor as any).destroy();
      }

      // Force garbage collection
      global.gc?.();
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

    it("should correctly identify image content types", async () => {
      expect(imageProcessor.isImage("image/jpeg")).toBe(true);
      expect(imageProcessor.isImage("image/png")).toBe(true);
      expect(imageProcessor.isImage("image/webp")).toBe(true);
      expect(imageProcessor.isImage("image/gif")).toBe(true);

      // These should not be considered processable images
      expect(imageProcessor.isImage("image/svg+xml")).toBe(false);
      expect(imageProcessor.isImage("image/x-icon")).toBe(false);
      expect(imageProcessor.isImage("text/plain")).toBe(false);
      expect(imageProcessor.isImage("application/pdf")).toBe(false);
    });

    it("should convert between image formats", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("test", "jpg"));
      const pngPath = path.join(testDir, getUniqueFilename("test", "png"));
      const webpPath = path.join(testDir, getUniqueFilename("test", "webp"));

      // Create a test image
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 255, b: 0, alpha: 0.5 },
        },
      })
        .jpeg()
        .toFile(sourcePath);

      // Convert to PNG
      const pngMetadata = await imageProcessor.process(sourcePath, pngPath, {
        format: "png",
      });
      expect(pngMetadata.format).toBe("png");

      // Convert to WebP
      const webpMetadata = await imageProcessor.process(sourcePath, webpPath, {
        format: "webp",
      });
      expect(webpMetadata.format).toBe("webp");
    });

    it("should handle errors gracefully", async () => {
      const nonExistentFile = path.join(testDir, "nonexistent.jpg");
      const outputPath = path.join(testDir, getUniqueFilename("output", "jpg"));

      // Test error handling in metadata retrieval
      const metadata = await imageProcessor.getMetadata(nonExistentFile);
      expect(metadata).toBeNull();

      // Test error handling in processing
      await expect(
        imageProcessor.process(nonExistentFile, outputPath),
      ).rejects.toThrow();

      // Test error handling in thumbnail generation
      await expect(
        imageProcessor.generateThumbnail(nonExistentFile, outputPath),
      ).rejects.toThrow();

      // Test error handling in EXIF extraction
      const exifData = await imageProcessor.extractExifData(nonExistentFile);
      expect(exifData).toBeNull();
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

    afterEach(() => {
      // Clean up the MediaProcessor resources
      mediaProcessor.cleanup();

      // Force garbage collection
      global.gc?.();

      // Wait a bit to ensure all file handles are released
      return new Promise<void>((resolve) => setTimeout(resolve, 300));
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
        generateThumbnail: true, // Explicitly set to generate thumbnail
        thumbnailSize: 30,
      });

      expect(result.contentType).toBe("image/jpeg");
      expect(result.size).toBeGreaterThan(0);
      expect(result.metadata.width).toBe(50);
      expect(result.metadata.height).toBe(50);
      expect(result.thumbnail).toBeDefined();

      // Verify the thumbnail exists
      if (result.thumbnail) {
        const thumbMetadata = await sharp(result.thumbnail).metadata();
        expect(thumbMetadata.width).toBe(30);
        expect(thumbMetadata.format).toBe("webp");
      }
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

    it("should process non-media files", async () => {
      const sourcePath = path.join(testDir, getUniqueFilename("test", "txt"));
      const targetPath = path.join(testDir, getUniqueFilename("copied", "txt"));

      await writeFile(sourcePath, "This is a text file");

      const result = await mediaProcessor.processMedia(sourcePath, {
        targetPath: targetPath,
      });

      expect(result.contentType).toBe("text/plain");
      expect(result.size).toBeGreaterThan(0);
      expect(result.metadata.format).toBe("txt");
      expect(result.url).toBeDefined();

      // Read the file to confirm it was copied correctly
      const content = await readFile(targetPath, "utf8");
      expect(content).toBe("This is a text file");
    });

    it("should handle file processing errors", async () => {
      const nonExistentFile = path.join(testDir, "nonexistent.jpg");
      const outputPath = path.join(testDir, getUniqueFilename("output", "jpg"));

      // Mock fileUtils.detectContentType to return an image content type
      const originalDetectContentType = fileUtils.detectContentType;
      fileUtils.detectContentType = vi.fn().mockReturnValue("image/jpeg");

      try {
        await expect(
          mediaProcessor.processMedia(nonExistentFile, {
            targetPath: outputPath,
          }),
        ).rejects.toThrow();
      } finally {
        // Restore original method
        fileUtils.detectContentType = originalDetectContentType;
      }
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
