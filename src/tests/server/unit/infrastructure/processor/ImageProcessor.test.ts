import path from "path";

import sharp from "sharp";

import type { ILoggerService } from "@/server/infrastructure/logging";
import {
  ImageProcessor,
  ImageOptions,
} from "@/server/infrastructure/processor/ImageProcessor";
import { ImageFormat } from "@/server/infrastructure/storage/ContentTypes";
import { FileUtils } from "@/server/infrastructure/storage/FileUtils";

// Mock dependencies
jest.mock("sharp");
jest.mock("@infrastructure/storage/FileUtils");

describe("ImageProcessor", () => {
  let imageProcessor: ImageProcessor;
  let mockLogger: ILoggerService;
  let mockFileUtils: jest.Mocked<FileUtils>;

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

    // Create mock FileUtils
    mockFileUtils = new FileUtils(mockLogger) as jest.Mocked<FileUtils>;

    // Create ImageProcessor instance
    imageProcessor = new ImageProcessor(mockLogger, mockFileUtils);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks for sharp
    const mockSharpInstance = {
      metadata: jest.fn().mockResolvedValue({
        width: 1920,
        height: 1080,
        format: "jpeg",
        hasAlpha: false,
        space: "srgb",
        orientation: 1,
      }),
      rotate: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      modulate: jest.fn().mockReturnThis(),
      sharpen: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      avif: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined),
    } as unknown as sharp.Sharp;

    (sharp as unknown as jest.MockedFunction<typeof sharp>).mockReturnValue(
      mockSharpInstance,
    );
  });

  describe("isImage", () => {
    it("should return true for valid image content types", () => {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

      for (const type of validTypes) {
        expect(imageProcessor.isImage(type)).toBe(true);
      }
    });

    it("should return false for non-image content types", () => {
      const invalidTypes = [
        "application/pdf",
        "text/plain",
        "video/mp4",
        "image/svg+xml", // SVG is excluded
        "image/x-icon", // Icon is excluded
      ];

      for (const type of invalidTypes) {
        expect(imageProcessor.isImage(type)).toBe(false);
      }
    });
  });

  describe("getMetadata", () => {
    it("should return image metadata", async () => {
      const filePath = "/path/to/image.jpg";
      const fileStats = {
        size: 12345,
        mtime: new Date(),
      };

      mockFileUtils.getFileStats.mockResolvedValue(fileStats as any);

      const result = await imageProcessor.getMetadata(filePath);

      expect(sharp).toHaveBeenCalledWith(filePath);
      expect(mockFileUtils.getFileStats).toHaveBeenCalledWith(filePath);

      expect(result).toEqual({
        width: 1920,
        height: 1080,
        format: "jpeg",
        size: 12345,
        space: "srgb",
        hasAlpha: false,
        orientation: 1,
      });
    });

    it("should return null if there is an error", async () => {
      const filePath = "/path/to/image.jpg";
      const error = new Error("Failed to process image");

      mockFileUtils.getFileStats.mockRejectedValue(error);

      const result = await imageProcessor.getMetadata(filePath);

      expect(result).toBeNull();

      const logger = mockLogger.createLogger("ImageProcessor");
      expect(logger.error).toHaveBeenCalledWith(
        `Error getting image metadata: ${filePath}`,
        { error: "Failed to process image" },
      );
    });
  });

  describe("process", () => {
    it("should process an image with default options", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/target.jpg";
      const targetDir = "/path/to";

      // Set up mocks
      jest.spyOn(path, "dirname").mockReturnValue(targetDir);

      const sharpInstance = sharp(sourcePath);

      // Process image
      await imageProcessor.process(sourcePath, targetPath);

      // Check directory was created
      expect(mockFileUtils.ensureDirectory).toHaveBeenCalledWith(targetDir);

      // Check original metadata was fetched
      expect(sharpInstance.metadata).toHaveBeenCalled();

      // Check processing steps
      expect(sharpInstance.rotate).toHaveBeenCalled();
      expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 80 });
      expect(sharpInstance.toFile).toHaveBeenCalledWith(targetPath);
    });

    it("should apply resize options when provided", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/target.jpg";
      const options: ImageOptions = {
        width: 800,
        height: 600,
        fit: "cover",
        withoutEnlargement: true,
      };

      const sharpInstance = sharp(sourcePath);

      // Process image
      await imageProcessor.process(sourcePath, targetPath, options);

      // Check resize was called with options
      expect(sharpInstance.resize).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        fit: "cover",
        withoutEnlargement: true,
      });
    });

    it("should apply enhancement and sharpening when requested", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/target.jpg";
      const options: ImageOptions = {
        enhance: true,
        sharpen: true,
      };

      const sharpInstance = sharp(sourcePath);

      // Process image
      await imageProcessor.process(sourcePath, targetPath, options);

      // Check enhancement was applied
      expect(sharpInstance.modulate).toHaveBeenCalledWith({
        brightness: 1.05,
        saturation: 1.1,
      });

      // Check sharpening was applied
      expect(sharpInstance.sharpen).toHaveBeenCalled();
    });

    it("should use the correct format based on options", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/target.webp";
      const options: ImageOptions = {
        format: ImageFormat.WEBP,
        quality: 90,
      };

      const sharpInstance = sharp(sourcePath);

      // Process image
      await imageProcessor.process(sourcePath, targetPath, options);

      // Check webp format was used
      expect(sharpInstance.webp).toHaveBeenCalledWith({ quality: 90 });
    });
  });

  describe("generateThumbnail", () => {
    it("should generate a thumbnail with default size", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/thumbnail.jpg";
      const targetDir = "/path/to";

      // Set up mocks
      jest.spyOn(path, "dirname").mockReturnValue(targetDir);

      const sharpInstance = sharp(sourcePath);

      // Generate thumbnail
      const result = await imageProcessor.generateThumbnail(
        sourcePath,
        targetPath,
      );

      // Check directory was created
      expect(mockFileUtils.ensureDirectory).toHaveBeenCalledWith(targetDir);

      // Check resize was called with default size
      expect(sharpInstance.resize).toHaveBeenCalledWith(200, 200, {
        fit: "inside",
        withoutEnlargement: true,
      });

      // Check result
      expect(result).toBe(targetPath);
    });

    it("should generate a thumbnail with custom size", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/thumbnail.jpg";
      const size = 100;

      const sharpInstance = sharp(sourcePath);

      // Generate thumbnail
      await imageProcessor.generateThumbnail(sourcePath, targetPath, size);

      // Check resize was called with custom size
      expect(sharpInstance.resize).toHaveBeenCalledWith(100, 100, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });
  });
});
