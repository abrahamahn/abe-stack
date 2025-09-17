import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

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
  variants?: string[];

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
  variants?: string[];

  // Common fields
  title?: string;
  description?: string | null;
  tags?: string[] | null;

  // Type-specific metadata
  metadata: NonNullable<MediaAttributes["metadata"]>;

  constructor(
    data: Partial<MediaAttributes> & { userId: string; type: MediaType }
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
    this.variants = data.variants || undefined;

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
    data: Omit<MediaAttributes, "id" | "createdAt" | "updatedAt">
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
    type?: MediaType
  ): Promise<Media[]> {
    return mediaRepository.findByUserId(userId, type, limit, offset);
  }

  /**
   * Find media by type
   */
  static async findByType(
    type: MediaType,
    limit = 20,
    offset = 0
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
      updateData as Partial<MediaAttributes>
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
      (chapter) => chapter.timestamp !== timestamp
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
   * Validates the media format
   * @returns Array of validation errors (empty if valid)
   */
  public validateFormat(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    // Check if MIME type is valid for media type
    let validMimeTypes: string[] = [];

    switch (this.type) {
      case MediaType.IMAGE:
        validMimeTypes = [
          MIME_TYPES.jpeg,
          MIME_TYPES.png,
          MIME_TYPES.gif,
          MIME_TYPES.webp,
          MIME_TYPES.svg,
          MIME_TYPES.tiff,
          MIME_TYPES.bmp,
        ];
        break;
      case MediaType.VIDEO:
        validMimeTypes = [
          MIME_TYPES.mp4,
          MIME_TYPES.webm,
          MIME_TYPES.mov,
          MIME_TYPES.avi,
          MIME_TYPES.mkv,
        ];
        break;
      case MediaType.AUDIO:
        validMimeTypes = [
          MIME_TYPES.mp3,
          MIME_TYPES.wav,
          MIME_TYPES.ogg,
          MIME_TYPES.aac,
          MIME_TYPES.flac,
        ];
        break;
    }

    if (this.mimeType && !validMimeTypes.includes(this.mimeType)) {
      errors.push({
        field: "mimeType",
        message: `Invalid MIME type ${this.mimeType} for media type ${this.type}`,
      });
    }

    return errors;
  }

  /**
   * Validates the media data before saving
   * @returns Array of validation errors (empty if valid)
   */
  public validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!this.userId) {
      errors.push({
        field: "userId",
        message: "User ID is required",
      });
    }

    if (!this.type) {
      errors.push({
        field: "type",
        message: "Media type is required",
      });
    } else if (!Object.values(MediaType).includes(this.type)) {
      errors.push({
        field: "type",
        message: `Invalid media type: ${this.type}`,
      });
    }

    if (!this.originalFilename) {
      errors.push({
        field: "originalFilename",
        message: "Original filename is required",
      });
    }

    if (!this.filename) {
      errors.push({
        field: "filename",
        message: "Filename is required",
      });
    }

    if (!this.path) {
      errors.push({
        field: "path",
        message: "File path is required",
      });
    }

    if (!this.mimeType) {
      errors.push({
        field: "mimeType",
        message: "MIME type is required",
      });
    }

    if (typeof this.size !== "number" || this.size <= 0) {
      errors.push({
        field: "size",
        message: "Valid file size is required",
      });
    }

    if (
      this.width !== undefined &&
      this.width !== null &&
      (typeof this.width !== "number" || this.width <= 0)
    ) {
      errors.push({
        field: "width",
        message: "Width must be a positive number",
      });
    }

    if (
      this.height !== undefined &&
      this.height !== null &&
      (typeof this.height !== "number" || this.height <= 0)
    ) {
      errors.push({
        field: "height",
        message: "Height must be a positive number",
      });
    }

    if (
      this.duration !== undefined &&
      this.duration !== null &&
      (typeof this.duration !== "number" || this.duration < 0)
    ) {
      errors.push({
        field: "duration",
        message: "Duration must be a non-negative number",
      });
    }

    if (!Object.values(MediaStatus).includes(this.processingStatus)) {
      errors.push({
        field: "processingStatus",
        message: `Invalid processing status: ${this.processingStatus}`,
      });
    }

    if (typeof this.isPublic !== "boolean") {
      errors.push({
        field: "isPublic",
        message: "isPublic must be a boolean",
      });
    }

    // Add format validation errors
    const formatErrors = this.validateFormat();
    errors.push(...formatErrors);

    return errors;
  }

  /**
   * Validates type-specific metadata
   * @returns Array of validation errors (empty if valid)
   */
  public validateMetadata(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    switch (this.type) {
      case MediaType.IMAGE:
        if (
          this.metadata.aspectRatio &&
          (typeof this.metadata.aspectRatio !== "number" ||
            this.metadata.aspectRatio <= 0)
        ) {
          errors.push({
            field: "metadata.aspectRatio",
            message: "Invalid aspect ratio for image",
          });
        }
        if (this.metadata.format && typeof this.metadata.format !== "string") {
          errors.push({
            field: "metadata.format",
            message: "Invalid format for image",
          });
        }
        break;
      case MediaType.VIDEO:
        if (
          this.metadata.orientation &&
          !["landscape", "portrait", "square"].includes(
            this.metadata.orientation
          )
        ) {
          errors.push({
            field: "metadata.orientation",
            message: "Invalid orientation for video",
          });
        }
        if (
          this.metadata.hasAudio !== undefined &&
          typeof this.metadata.hasAudio !== "boolean"
        ) {
          errors.push({
            field: "metadata.hasAudio",
            message: "hasAudio must be a boolean for video",
          });
        }
        if (this.metadata.chapters) {
          if (!Array.isArray(this.metadata.chapters)) {
            errors.push({
              field: "metadata.chapters",
              message: "Chapters must be an array",
            });
          } else {
            // Validate each chapter
            this.metadata.chapters.forEach((chapter, index) => {
              if (
                typeof chapter.timestamp !== "number" ||
                chapter.timestamp < 0
              ) {
                errors.push({
                  field: `metadata.chapters[${index}].timestamp`,
                  message: "Chapter timestamp must be a non-negative number",
                });
              }
              if (!chapter.title) {
                errors.push({
                  field: `metadata.chapters[${index}].title`,
                  message: "Chapter title is required",
                });
              }
            });
          }
        }
        break;
      case MediaType.AUDIO:
        if (
          this.metadata.bitrate &&
          (typeof this.metadata.bitrate !== "number" ||
            this.metadata.bitrate <= 0)
        ) {
          errors.push({
            field: "metadata.bitrate",
            message: "Invalid bitrate for audio",
          });
        }
        if (
          this.metadata.channels &&
          (typeof this.metadata.channels !== "number" ||
            this.metadata.channels <= 0)
        ) {
          errors.push({
            field: "metadata.channels",
            message: "Invalid number of channels for audio",
          });
        }
        if (
          this.metadata.sampleRate &&
          (typeof this.metadata.sampleRate !== "number" ||
            this.metadata.sampleRate <= 0)
        ) {
          errors.push({
            field: "metadata.sampleRate",
            message: "Invalid sample rate for audio",
          });
        }
        break;
    }

    return errors;
  }

  /**
   * String representation of the media
   */
  toString(): string {
    return `Media(id=${this.id}, type=${this.type}, filename=${this.filename})`;
  }
}

export default Media;
