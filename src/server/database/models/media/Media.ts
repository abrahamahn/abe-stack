import { Pool } from 'pg';

import { DatabaseConnectionManager } from '../../../config/database';
import { BaseModel, BaseRepository } from '../../repositories/BaseRepository';
import { Post } from '../social/Post';

// Media types
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio'
}

// Processing status
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

interface MediaMetadata {
  [key: string]: string | number | boolean | null;
}

export interface MediaAttributes extends BaseModel {
  userId: string;
  type: string;
  originalFilename: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailPath: string | null;
  processingStatus: string;
  processingJobId: string | null;
  metadata: MediaMetadata | null;
  isPublic: boolean;
}

export class MediaRepository extends BaseRepository<MediaAttributes> {
  protected tableName = 'media';
  protected columns = [
    'id',
    'user_id as userId',
    'type',
    'original_filename as originalFilename',
    'filename',
    'path',
    'mime_type as mimeType',
    'size',
    'width',
    'height',
    'duration',
    'thumbnail_path as thumbnailPath',
    'processing_status as processingStatus',
    'processing_job_id as processingJobId',
    'metadata',
    'is_public as isPublic',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find media by user ID
   */
  async findByUserId(userId: string, client?: Pool): Promise<MediaAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId]);
      return result.rows as MediaAttributes[];
    } catch (error) {
      this.logger.error('Error in findByUserId', { userId, error });
      throw error;
    }
  }

  /**
   * Find public media
   */
  async findPublic(limit: number = 20, offset: number = 0, client?: Pool): Promise<MediaAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE is_public = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [limit, offset]);
      return result.rows as MediaAttributes[];
    } catch (error) {
      this.logger.error('Error in findPublic', { limit, offset, error });
      throw error;
    }
  }
}

// Singleton instance
export const mediaRepository = new MediaRepository();

export class Media implements MediaAttributes {
  static scope(_undefined: undefined): import("../social/Comment").Comment {
      throw new Error('Method not implemented.');
  }
  static belongsTo(_Post: Post, _arg1: { foreignKey: string; as: string; }) {
      throw new Error('Method not implemented.');
  }
  id: string;
  userId: string;
  type: string;
  originalFilename: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailPath: string | null;
  processingStatus: string;
  processingJobId: string | null;
  metadata: MediaMetadata | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: MediaAttributes) {
    this.id = data.id;
    this.userId = data.userId;
    this.type = data.type;
    this.originalFilename = data.originalFilename;
    this.filename = data.filename;
    this.path = data.path;
    this.mimeType = data.mimeType;
    this.size = data.size;
    this.width = data.width;
    this.height = data.height;
    this.duration = data.duration;
    this.thumbnailPath = data.thumbnailPath;
    this.processingStatus = data.processingStatus;
    this.processingJobId = data.processingJobId;
    this.metadata = data.metadata;
    this.isPublic = data.isPublic;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Media | null> {
    const media = await mediaRepository.findById(id);
    return media ? new Media(media) : null;
  }

  static async findByUserId(userId: string): Promise<Media[]> {
    const mediaItems = await mediaRepository.findByUserId(userId);
    return mediaItems.map(media => new Media(media));
  }

  static async findPublic(limit?: number, offset?: number): Promise<Media[]> {
    const mediaItems = await mediaRepository.findPublic(limit, offset);
    return mediaItems.map(media => new Media(media));
  }

  static async create(data: Omit<MediaAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Media> {
    const {
      userId, originalFilename, thumbnailPath, processingStatus,
      processingJobId, isPublic, ...rest
    } = data;
    const media = await mediaRepository.create({
      ...rest,
      user_id: userId,
      original_filename: originalFilename,
      thumbnail_path: thumbnailPath,
      processing_status: processingStatus,
      processing_job_id: processingJobId,
      is_public: isPublic
    } as Partial<MediaAttributes>);
    return new Media(media);
  }

  // Instance methods
  async update(data: Partial<MediaAttributes>): Promise<Media> {
    const {
      userId, originalFilename, thumbnailPath, processingStatus,
      processingJobId, isPublic, ...rest
    } = data;
    const updateData = {
      ...rest,
      ...(userId !== undefined && { user_id: userId }),
      ...(originalFilename !== undefined && { original_filename: originalFilename }),
      ...(thumbnailPath !== undefined && { thumbnail_path: thumbnailPath }),
      ...(processingStatus !== undefined && { processing_status: processingStatus }),
      ...(processingJobId !== undefined && { processing_job_id: processingJobId }),
      ...(isPublic !== undefined && { is_public: isPublic })
    };
    const updated = await mediaRepository.update(this.id, updateData as Partial<MediaAttributes>);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return mediaRepository.delete(this.id);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Media; 