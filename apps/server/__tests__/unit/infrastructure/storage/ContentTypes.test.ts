import { describe, it, expect } from "vitest";

import {
  ContentCategory,
  ImageFormat,
  VideoFormat,
  AudioFormat,
  getContentCategory,
  getMimeType,
} from "@infrastructure/storage";

describe("ContentTypes", () => {
  describe("getContentCategory", () => {
    it("should identify image content types", () => {
      const imageTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/svg+xml",
      ];

      for (const contentType of imageTypes) {
        expect(getContentCategory(contentType)).toBe(ContentCategory.IMAGE);
      }
    });

    it("should identify video content types", () => {
      const videoTypes = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
      ];

      for (const contentType of videoTypes) {
        expect(getContentCategory(contentType)).toBe(ContentCategory.VIDEO);
      }
    });

    it("should identify audio content types", () => {
      const audioTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac"];

      for (const contentType of audioTypes) {
        expect(getContentCategory(contentType)).toBe(ContentCategory.AUDIO);
      }
    });

    it("should identify document content types", () => {
      const documentTypes = [
        "text/plain",
        "text/html",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/msword",
        "application/vnd.oasis.opendocument.text",
      ];

      for (const contentType of documentTypes) {
        if (
          contentType.startsWith("text/") ||
          contentType === "application/pdf" ||
          contentType.includes("document") ||
          contentType.includes("spreadsheet") ||
          contentType.includes("presentation")
        ) {
          expect(getContentCategory(contentType)).toBe(
            ContentCategory.DOCUMENT,
          );
        } else {
          expect(getContentCategory(contentType)).toBe(ContentCategory.OTHER);
        }
      }
    });

    it("should identify archive content types", () => {
      const archiveTypes = [
        "application/zip",
        "application/x-tar",
        "application/gzip",
        "application/x-compressed",
      ];

      for (const contentType of archiveTypes) {
        expect(getContentCategory(contentType)).toBe(ContentCategory.ARCHIVE);
      }
    });

    it("should default to OTHER for unknown content types", () => {
      const otherTypes = ["application/octet-stream", "foo/bar"];

      for (const contentType of otherTypes) {
        expect(getContentCategory(contentType)).toBe(ContentCategory.OTHER);
      }
    });
  });

  describe("getMimeType", () => {
    it("should return correct MIME types for IMAGE formats", () => {
      expect(getMimeType(ImageFormat.JPEG, ContentCategory.IMAGE)).toBe(
        "image/jpeg",
      );
      expect(getMimeType(ImageFormat.PNG, ContentCategory.IMAGE)).toBe(
        "image/png",
      );
      expect(getMimeType(ImageFormat.WEBP, ContentCategory.IMAGE)).toBe(
        "image/webp",
      );
      expect(getMimeType(ImageFormat.GIF, ContentCategory.IMAGE)).toBe(
        "image/gif",
      );
      expect(getMimeType(ImageFormat.AVIF, ContentCategory.IMAGE)).toBe(
        "image/avif",
      );
      expect(getMimeType(ImageFormat.SVG, ContentCategory.IMAGE)).toBe(
        "image/svg+xml",
      );
      expect(getMimeType(ImageFormat.ORIGINAL, ContentCategory.IMAGE)).toBe(
        "image/jpeg",
      );
      expect(getMimeType("unknown", ContentCategory.IMAGE)).toBe("image/jpeg"); // Default
    });

    it("should return correct MIME types for VIDEO formats", () => {
      expect(getMimeType(VideoFormat.MP4, ContentCategory.VIDEO)).toBe(
        "video/mp4",
      );
      expect(getMimeType(VideoFormat.WEBM, ContentCategory.VIDEO)).toBe(
        "video/webm",
      );
      expect(getMimeType(VideoFormat.AVI, ContentCategory.VIDEO)).toBe(
        "video/x-msvideo",
      );
      expect(getMimeType(VideoFormat.MOV, ContentCategory.VIDEO)).toBe(
        "video/quicktime",
      );
      expect(getMimeType(VideoFormat.HLS, ContentCategory.VIDEO)).toBe(
        "video/mp4",
      );
      expect(getMimeType(VideoFormat.DASH, ContentCategory.VIDEO)).toBe(
        "video/mp4",
      );
      expect(getMimeType(VideoFormat.ORIGINAL, ContentCategory.VIDEO)).toBe(
        "video/mp4",
      );
      expect(getMimeType("unknown", ContentCategory.VIDEO)).toBe("video/mp4"); // Default
    });

    it("should return correct MIME types for AUDIO formats", () => {
      expect(getMimeType(AudioFormat.MP3, ContentCategory.AUDIO)).toBe(
        "audio/mpeg",
      );
      expect(getMimeType(AudioFormat.WAV, ContentCategory.AUDIO)).toBe(
        "audio/wav",
      );
      expect(getMimeType(AudioFormat.OGG, ContentCategory.AUDIO)).toBe(
        "audio/ogg",
      );
      expect(getMimeType(AudioFormat.AAC, ContentCategory.AUDIO)).toBe(
        "audio/aac",
      );
      expect(getMimeType(AudioFormat.FLAC, ContentCategory.AUDIO)).toBe(
        "audio/flac",
      );
      expect(getMimeType(AudioFormat.ORIGINAL, ContentCategory.AUDIO)).toBe(
        "audio/mpeg",
      );
      expect(getMimeType("unknown", ContentCategory.AUDIO)).toBe("audio/mpeg"); // Default
    });

    it("should return octet-stream for unknown categories", () => {
      expect(getMimeType("anything", ContentCategory.DOCUMENT)).toBe(
        "application/octet-stream",
      );
      expect(getMimeType("anything", ContentCategory.ARCHIVE)).toBe(
        "application/octet-stream",
      );
      expect(getMimeType("anything", ContentCategory.OTHER)).toBe(
        "application/octet-stream",
      );
    });

    it("should handle mixed case content types", () => {
      expect(getContentCategory("IMAGE/JPEG")).toBe(ContentCategory.IMAGE);
      expect(getContentCategory("VIDEO/MP4")).toBe(ContentCategory.VIDEO);
      expect(getContentCategory("AUDIO/MPEG")).toBe(ContentCategory.AUDIO);
      expect(getContentCategory("APPLICATION/PDF")).toBe(
        ContentCategory.DOCUMENT,
      );
      expect(getContentCategory("APPLICATION/ZIP")).toBe(
        ContentCategory.ARCHIVE,
      );
    });

    it("should handle content types with additional parameters", () => {
      expect(getContentCategory("image/jpeg; charset=utf-8")).toBe(
        ContentCategory.IMAGE,
      );
      expect(getContentCategory("video/mp4; codecs=avc1.42E01E")).toBe(
        ContentCategory.VIDEO,
      );
      expect(getContentCategory("audio/mpeg; bitrate=320")).toBe(
        ContentCategory.AUDIO,
      );
      expect(getContentCategory("application/pdf; version=1.7")).toBe(
        ContentCategory.DOCUMENT,
      );
      expect(getContentCategory("application/zip; compression=deflate")).toBe(
        ContentCategory.ARCHIVE,
      );
    });
  });
});
