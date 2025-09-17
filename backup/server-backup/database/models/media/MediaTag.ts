import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

import { BaseModelInterface } from "../BaseModel";

export interface MediaTagAttributes extends BaseModelInterface {
  mediaId: string;
  hashtagId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

export class MediaTag implements MediaTagAttributes {
  id: string;
  mediaId: string;
  hashtagId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;

  constructor(
    data: Partial<MediaTagAttributes> & { mediaId: string; hashtagId: string }
  ) {
    this.id = data.id || "";
    this.mediaId = data.mediaId;
    this.hashtagId = data.hashtagId;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!this.mediaId) {
      errors.push({
        field: "mediaId",
        message: "Media ID is required",
      });
    }

    if (!this.hashtagId) {
      errors.push({
        field: "hashtagId",
        message: "Hashtag ID is required",
      });
    }

    return errors;
  }

  /**
   * String representation of the media tag
   */
  toString(): string {
    return `MediaTag(id=${this.id}, mediaId=${this.mediaId}, hashtagId=${this.hashtagId})`;
  }
}
