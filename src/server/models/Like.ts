import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

export interface LikeAttributes extends BaseModel {
  userId: string;
  postId: string;
}

export class LikeRepository extends BaseRepository<LikeAttributes> {
  protected tableName = 'likes';
  protected columns = [
    'id',
    'user_id as userId',
    'post_id as postId',
    'created_at as createdAt'
  ];

  /**
   * Find a like by user and post
   */
  async findByUserAndPost(userId: string, postId: string, client?: Pool): Promise<LikeAttributes | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1 AND post_id = $2
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, postId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error in findByUserAndPost', { userId, postId, error });
      throw error;
    }
  }
}

// Singleton instance
export const likeRepository = new LikeRepository();

export class Like implements LikeAttributes {
  id: string;
  userId: string;
  postId: string;
  createdAt: Date;

  constructor(data: LikeAttributes) {
    this.id = data.id;
    this.userId = data.userId;
    this.postId = data.postId;
    this.createdAt = new Date(data.createdAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Like | null> {
    const like = await likeRepository.findById(id);
    return like ? new Like(like) : null;
  }

  static async findByUserAndPost(userId: string, postId: string): Promise<Like | null> {
    const like = await likeRepository.findByUserAndPost(userId, postId);
    return like ? new Like(like) : null;
  }

  static async create(data: Omit<LikeAttributes, 'id' | 'createdAt'>): Promise<Like> {
    const { userId, postId } = data;
    const like = await likeRepository.create({
      user_id: userId,
      post_id: postId
    } as any);
    return new Like(like);
  }

  async delete(): Promise<boolean> {
    return likeRepository.delete(this.id);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString()
    };
  }
}

export default Like; 