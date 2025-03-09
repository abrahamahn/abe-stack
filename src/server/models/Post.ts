import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

export interface PostAttributes extends BaseModel {
  userId: string;
  content: string;
  media: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  status: string;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: Date | null;
}

export class PostRepository extends BaseRepository<PostAttributes> {
  protected tableName = 'posts';
  protected columns = [
    'id',
    'user_id as userId',
    'content',
    'media',
    'likes_count as likesCount',
    'comments_count as commentsCount',
    'shares_count as sharesCount',
    'status',
    'moderation_reason as moderationReason',
    'moderated_by as moderatedBy',
    'moderated_at as moderatedAt',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find posts by user ID
   */
  async findByUserId(userId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<PostAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByUserId', { userId, limit, offset, error });
      throw error;
    }
  }

  /**
   * Find public posts
   */
  async findPublic(limit: number = 20, offset: number = 0, client?: Pool): Promise<PostAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findPublic', { limit, offset, error });
      throw error;
    }
  }

  /**
   * Increment likes count
   */
  async incrementLikes(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET likes_count = likes_count + 1
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementLikes', { id, error });
      throw error;
    }
  }

  /**
   * Decrement likes count
   */
  async decrementLikes(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in decrementLikes', { id, error });
      throw error;
    }
  }

  /**
   * Increment comments count
   */
  async incrementComments(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET comments_count = comments_count + 1
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementComments', { id, error });
      throw error;
    }
  }

  /**
   * Decrement comments count
   */
  async decrementComments(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET comments_count = GREATEST(comments_count - 1, 0)
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in decrementComments', { id, error });
      throw error;
    }
  }

  /**
   * Increment shares count
   */
  async incrementShares(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET shares_count = shares_count + 1
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementShares', { id, error });
      throw error;
    }
  }
}

// Singleton instance
export const postRepository = new PostRepository();

export class Post implements PostAttributes {
  id: string;
  userId: string;
  content: string;
  media: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  status: string;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PostAttributes) {
    this.id = data.id;
    this.userId = data.userId;
    this.content = data.content;
    this.media = data.media;
    this.likesCount = data.likesCount;
    this.commentsCount = data.commentsCount;
    this.sharesCount = data.sharesCount;
    this.status = data.status;
    this.moderationReason = data.moderationReason;
    this.moderatedBy = data.moderatedBy;
    this.moderatedAt = data.moderatedAt ? new Date(data.moderatedAt) : null;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Post | null> {
    const post = await postRepository.findById(id);
    return post ? new Post(post) : null;
  }

  static async findByUserId(userId: string, limit?: number, offset?: number): Promise<Post[]> {
    const posts = await postRepository.findByUserId(userId, limit, offset);
    return posts.map(post => new Post(post));
  }

  static async findPublic(limit?: number, offset?: number): Promise<Post[]> {
    const posts = await postRepository.findPublic(limit, offset);
    return posts.map(post => new Post(post));
  }

  static async create(data: Omit<PostAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post> {
    const {
      userId, moderationReason, moderatedBy,
      moderatedAt, ...rest
    } = data;
    const post = await postRepository.create({
      ...rest,
      user_id: userId,
      moderation_reason: moderationReason,
      moderated_by: moderatedBy,
      moderated_at: moderatedAt
    } as any);
    return new Post(post);
  }

  // Instance methods
  async update(data: Partial<PostAttributes>): Promise<Post> {
    const {
      userId, moderationReason, moderatedBy,
      moderatedAt, ...rest
    } = data;
    const updateData = {
      ...rest,
      ...(userId !== undefined && { user_id: userId }),
      ...(moderationReason !== undefined && { moderation_reason: moderationReason }),
      ...(moderatedBy !== undefined && { moderated_by: moderatedBy }),
      ...(moderatedAt !== undefined && { moderated_at: moderatedAt })
    };
    const updated = await postRepository.update(this.id, updateData as any);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return postRepository.delete(this.id);
  }

  async incrementLikes(): Promise<void> {
    await postRepository.incrementLikes(this.id);
    this.likesCount++;
  }

  async decrementLikes(): Promise<void> {
    await postRepository.decrementLikes(this.id);
    this.likesCount = Math.max(0, this.likesCount - 1);
  }

  async incrementComments(): Promise<void> {
    await postRepository.incrementComments(this.id);
    this.commentsCount++;
  }

  async decrementComments(): Promise<void> {
    await postRepository.decrementComments(this.id);
    this.commentsCount = Math.max(0, this.commentsCount - 1);
  }

  async incrementShares(): Promise<void> {
    await postRepository.incrementShares(this.id);
    this.sharesCount++;
  }

  toJSON() {
    return {
      ...this,
      moderatedAt: this.moderatedAt?.toISOString() || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Post; 