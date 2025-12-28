import path from "path";

import ffmpeg from "fluent-ffmpeg";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  ImageProcessor,
  MediaProcessor,
  MediaOptions,
} from "@infrastructure/processor";

import type { ILoggerService } from "@/server/infrastructure/logging";
import { FileUtils } from "@/server/infrastructure/storage/FileUtils";

// Mock dependencies
vi.mock("@infrastructure/processor/ImageProcessor");
vi.mock("@infrastructure/storage/FileUtils");
vi.mock("fluent-ffmpeg", async () => {
  const mockFfmpegInstance = {
    input: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation((event: any, callback: any) => {
      // Store callbacks to trigger them appropriately
      if (event === "end") {
        setTimeout(() => callback(), 0);
      }
      return mockFfmpegInstance;
    }),
    run: vi.fn().mockReturnThis(),
    screenshots: vi.fn().mockImplementation((_options: any) => {
      // Simulate successful completion
      setTimeout(() => {
        const endCallback = mockFfmpegInstance.on.mock.calls.find(
          (call) => call[0] === "end",
        )?.[1];
        if (endCallback) endCallback();
      }, 0);
      return mockFfmpegInstance;
    }),
    videoBitrate: vi.fn().mockReturnThis(),
    audioBitrate: vi.fn().mockReturnThis(),
    audioFilters: vi.fn().mockReturnThis(),
  };

  const mockFfmpeg = vi.fn(() => mockFfmpegInstance) as ReturnType<
    typeof vi.fn
  > & {
    ffprobe: ReturnType<typeof vi.fn>;
  };

  // Add ffprobe method to the mockFfmpeg function directly
  mockFfmpeg.ffprobe = vi
    .fn()
    .mockImplementation((_path: any, callback: any) => {
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

  return {
    default: mockFfmpeg,
    __esModule: true,
  };
});

describe("MediaProcessor", () => {
  let mediaProcessor: MediaProcessor;
  let mockLogger: ILoggerService;
  let mockFileUtils: any;
  let mockImageProcessor: any;
  const tempDir = "/tmp";
  const baseUrl = "https://example.com/files";

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

    // Create mock FileUtils
    mockFileUtils = new FileUtils(mockLogger) as any;

    // Create mock ImageProcessor
    mockImageProcessor = new ImageProcessor(mockLogger, mockFileUtils) as any;

    // Mock path methods
    vi.spyOn(path, "extname").mockImplementation((p: any) => {
      const ext = p.split(".").pop();
      return ext ? `.${ext}` : "";
    });

    vi.spyOn(path, "basename").mockImplementation((p: any) => {
      return p.split("/").pop() || "";
    });

    vi.spyOn(path, "dirname").mockImplementation((p: any) => {
      return p.substring(0, p.lastIndexOf("/"));
    });

    vi.spyOn(path, "join").mockImplementation((...parts: any) => {
      return parts.join("/");
    });

    // Setup ImageProcessor constructor mock
    (ImageProcessor as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockImageProcessor,
    );

    // Create MediaProcessor instance
    mediaProcessor = new MediaProcessor(
      mockLogger,
      mockFileUtils,
      tempDir,
      baseUrl,
    );

    // Reset all mocks
    vi.clearAllMocks();
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
      const result = await mediaProcessor.processMedia(sourcePath, {
        targetPath,
      });

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
          dimensions: {
            width: 1920,
            height: 1080,
          },
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
      const result = await mediaProcessor.processMedia(sourcePath, {
        targetPath,
      });

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
          format: "mp4",
          duration: 60,
          dimensions: {
            width: 1920,
            height: 1080,
          },
        },
        thumbnail: "/path/to/target_thumb.webp",
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

      // Update ffprobe mock for audio
      ffmpeg.ffprobe = vi
        .fn()
        .mockImplementation(
          (
            _path: string,
            callback: (error: Error | null, metadata: any) => void,
          ) => {
            callback(null, {
              streams: [
                {
                  codec_type: "audio",
                  duration: 180,
                },
              ],
              format: {
                duration: 180,
                format_name: "mp3",
              },
            });
          },
        );

      // Call the method
      const result = await mediaProcessor.processMedia(sourcePath, {
        targetPath,
      });

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
          format: "mp3",
          duration: 180,
          dimensions: {
            width: 0,
            height: 0,
          },
        },
        thumbnail: undefined,
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
      const result = await mediaProcessor.processMedia(sourcePath, {
        targetPath,
      });

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
      const result = await mediaProcessor.processMedia(sourcePath, {
        targetPath,
        ...options,
      });

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
        mediaProcessor.processMedia(sourcePath, { targetPath }),
      ).rejects.toThrow("Processing failed");

      // Verify error logging
      const logger = mockLogger.createLogger("MediaProcessor");
      expect(logger.error).toHaveBeenCalledWith(
        `Error processing media: ${sourcePath}`,
        { error: "Processing failed" },
      );
    });

    it("should handle video processing errors", async () => {
      const sourcePath = "/path/to/source.mp4";
      const targetPath = "/path/to/target.mp4";
      const contentType = "video/mp4";
      const error = new Error("Video processing failed");

      // Setup mocks
      mockFileUtils.detectContentType.mockReturnValue(contentType);
      mockFileUtils.copyFile.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue({ size: 12345 } as any);
      mockFileUtils.ensureDirectory.mockResolvedValue(true);

      // Mock ffmpeg to throw error
      const mockFfmpegInstance = {
        screenshots: vi.fn(() => {
          throw new Error("Video processing failed");
        }),
        output: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, callback: any) => {
          if (event === "error") {
            callback(error);
          }
          return mockFfmpegInstance;
        }),
        run: vi.fn(),
      };

      (ffmpeg as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => mockFfmpegInstance,
      );

      // Verify error handling
      await expect(
        mediaProcessor.processMedia(sourcePath, {
          targetPath,
          generateThumbnail: true,
        }),
      ).rejects.toThrow("Video processing failed");

      // Verify error logging
      const logger = mockLogger.createLogger("MediaProcessor");
      expect(logger.error).toHaveBeenCalledWith(
        `Error processing media: ${sourcePath}`,
        { error: "Video processing failed" },
      );
    });

    it("should handle audio processing errors", async () => {
      const sourcePath = "/path/to/source.mp3";
      const targetPath = "/path/to/target.mp3";
      const contentType = "audio/mpeg";
      const error = new Error("Audio processing failed");

      // Setup mocks
      mockFileUtils.detectContentType.mockReturnValue(contentType);
      mockFileUtils.copyFile.mockResolvedValue(true);
      mockFileUtils.getFileStats.mockResolvedValue({ size: 12345 } as any);
      mockFileUtils.ensureDirectory.mockResolvedValue(true);

      // Mock ffmpeg to throw error
      const mockFfmpegInstance = {
        output: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, callback: any) => {
          if (event === "error") {
            callback(error);
          }
          return mockFfmpegInstance;
        }),
        run: vi.fn(),
      };

      (ffmpeg as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => mockFfmpegInstance,
      );

      // Verify error handling
      await expect(
        mediaProcessor.processMedia(sourcePath, { targetPath }),
      ).rejects.toThrow("Audio processing failed");

      // Verify error logging
      const logger = mockLogger.createLogger("MediaProcessor");
      expect(logger.error).toHaveBeenCalledWith(
        `Error processing media: ${sourcePath}`,
        { error: "Audio processing failed" },
      );
    });

    it("should handle different content types correctly", async () => {
      const testCases = [
        {
          contentType: "application/pdf",
          format: "pdf",
        },
        {
          contentType: "text/plain",
          format: "txt",
        },
        {
          contentType: "application/json",
          format: "json",
        },
      ];

      for (const { contentType, format } of testCases) {
        const sourcePath = `/path/to/source.${format}`;
        const targetPath = `/path/to/target.${format}`;
        const stats = { size: 12345 };

        // Setup mocks
        mockFileUtils.detectContentType.mockReturnValue(contentType);
        mockFileUtils.copyFile.mockResolvedValue(true);
        mockFileUtils.getFileStats.mockResolvedValue(stats as any);

        // Call the method
        const result = await mediaProcessor.processMedia(sourcePath, {
          targetPath,
        });

        // Verify result
        expect(result).toEqual({
          path: targetPath,
          url: `${baseUrl}/path/to/target.${format}`,
          contentType,
          size: 12345,
          metadata: {
            format,
          },
        });
      }
    });
  });
});
