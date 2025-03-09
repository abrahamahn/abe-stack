import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

export interface CommentAttributes extends BaseModel {
  userId: string;
  postId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  status: string;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: Date | null;
}

export class CommentRepository extends BaseRepository<CommentAttributes> {
  protected tableName = 'comments';
  protected columns = [
    'id',
    'user_id as userId',
    'post_id as postId',
    'parent_id as parentId',
    'content',
    'likes_count as likesCount',
    'status',
    'moderation_reason as moderationReason',
    'moderated_by as moderatedBy',
    'moderated_at as moderatedAt',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find comments by post ID
   */
  async findByPostId(postId: string, client?: Pool): Promise<CommentAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE post_id = $1
      ORDER BY created_at ASC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [postId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByPostId', { postId, error });
      throw error;
    }
  }

  /**
   * Find replies to a comment
   */
  async findReplies(parentId: string, client?: Pool): Promise<CommentAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE parent_id = $1
      ORDER BY created_at ASC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [parentId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findReplies', { parentId, error });
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
}

// Singleton instance
export const commentRepository = new CommentRepository();

export class Comment implements CommentAttributes {
  id: string;
  userId: string;
  postId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  status: string;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: CommentAttributes) {
    this.id = data.id;
    this.userId = data.userId;
    this.postId = data.postId;
    this.parentId = data.parentId;
    this.content = data.content;
    this.likesCount = data.likesCount;
    this.status = data.status;
    this.moderationReason = data.moderationReason;
    this.moderatedBy = data.moderatedBy;
    this.moderatedAt = data.moderatedAt ? new Date(data.moderatedAt) : null;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Comment | null> {
    const comment = await commentRepository.findById(id);
    return comment ? new Comment(comment) : null;
  }

  static async findByPostId(postId: string): Promise<Comment[]> {
    const comments = await commentRepository.findByPostId(postId);
    return comments.map(comment => new Comment(comment));
  }

  static async findReplies(parentId: string): Promise<Comment[]> {
    const replies = await commentRepository.findReplies(parentId);
    return replies.map(reply => new Comment(reply));
  }

  static async create(data: Omit<CommentAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    const {
      userId, postId, parentId, moderationReason,
      moderatedBy, moderatedAt, ...rest
    } = data;
    const comment = await commentRepository.create({
      ...rest,
      user_id: userId,
      post_id: postId,
      parent_id: parentId,
      moderation_reason: moderationReason,
      moderated_by: moderatedBy,
      moderated_at: moderatedAt
    } as any);
    return new Comment(comment);
  }

  // Instance methods
  async update(data: Partial<CommentAttributes>): Promise<Comment> {
    const {
      userId, postId, parentId, moderationReason,
      moderatedBy, moderatedAt, ...rest
    } = data;
    const updateData = {
      ...rest,
      ...(userId !== undefined && { user_id: userId }),
      ...(postId !== undefined && { post_id: postId }),
      ...(parentId !== undefined && { parent_id: parentId }),
      ...(moderationReason !== undefined && { moderation_reason: moderationReason }),
      ...(moderatedBy !== undefined && { moderated_by: moderatedBy }),
      ...(moderatedAt !== undefined && { moderated_at: moderatedAt })
    };
    const updated = await commentRepository.update(this.id, updateData as any);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return commentRepository.delete(this.id);
  }

  async incrementLikes(): Promise<void> {
    await commentRepository.incrementLikes(this.id);
    this.likesCount++;
  }

  async decrementLikes(): Promise<void> {
    await commentRepository.decrementLikes(this.id);
    this.likesCount = Math.max(0, this.likesCount - 1);
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

export default Comment; 