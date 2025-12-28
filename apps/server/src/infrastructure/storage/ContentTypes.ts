// ContentTypes.ts
/**
 * Enumeration of common content type categories
 */
export enum ContentCategory {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  ARCHIVE = "archive",
  OTHER = "other",
}

/**
 * Common image formats
 */
export enum ImageFormat {
  JPEG = "jpeg",
  PNG = "png",
  WEBP = "webp",
  GIF = "gif",
  AVIF = "avif",
  SVG = "svg+xml",
  ORIGINAL = "original",
}

/**
 * Common video formats
 */
export enum VideoFormat {
  MP4 = "mp4",
  WEBM = "webm",
  AVI = "avi",
  MOV = "quicktime",
  HLS = "hls",
  DASH = "dash",
  ORIGINAL = "original",
}

/**
 * Common audio formats
 */
export enum AudioFormat {
  MP3 = "mp3",
  WAV = "wav",
  OGG = "ogg",
  AAC = "aac",
  FLAC = "flac",
  ORIGINAL = "original",
}

/**
 * Map MIME types to their respective content categories
 * @param contentType Content type string
 * @returns Content category
 */
export function getContentCategory(contentType: string): ContentCategory {
  // Normalize content type: trim, convert to lowercase, and remove parameters
  const normalizedType = contentType.toLowerCase().split(";")[0].trim();

  if (normalizedType.startsWith("image/")) {
    return ContentCategory.IMAGE;
  } else if (normalizedType.startsWith("video/")) {
    return ContentCategory.VIDEO;
  } else if (normalizedType.startsWith("audio/")) {
    return ContentCategory.AUDIO;
  } else if (
    normalizedType.startsWith("text/") ||
    normalizedType.startsWith("application/pdf") ||
    normalizedType.includes("document") ||
    normalizedType.includes("spreadsheet") ||
    normalizedType.includes("presentation")
  ) {
    return ContentCategory.DOCUMENT;
  } else if (
    normalizedType.includes("zip") ||
    normalizedType.includes("tar") ||
    normalizedType.includes("gzip") ||
    normalizedType.includes("compressed")
  ) {
    return ContentCategory.ARCHIVE;
  } else {
    return ContentCategory.OTHER;
  }
}

/**
 * Get MIME type from format
 * @param format Format string
 * @param contentCategory Content category
 * @returns MIME type
 */
export function getMimeType(
  format: string,
  contentCategory: ContentCategory,
): string {
  switch (contentCategory) {
    case ContentCategory.IMAGE:
      switch (format) {
        case ImageFormat.JPEG:
          return "image/jpeg";
        case ImageFormat.PNG:
          return "image/png";
        case ImageFormat.WEBP:
          return "image/webp";
        case ImageFormat.GIF:
          return "image/gif";
        case ImageFormat.AVIF:
          return "image/avif";
        case ImageFormat.SVG:
          return "image/svg+xml";
        default:
          return "image/jpeg";
      }
    case ContentCategory.VIDEO:
      switch (format) {
        case VideoFormat.MP4:
          return "video/mp4";
        case VideoFormat.WEBM:
          return "video/webm";
        case VideoFormat.AVI:
          return "video/x-msvideo";
        case VideoFormat.MOV:
          return "video/quicktime";
        default:
          return "video/mp4";
      }
    case ContentCategory.AUDIO:
      switch (format) {
        case AudioFormat.MP3:
          return "audio/mpeg";
        case AudioFormat.WAV:
          return "audio/wav";
        case AudioFormat.OGG:
          return "audio/ogg";
        case AudioFormat.AAC:
          return "audio/aac";
        case AudioFormat.FLAC:
          return "audio/flac";
        default:
          return "audio/mpeg";
      }
    default:
      return "application/octet-stream";
  }
}
