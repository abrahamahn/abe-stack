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

export interface PostJSON extends Omit<Post, 'moderatedAt' | 'createdAt' | 'updatedAt'> {
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
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

  async find(options: { 
    limit?: number;
    offset?: number;
    filters?: {
      userId?: string;
      status?: string;
    }
  } = {}): Promise<PostAttributes[]> {
    const { limit = 50, offset = 0, filters = {} } = options;
    const conditions = [];
    const params = [];

    if (filters.userId) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(filters.userId);
    }

    if (filters.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} 
      OFFSET $${params.length + 2}
    `;

    try {
      const result = await DatabaseConnectionManager.getPool().query(query, [...params, limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in find', { options, error });
      throw error;
    }
  }

  async countLastWeek(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;

    try {
      const result = await DatabaseConnectionManager.getPool().query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Error in countLastWeek', { error });
      throw error;
    }
  }

  /**
   * Find posts by multiple user IDs
   */
  async findByUserIds(userIds: string[], options: { limit?: number; offset?: number } = {}): Promise<PostAttributes[]> {
    const { limit = 20, offset = 0 } = options;
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = ANY($1)
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await DatabaseConnectionManager.getPool().query(query, [userIds, limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByUserIds', { userIds, options, error });
      throw error;
    }
  }

  /**
   * Find posts with user data
   */
  async findWithUser(id: string, client?: Pool): Promise<(PostAttributes & { user: any }) | null> {
    const query = `
      SELECT 
        p.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', u.display_name,
          'profileImage', u.profile_image
        ) as user
      FROM 
        posts p
      LEFT JOIN 
        users u ON p.user_id = u.id
      WHERE 
        p.id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
      if (!result.rows[0]) return null;

      const row = result.rows[0];
      const post = {
        id: row.id,
        userId: row.user_id,
        content: row.content,
        media: row.media,
        likesCount: row.likes_count,
        commentsCount: row.comments_count,
        sharesCount: row.shares_count,
        status: row.status,
        moderationReason: row.moderation_reason,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: row.user
      };

      return post;
    } catch (error) {
      console.error('Error in findWithUser:', error);
      throw error;
    }
  }

  /**
   * Find posts with comments
   */
  async findWithComments(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(PostAttributes & { comments: any[] }) | null> {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'userId', c.user_id,
              'postId', c.post_id,
              'parentId', c.parent_id,
              'content', c.content,
              'likesCount', c.likes_count,
              'status', c.status,
              'createdAt', c.created_at,
              'updatedAt', c.updated_at,
              'user', json_build_object(
                'id', u.id,
                'username', u.username,
                'displayName', u.display_name,
                'profileImage', u.profile_image
              )
            ) ORDER BY c.created_at DESC
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) as comments
      FROM 
        posts p
      LEFT JOIN 
        comments c ON p.id = c.post_id
      LEFT JOIN
        users u ON c.user_id = u.id
      WHERE 
        p.id = $1
      GROUP BY 
        p.id
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id, limit, offset]);
      if (!result.rows[0]) return null;

      const post = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        content: result.rows[0].content,
        media: result.rows[0].media,
        likesCount: result.rows[0].likes_count,
        commentsCount: result.rows[0].comments_count,
        sharesCount: result.rows[0].shares_count,
        status: result.rows[0].status,
        moderationReason: result.rows[0].moderation_reason,
        moderatedBy: result.rows[0].moderated_by,
        moderatedAt: result.rows[0].moderated_at,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        comments: result.rows[0].comments || []
      };

      return post;
    } catch (error) {
      console.error('Error in findWithComments:', error);
      throw error;
    }
  }

  /**
   * Find posts with likes
   */
  async findWithLikes(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(PostAttributes & { likes: any[] }) | null> {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', l.id,
              'userId', l.user_id,
              'postId', l.post_id,
              'createdAt', l.created_at,
              'updatedAt', l.updated_at,
              'user', json_build_object(
                'id', u.id,
                'username', u.username,
                'displayName', u.display_name,
                'profileImage', u.profile_image
              )
            ) ORDER BY l.created_at DESC
          ) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) as likes
      FROM 
        posts p
      LEFT JOIN 
        likes l ON p.id = l.post_id
      LEFT JOIN
        users u ON l.user_id = u.id
      WHERE 
        p.id = $1
      GROUP BY 
        p.id
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id, limit, offset]);
      if (!result.rows[0]) return null;

      const post = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        content: result.rows[0].content,
        media: result.rows[0].media,
        likesCount: result.rows[0].likes_count,
        commentsCount: result.rows[0].comments_count,
        sharesCount: result.rows[0].shares_count,
        status: result.rows[0].status,
        moderationReason: result.rows[0].moderation_reason,
        moderatedBy: result.rows[0].moderated_by,
        moderatedAt: result.rows[0].moderated_at,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        likes: result.rows[0].likes || []
      };

      return post;
    } catch (error) {
      console.error('Error in findWithLikes:', error);
      throw error;
    }
  }

  /**
   * Find complete post with all relationships
   */
  async findComplete(id: string, options: { 
    commentsLimit?: number, 
    commentsOffset?: number,
    likesLimit?: number,
    likesOffset?: number
  } = {}, client?: Pool): Promise<(PostAttributes & { user: any, comments: any[], likes: any[] }) | null> {
    const {
      commentsLimit = 20,
      commentsOffset = 0,
      likesLimit = 20,
      likesOffset = 0
    } = options;

    const query = `
      WITH post_data AS (
        SELECT 
          p.*,
          u.id as "user.id",
          u.username as "user.username",
          u.display_name as "user.displayName",
          u.profile_image as "user.profileImage"
        FROM ${this.tableName} p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      ),
      comment_data AS (
        SELECT 
          c.id,
          c.content,
          c.user_id,
          c.created_at,
          u.username,
          u.display_name,
          u.profile_image
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
      ),
      like_data AS (
        SELECT 
          l.id,
          l.user_id,
          l.created_at,
          u.username,
          u.display_name,
          u.profile_image
        FROM likes l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.post_id = $1
        ORDER BY l.created_at DESC
        LIMIT $4 OFFSET $5
      )
      SELECT 
        pd.*,
        json_agg(DISTINCT cd.*) FILTER (WHERE cd.id IS NOT NULL) as comments,
        json_agg(DISTINCT ld.*) FILTER (WHERE ld.id IS NOT NULL) as likes
      FROM post_data pd
      LEFT JOIN comment_data cd ON true
      LEFT JOIN like_data ld ON true
      GROUP BY 
        pd.id, pd.user_id, pd.content, pd.media, pd.likes_count,
        pd.comments_count, pd.shares_count, pd.status, pd.moderation_reason,
        pd.moderated_by, pd.moderated_at, pd.created_at, pd.updated_at,
        pd."user.id", pd."user.username", pd."user.displayName", pd."user.profileImage"
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool())
        .query(query, [id, commentsLimit, commentsOffset, likesLimit, likesOffset]);
      
      if (!result.rows[0]) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        content: row.content,
        media: row.media,
        likesCount: row.likes_count,
        commentsCount: row.comments_count,
        sharesCount: row.shares_count,
        status: row.status,
        moderationReason: row.moderation_reason,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          id: row['user.id'],
          username: row['user.username'],
          displayName: row['user.displayName'],
          profileImage: row['user.profileImage']
        },
        comments: row.comments || [],
        likes: row.likes || []
      } as any;
    } catch (error) {
      this.logger.error('Error in findComplete', { id, options, error });
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

  toJSON(): PostJSON {
    return {
      ...this,
      moderatedAt: this.moderatedAt?.toISOString() || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  static async findByUserIds(userIds: string[], options: { limit?: number; offset?: number } = {}): Promise<Post[]> {
    const posts = await postRepository.findByUserIds(userIds, options);
    return posts.map(post => new Post(post));
  }
}

export default Post; 