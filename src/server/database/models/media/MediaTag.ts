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
    data: Partial<MediaTagAttributes> & { mediaId: string; hashtagId: string },
  ) {
    this.id = data.id || "";
    this.mediaId = data.mediaId;
    this.hashtagId = data.hashtagId;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  validate(): void {
    if (!this.mediaId) throw new Error("Media ID is required");
    if (!this.hashtagId) throw new Error("Hashtag ID is required");
  }
}
