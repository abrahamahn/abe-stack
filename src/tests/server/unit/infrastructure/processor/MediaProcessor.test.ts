import path from "path";

import ffmpeg from "fluent-ffmpeg";

import {
  ImageProcessor,
  MediaProcessor,
  MediaOptions,
} from "@infrastructure/processor";

import type { ILoggerService } from "@/server/infrastructure/logging";
import { FileUtils } from "@/server/infrastructure/storage/FileUtils";

// Mock dependencies
jest.mock("@infrastructure/processor/ImageProcessor");
jest.mock("@infrastructure/processor/MediaProcessor");
jest.mock("@infrastructure/storage/FileUtils");
jest.mock("fluent-ffmpeg", () => {
  const mockFfmpegInstance = {
    input: jest.fn().mockReturnThis(),
    outputOptions: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation((event, callback) => {
      // Store callbacks to trigger them appropriately
      if (event === "end") {
        setTimeout(() => callback(), 0);
      }
      return mockFfmpegInstance;
    }),
    run: jest.fn().mockReturnThis(),
    screenshots: jest.fn().mockImplementation((_options) => {
      // Simulate successful completion
      setTimeout(() => {
        const endCallback = mockFfmpegInstance.on.mock.calls.find(
          (call) => call[0] === "end",
        )?.[1];
        if (endCallback) endCallback();
      }, 0);
      return mockFfmpegInstance;
    }),
    videoBitrate: jest.fn().mockReturnThis(),
    audioBitrate: jest.fn().mockReturnThis(),
    audioFilters: jest.fn().mockReturnThis(),
  };

  const mockFfmpeg = jest.fn(() => mockFfmpegInstance) as jest.Mock & {
    ffprobe: jest.Mock;
  };

  // Add ffprobe method to the mockFfmpeg function directly
  mockFfmpeg.ffprobe = jest.fn().mockImplementation((_path, callback) => {
    callback(null, {
      streams: [
        {
          codec_type: "video",
          width: 1920,
          height: 1080,
          duration: 60,
        },
      ],
      format: {
        duration: 60,
        bit_rate: 5000000,
      },
    });
  });

  return mockFfmpeg;
});

describe("MediaProcessor", () => {
  let mediaProcessor: MediaProcessor;
  let mockLogger: ILoggerService;
  let mockFileUtils: jest.Mocked<FileUtils>;
  let mockImageProcessor: jest.Mocked<ImageProcessor>;
  const tempDir = "/tmp";
  const baseUrl = "https://example.com/files";

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

    // Create mock ImageProcessor
    mockImageProcessor = new ImageProcessor(
      mockLogger,
      mockFileUtils,
    ) as jest.Mocked<ImageProcessor>;

    // Mock path methods
    (path.extname as jest.Mock) = jest.fn().mockImplementation((p) => {
      const ext = p.split(".").pop();
      return ext ? `.${ext}` : "";
    });

    (path.basename as jest.Mock) = jest.fn().mockImplementation((p) => {
      return p.split("/").pop() || "";
    });

    (path.dirname as jest.Mock) = jest.fn().mockImplementation((p) => {
      return p.substring(0, p.lastIndexOf("/"));
    });

    (path.join as jest.Mock) = jest.fn().mockImplementation((...parts) => {
      return parts.join("/");
    });

    // Setup ImageProcessor constructor mock
    (ImageProcessor as jest.Mock).mockImplementation(() => mockImageProcessor);

    // Create MediaProcessor instance
    mediaProcessor = new MediaProcessor(
      mockLogger,
      mockFileUtils,
      tempDir,
      baseUrl,
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("processMedia", () => {
    it("should process an image file", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/target.jpg";
      const contentType = "image/jpeg";

      // Setup mocks
      mockFileUtils.detectContentType.mockReturnValue(contentType);

      mockImageProcessor.process.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: "jpeg",
        size: 12345,
      });

      // Call the method
      const result = await mediaProcessor.processMedia(sourcePath, targetPath);

      // Verify result
      expect(result).toEqual({
        path: targetPath,
        url: `${baseUrl}/path/to/target.jpg`,
        contentType,
        size: 12345,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
        thumbnail: undefined,
      });
    });

    it("should process a video file", async () => {
      const sourcePath = "/path/to/source.mp4";
      const targetPath = "/path/to/target.mp4";
      const contentType = "video/mp4";

      // Setup mocks
      mockFileUtils.detectContentType.mockReturnValue(contentType);
      mockFileUtils.copyFile.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue({ size: 12345 } as any);

      // Call the method
      const result = await mediaProcessor.processMedia(sourcePath, targetPath);

      // Verify ffprobe was called to get video metadata
      expect(ffmpeg.ffprobe).toHaveBeenCalledWith(
        sourcePath,
        expect.any(Function),
      );

      // Verify result
      expect(result).toEqual({
        path: targetPath,
        url: `${baseUrl}/path/to/target.mp4`,
        contentType,
        size: 12345,
        metadata: {
          width: 1920,
          height: 1080,
          duration: 60,
          format: "mp4",
        },
      });
    });

    it("should process an audio file", async () => {
      const sourcePath = "/path/to/source.mp3";
      const targetPath = "/path/to/target.mp3";
      const contentType = "audio/mpeg";

      // Setup mocks
      mockFileUtils.detectContentType.mockReturnValue(contentType);
      mockFileUtils.copyFile.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue({ size: 12345 } as any);

      // Override ffprobe mock to return audio metadata
      (ffmpeg.ffprobe as jest.Mock).mockImplementationOnce(
        (
          _path: string,
          callback: (error: Error | null, metadata: any) => void,
        ) => {
          callback(null, {
            streams: [
              {
                codec_type: "audio",
                duration: 180,
                bit_rate: 320000,
              },
            ],
            format: {
              duration: 180,
              bit_rate: 320000,
            },
          });
        },
      );

      // Call the method
      const result = await mediaProcessor.processMedia(sourcePath, targetPath);

      // Verify ffprobe was called to get audio metadata
      expect(ffmpeg.ffprobe).toHaveBeenCalledWith(
        sourcePath,
        expect.any(Function),
      );

      // Verify result
      expect(result).toEqual({
        path: targetPath,
        url: `${baseUrl}/path/to/target.mp3`,
        contentType,
        size: 12345,
        metadata: {
          duration: 180,
          format: "mp3",
        },
      });
    });

    it("should handle non-media files", async () => {
      const sourcePath = "/path/to/source.pdf";
      const targetPath = "/path/to/target.pdf";
      const contentType = "application/pdf";
      const stats = { size: 12345 };

      // Setup mocks
      mockFileUtils.detectContentType.mockReturnValue(contentType);
      mockFileUtils.copyFile.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue(stats as any);

      // Call the method
      const result = await mediaProcessor.processMedia(sourcePath, targetPath);

      // Verify result
      expect(result).toEqual({
        path: targetPath,
        url: `${baseUrl}/path/to/target.pdf`,
        contentType,
        size: 12345,
        metadata: {
          format: "pdf",
        },
      });
    });

    it("should generate thumbnails when requested", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/target.jpg";
      const thumbnailPath = "/path/to/target-thumb.jpg";
      const contentType = "image/jpeg";
      const options: MediaOptions = {
        generateThumbnail: true,
        thumbnailSize: 150,
      };

      // Setup mocks
      mockFileUtils.detectContentType.mockReturnValue(contentType);

      mockImageProcessor.process.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: "jpeg",
        size: 12345,
      });

      mockImageProcessor.generateThumbnail.mockResolvedValue(thumbnailPath);

      // Call the method
      const result = await mediaProcessor.processMedia(
        sourcePath,
        targetPath,
        options,
      );

      // Verify thumbnail generation
      expect(mockImageProcessor.generateThumbnail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        150,
      );

      // Verify result includes thumbnail
      expect(result).toHaveProperty("thumbnail", thumbnailPath);
    });

    it("should handle errors gracefully", async () => {
      const sourcePath = "/path/to/source.jpg";
      const targetPath = "/path/to/target.jpg";
      const error = new Error("Processing failed");

      // Setup mocks to throw an error
      mockFileUtils.detectContentType.mockImplementation(() => {
        throw error;
      });

      // Verify error handling
      await expect(
        mediaProcessor.processMedia(sourcePath, targetPath),
      ).rejects.toThrow("Processing failed");

      // Verify error logging
      const logger = mockLogger.createLogger("MediaProcessor");
      expect(logger.error).toHaveBeenCalledWith(
        `Error processing media: ${sourcePath}`,
        { error: "Processing failed" },
      );
    });
  });
});
