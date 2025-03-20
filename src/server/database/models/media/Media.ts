import { mediaRepository } from "../../repositories/media/MediaRepository";
import { BaseModel } from "../BaseModel";

// Media types
export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
}

// Supported formats for each media type
export enum MediaFormat {
  // Image formats
  JPEG = "jpeg",
  PNG = "png",
  GIF = "gif",
  WEBP = "webp",
  SVG = "svg",
  TIFF = "tiff",
  BMP = "bmp",

  // Video formats
  MP4 = "mp4",
  WEBM = "webm",
  MOV = "mov",
  AVI = "avi",
  MKV = "mkv",

  // Audio formats
  MP3 = "mp3",
  WAV = "wav",
  OGG = "ogg",
  AAC = "aac",
  FLAC = "flac",
}

// MIME types mapping
export const MIME_TYPES: Record<MediaFormat, string> = {
  // Image MIME types
  [MediaFormat.JPEG]: "image/jpeg",
  [MediaFormat.PNG]: "image/png",
  [MediaFormat.GIF]: "image/gif",
  [MediaFormat.WEBP]: "image/webp",
  [MediaFormat.SVG]: "image/svg+xml",
  [MediaFormat.TIFF]: "image/tiff",
  [MediaFormat.BMP]: "image/bmp",

  // Video MIME types
  [MediaFormat.MP4]: "video/mp4",
  [MediaFormat.WEBM]: "video/webm",
  [MediaFormat.MOV]: "video/quicktime",
  [MediaFormat.AVI]: "video/x-msvideo",
  [MediaFormat.MKV]: "video/x-matroska",

  // Audio MIME types
  [MediaFormat.MP3]: "audio/mpeg",
  [MediaFormat.WAV]: "audio/wav",
  [MediaFormat.OGG]: "audio/ogg",
  [MediaFormat.AAC]: "audio/aac",
  [MediaFormat.FLAC]: "audio/flac",
};

export enum MediaStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum MediaPrivacy {
  PUBLIC = "public",
  PRIVATE = "private",
  FRIENDS = "friends",
}

// Video chapters interface
export interface VideoChapter {
  timestamp: number;
  title: string;
  description?: string;
}

// Base media attributes
export interface MediaAttributes extends BaseModel {
  userId: string;
  type: MediaType;
  originalFilename: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailPath: string | null;
  processingStatus: MediaStatus;
  isPublic: boolean;

  // Common fields that were in VideoMedia
  title?: string;
  description?: string | null;
  tags?: string[] | null;

  // Type-specific metadata stored as JSON
  metadata?: {
    // Image-specific metadata
    aspectRatio?: number | null;
    format?: string | null;
    colorProfile?: string | null;
    altText?: string | null;
    filters?: string[] | null;
    editInformation?: Record<string, unknown> | null;

    // Video-specific metadata
    chapters?: VideoChapter[] | null;
    orientation?: "portrait" | "landscape" | "square";
    caption?: string | null;
    hasAudio?: boolean;
    visibility?: "public" | "unlisted" | "private";
    allowComments?: boolean;

    // Audio-specific metadata could be added here in the future
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
  };
}

export class Media
  extends BaseModel
  implements Omit<MediaAttributes, keyof BaseModel>
{
  userId: string;
  type: MediaType;
  originalFilename: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailPath: string | null;
  processingStatus: MediaStatus;
  isPublic: boolean;

  // Common fields
  title?: string;
  description?: string | null;
  tags?: string[] | null;

  // Type-specific metadata
  metadata: NonNullable<MediaAttributes["metadata"]>;

  constructor(
    data: Partial<MediaAttributes> & { userId: string; type: MediaType },
  ) {
    super();
    this.userId = data.userId;
    this.type = data.type || MediaType.IMAGE;
    this.originalFilename = data.originalFilename || "";
    this.filename = data.filename || "";
    this.path = data.path || "";
    this.mimeType = data.mimeType || "";
    this.size = data.size || 0;
    this.width = data.width || null;
    this.height = data.height || null;
    this.duration = data.duration || null;
    this.thumbnailPath = data.thumbnailPath || null;
    this.processingStatus = data.processingStatus || MediaStatus.PENDING;
    this.isPublic = data.isPublic || false;

    // Common fields
    this.title = data.title;
    this.description = data.description || null;
    this.tags = data.tags || null;

    // Initialize metadata
    this.metadata = data.metadata || {};

    // Set default metadata based on media type
    if (this.type === MediaType.IMAGE) {
      this.metadata = {
        ...this.metadata,
        aspectRatio: this.metadata.aspectRatio || this.calculateAspectRatio(),
        format: this.metadata.format || null,
        colorProfile: this.metadata.colorProfile || null,
        altText: this.metadata.altText || null,
        filters: this.metadata.filters || null,
        editInformation: this.metadata.editInformation || null,
      };
    } else if (this.type === MediaType.VIDEO) {
      this.metadata = {
        ...this.metadata,
        chapters: this.metadata.chapters || null,
        orientation: this.metadata.orientation || this.calculateOrientation(),
        caption: this.metadata.caption || null,
        hasAudio:
          this.metadata.hasAudio !== undefined ? this.metadata.hasAudio : true,
        visibility: this.metadata.visibility || "private",
        allowComments:
          this.metadata.allowComments !== undefined
            ? this.metadata.allowComments
            : true,
      };
    } else if (this.type === MediaType.AUDIO) {
      this.metadata = {
        ...this.metadata,
        bitrate: this.metadata.bitrate || undefined,
        sampleRate: this.metadata.sampleRate || undefined,
        channels: this.metadata.channels || undefined,
      };
    }
  }

  /**
   * Check if media is an image
   */
  get isImage(): boolean {
    return this.type === MediaType.IMAGE;
  }

  /**
   * Check if media is a video
   */
  get isVideo(): boolean {
    return this.type === MediaType.VIDEO;
  }

  /**
   * Check if media is an audio file
   */
  get isAudio(): boolean {
    return this.type === MediaType.AUDIO;
  }

  /**
   * Calculate aspect ratio from dimensions
   */
  calculateAspectRatio(): number | null {
    if (this.width && this.height && this.height > 0) {
      return parseFloat((this.width / this.height).toFixed(2));
    }
    return null;
  }

  /**
   * Calculate video orientation based on dimensions
   */
  calculateOrientation(): "portrait" | "landscape" | "square" {
    if (!this.width || !this.height) {
      return "portrait"; // Default to portrait if dimensions not available
    }

    if (this.width > this.height) {
      return "landscape";
    } else if (this.height > this.width) {
      return "portrait";
    } else {
      return "square";
    }
  }

  /**
   * Create a new media item
   */
  static async create(
    data: Omit<MediaAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Media> {
    const mediaData: Omit<MediaAttributes, "id" | "createdAt" | "updatedAt"> = {
      ...data,
      userId: data.userId,
      type: data.type,
      originalFilename: data.originalFilename,
      filename: data.filename,
      path: data.path,
      mimeType: data.mimeType,
      size: data.size,
      width: data.width,
      height: data.height,
      duration: data.duration,
      thumbnailPath: data.thumbnailPath,
      processingStatus: data.processingStatus,
      isPublic: data.isPublic,
    };
    const media = await mediaRepository.create(mediaData);
    return new Media(media);
  }

  /**
   * Find public media
   */
  static async findPublic(limit = 20, offset = 0): Promise<Media[]> {
    return mediaRepository.findPublic(limit, offset);
  }

  /**
   * Find media by user ID
   */
  static async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    type?: MediaType,
  ): Promise<Media[]> {
    return mediaRepository.findByUserId(userId, type, limit, offset);
  }

  /**
   * Find media by type
   */
  static async findByType(
    type: MediaType,
    limit = 20,
    offset = 0,
  ): Promise<Media[]> {
    return mediaRepository.findByType(type, limit, offset);
  }

  /**
   * Find media by ID
   */
  static async findById(id: string): Promise<Media | null> {
    return mediaRepository.findById(id);
  }

  /**
   * Update a media item
   */
  async update(data: Partial<MediaAttributes>): Promise<Media> {
    const updateData = {
      ...data,
      ...(data.userId !== undefined && { user_id: data.userId }),
      ...(data.originalFilename !== undefined && {
        original_filename: data.originalFilename,
      }),
      ...(data.thumbnailPath !== undefined && {
        thumbnail_path: data.thumbnailPath,
      }),
      ...(data.processingStatus !== undefined && {
        processing_status: data.processingStatus,
      }),
      ...(data.isPublic !== undefined && { is_public: data.isPublic }),
    };
    const updated = await mediaRepository.update(
      this.id,
      updateData as Partial<MediaAttributes>,
    );
    if (updated) {
      Object.assign(this, updated);
    }
    return this;
  }

  /**
   * Delete a media item
   */
  async delete(): Promise<boolean> {
    return mediaRepository.delete(this.id);
  }

  // Image-specific methods
  /**
   * Set alt text for the image
   */
  setAltText(text: string): void {
    if (!this.isImage) return;
    this.metadata.altText = text;
  }

  /**
   * Check if the image has high enough resolution for printing
   */
  isPrintQuality(minimumDpi: number = 300): boolean {
    if (!this.isImage) return false;
    return !!(
      this.width &&
      this.height &&
      this.width >= minimumDpi &&
      this.height >= minimumDpi
    );
  }

  // Video-specific methods
  /**
   * Add a chapter to the video
   */
  addChapter(chapter: VideoChapter): void {
    if (!this.isVideo) return;
    if (!this.metadata.chapters) {
      this.metadata.chapters = [];
    }
    this.metadata.chapters.push(chapter);
    // Sort chapters by timestamp
    this.metadata.chapters.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Remove a chapter from the video
   */
  removeChapter(timestamp: number): void {
    if (!this.isVideo || !this.metadata.chapters) return;
    this.metadata.chapters = this.metadata.chapters.filter(
      (chapter) => chapter.timestamp !== timestamp,
    );
  }

  /**
   * Manage tags for any media type
   */
  manageTags(tags: string[], operation: "add" | "remove"): void {
    if (!this.tags) {
      this.tags = [];
    }

    if (operation === "add") {
      tags.forEach((tag) => {
        if (this.tags && !this.tags.includes(tag)) {
          this.tags.push(tag);
        }
      });
    } else {
      this.tags = this.tags.filter((tag) => !tags.includes(tag));
    }
  }

  /**
   * Set caption for video
   */
  setCaption(text: string): void {
    if (!this.isVideo) return;
    this.metadata.caption = text;
  }

  /**
   * Toggle audio setting for video
   */
  toggleAudio(): void {
    if (!this.isVideo) return;
    this.metadata.hasAudio = !this.metadata.hasAudio;
  }

  /**
   * Set video visibility and update isPublic accordingly
   */
  setVisibility(visibility: "public" | "unlisted" | "private"): void {
    if (!this.isVideo) return;
    this.metadata.visibility = visibility;
    // If setting to public, also update the isPublic flag
    this.isPublic = visibility === "public";
  }

  /**
   * Validates the media format and MIME type
   * @throws {Error} If format validation fails
   */
  public validateFormat(): void {
    const format = this.getFormatFromMimeType();
    if (!format) {
      throw new Error("Unsupported MIME type");
    }

    // Validate format against media type
    switch (this.type) {
      case MediaType.IMAGE:
        if (
          !Object.values(MediaFormat).some((f) =>
            ["jpeg", "png", "gif", "webp", "svg", "tiff", "bmp"].includes(f),
          )
        ) {
          throw new Error("Invalid image format");
        }
        break;
      case MediaType.VIDEO:
        if (
          !Object.values(MediaFormat).some((f) =>
            ["mp4", "webm", "mov", "avi", "mkv"].includes(f),
          )
        ) {
          throw new Error("Invalid video format");
        }
        break;
      case MediaType.AUDIO:
        if (
          !Object.values(MediaFormat).some((f) =>
            ["mp3", "wav", "ogg", "aac", "flac"].includes(f),
          )
        ) {
          throw new Error("Invalid audio format");
        }
        break;
    }
  }

  /**
   * Get format from MIME type
   * @returns The media format or null if not found
   */
  private getFormatFromMimeType(): MediaFormat | null {
    const format = Object.entries(MIME_TYPES).find(
      ([_, mime]) => mime === this.mimeType,
    );
    return format ? (format[0] as MediaFormat) : null;
  }

  /**
   * Validates the media data before saving
   * @throws {Error} If validation fails
   */
  public validate(): void {
    if (!this.userId) {
      throw new Error("User ID is required");
    }
    if (!this.type) {
      throw new Error("Media type is required");
    }
    if (!this.originalFilename) {
      throw new Error("Original filename is required");
    }
    if (!this.filename) {
      throw new Error("Filename is required");
    }
    if (!this.path) {
      throw new Error("File path is required");
    }
    if (!this.mimeType) {
      throw new Error("MIME type is required");
    }
    if (typeof this.size !== "number" || this.size <= 0) {
      throw new Error("Valid file size is required");
    }
    if (
      this.width !== undefined &&
      (typeof this.width !== "number" || this.width <= 0)
    ) {
      throw new Error("Width must be a positive number");
    }
    if (
      this.height !== undefined &&
      (typeof this.height !== "number" || this.height <= 0)
    ) {
      throw new Error("Height must be a positive number");
    }
    if (
      this.duration !== undefined &&
      (typeof this.duration !== "number" || this.duration < 0)
    ) {
      throw new Error("Duration must be a non-negative number");
    }
    if (!Object.values(MediaStatus).includes(this.processingStatus)) {
      throw new Error("Invalid processing status");
    }
    if (typeof this.isPublic !== "boolean") {
      throw new Error("isPublic must be a boolean");
    }

    // Validate format and MIME type
    this.validateFormat();
  }

  /**
   * Validates type-specific metadata
   * @throws {Error} If metadata validation fails
   */
  public validateMetadata(): void {
    switch (this.type) {
      case MediaType.IMAGE:
        if (
          this.metadata.aspectRatio &&
          (typeof this.metadata.aspectRatio !== "number" ||
            this.metadata.aspectRatio <= 0)
        ) {
          throw new Error("Invalid aspect ratio for image");
        }
        if (this.metadata.format && typeof this.metadata.format !== "string") {
          throw new Error("Invalid format for image");
        }
        break;
      case MediaType.VIDEO:
        if (
          this.metadata.orientation &&
          !["landscape", "portrait", "square"].includes(
            this.metadata.orientation,
          )
        ) {
          throw new Error("Invalid orientation for video");
        }
        if (
          this.metadata.hasAudio !== undefined &&
          typeof this.metadata.hasAudio !== "boolean"
        ) {
          throw new Error("hasAudio must be a boolean for video");
        }
        break;
      case MediaType.AUDIO:
        if (
          this.metadata.bitrate &&
          (typeof this.metadata.bitrate !== "number" ||
            this.metadata.bitrate <= 0)
        ) {
          throw new Error("Invalid bitrate for audio");
        }
        if (
          this.metadata.channels &&
          (typeof this.metadata.channels !== "number" ||
            this.metadata.channels <= 0)
        ) {
          throw new Error("Invalid number of channels for audio");
        }
        break;
    }
  }
}

export default Media;
