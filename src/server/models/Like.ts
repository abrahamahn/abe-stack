import { Pool } from 'pg';

import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

interface UserData {
  id: string;
  username: string;
  displayName: string;
  profileImage: string | null;
}

interface PostData {
  id: string;
  content: string;
  media: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
}

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
      return (result.rows[0] || null) as LikeAttributes | null;
    } catch (error) {
      this.logger.error('Error in findByUserAndPost', { userId, postId, error });
      throw error;
    }
  }

  /**
   * Find likes by user and multiple posts
   */
  async findByUserAndPosts(userId: string, postIds: string[], client?: Pool): Promise<LikeAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1 AND post_id = ANY($2)
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, postIds]);
      return result.rows as LikeAttributes[];
    } catch (error) {
      this.logger.error('Error in findByUserAndPosts', { userId, postIds, error });
      throw error;
    }
  }

  /**
   * Find like with user data
   */
  async findWithUser(id: string, client?: Pool): Promise<(LikeAttributes & { user: UserData }) | null> {
    const query = `
      SELECT 
        l.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', u.display_name,
          'profileImage', u.profile_image
        ) as user
      FROM 
        likes l
      LEFT JOIN 
        users u ON l.user_id = u.id
      WHERE 
        l.id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
      if (!result.rows[0]) return null;

      const row = result.rows[0] as {
        id: string;
        user_id: string;
        post_id: string;
        created_at: Date;
        updated_at: Date;
        user: UserData;
      };
      return {
        id: row.id,
        userId: row.user_id,
        postId: row.post_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          id: row.user.id,
          username: row.user.username,
          displayName: row.user.displayName,
          profileImage: row.user.profileImage
        }
      };
    } catch (error) {
      console.error('Error in findWithUser:', error);
      throw error;
    }
  }

  /**
   * Find likes by post ID with user data
   */
  async findByPostIdWithUser(postId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(LikeAttributes & { user: UserData })[]> {
    const query = `
      SELECT 
        l.*,
        u.id as "user.id",
        u.username as "user.username",
        u.display_name as "user.displayName",
        u.profile_image as "user.profileImage"
      FROM ${this.tableName} l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.post_id = $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [postId, limit, offset]);
      return result.rows.map((row: {
        'user.id': string;
        'user.username': string;
        'user.displayName': string;
        'user.profileImage': string | null;
      } & LikeAttributes) => ({
        ...row,
        user: {
          id: row['user.id'],
          username: row['user.username'],
          displayName: row['user.displayName'],
          profileImage: row['user.profileImage']
        }
      }));
    } catch (error) {
      this.logger.error('Error in findByPostIdWithUser', { postId, limit, offset, error });
      throw error;
    }
  }

  /**
   * Find likes by user ID with post data
   */
  async findByUserIdWithPost(userId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(LikeAttributes & { post: PostData })[]> {
    const query = `
      SELECT 
        l.*,
        p.id as "post.id",
        p.content as "post.content",
        p.media as "post.media",
        p.likes_count as "post.likesCount",
        p.comments_count as "post.commentsCount",
        p.created_at as "post.createdAt"
      FROM ${this.tableName} l
      LEFT JOIN posts p ON l.post_id = p.id
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, limit, offset]);
      return result.rows.map((row: {
        'post.id': string;
        'post.content': string;
        'post.media': string | null;
        'post.likesCount': number;
        'post.commentsCount': number;
        'post.createdAt': Date;
      } & LikeAttributes  ) => ({
        ...row,
        post: {
          id: row['post.id'],
          content: row['post.content'],
          media: row['post.media'],
          likesCount: row['post.likesCount'],
          commentsCount: row['post.commentsCount'],
          createdAt: row['post.createdAt']
        }
      }));
    } catch (error) {
      this.logger.error('Error in findByUserIdWithPost', { userId, limit, offset, error });
      throw error;
    }
  }

  /**
   * Check if a user has liked a post
   */
  async hasUserLikedPost(userId: string, postId: string, client?: Pool): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM ${this.tableName}
        WHERE user_id = $1 AND post_id = $2
      ) as has_liked
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, postId]);
      const row = result.rows[0] as { has_liked: boolean };
      return row.has_liked;
    } catch (error) {
      this.logger.error('Error in hasUserLikedPost', { userId, postId, error });
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
  updatedAt: Date;

  constructor(data: LikeAttributes) {
    this.id = data.id;
    this.userId = data.userId;
    this.postId = data.postId;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
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

  static async findByUserAndPosts(userId: string, postIds: string[]): Promise<Like[]> {
    const likes = await likeRepository.findByUserAndPosts(userId, postIds);
    return likes.map(like => new Like(like));
  }

  static async create(data: Omit<LikeAttributes, 'id' | 'createdAt'>): Promise<Like> {
    const { userId, postId } = data;
    const like = await likeRepository.create({
      user_id: userId,
      post_id: postId
    } as Partial<LikeAttributes>);
    return new Like(like);
  }

  async delete(): Promise<boolean> {
    return likeRepository.delete(this.id);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Like; 