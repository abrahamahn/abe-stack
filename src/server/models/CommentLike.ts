import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

export interface CommentLikeAttributes extends BaseModel {
  userId: string;
  commentId: string;
}

export class CommentLikeRepository extends BaseRepository<CommentLikeAttributes> {
  protected tableName = 'comment_likes';
  protected columns = [
    'id',
    'user_id as userId',
    'comment_id as commentId',
    'created_at as createdAt'
  ];

  /**
   * Find a like by user and comment
   */
  async findByUserAndComment(userId: string, commentId: string, client?: Pool): Promise<CommentLikeAttributes | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1 AND comment_id = $2
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, commentId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error in findByUserAndComment', { userId, commentId, error });
      throw error;
    }
  }
}

// Singleton instance
export const commentLikeRepository = new CommentLikeRepository();

export class CommentLike implements CommentLikeAttributes {
  id: string;
  userId: string;
  commentId: string;
  createdAt: Date;

  constructor(data: CommentLikeAttributes) {
    this.id = data.id;
    this.userId = data.userId;
    this.commentId = data.commentId;
    this.createdAt = new Date(data.createdAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<CommentLike | null> {
    const commentLike = await commentLikeRepository.findById(id);
    return commentLike ? new CommentLike(commentLike) : null;
  }

  static async findByUserAndComment(userId: string, commentId: string): Promise<CommentLike | null> {
    const commentLike = await commentLikeRepository.findByUserAndComment(userId, commentId);
    return commentLike ? new CommentLike(commentLike) : null;
  }

  static async create(data: Omit<CommentLikeAttributes, 'id' | 'createdAt'>): Promise<CommentLike> {
    const { userId, commentId } = data;
    const commentLike = await commentLikeRepository.create({
      user_id: userId,
      comment_id: commentId
    } as any);
    return new CommentLike(commentLike);
  }

  async delete(): Promise<boolean> {
    return commentLikeRepository.delete(this.id);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString()
    };
  }
}

export default CommentLike; 