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

export interface CommentJSON extends Omit<Comment, 'moderatedAt' | 'createdAt' | 'updatedAt'> {
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
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

  protected async query(sql: string, params: any[] = []): Promise<any> {
    return (await DatabaseConnectionManager.getPool()).query(sql, params);
  }

  /**
   * Find comments by post ID
   */
  async findByPostId(options: {
    postId: string;
    parentId?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<CommentAttributes[]> {
    const { postId, parentId = null, limit = 20, offset = 0 } = options;
    const params = [postId];
    let query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE post_id = $1
    `;

    if (parentId !== undefined) {
      query += ` AND parent_id ${parentId === null ? 'IS NULL' : '= $2'}`;
      if (parentId !== null) {
        params.push(parentId);
      }
    }

    query += `
      ORDER BY created_at ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit.toString(), offset.toString());

    try {
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByPostId', { options, error });
      throw error;
    }
  }

  /**
   * Find replies to a comment
   */
  async findReplies(parentId: string): Promise<CommentAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE parent_id = $1
      ORDER BY created_at ASC
    `;

    try {
      const result = await this.query(query, [parentId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findReplies', { parentId, error });
      throw error;
    }
  }

  /**
   * Increment likes count
   */
  async incrementLikes(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET likes_count = likes_count + 1
      WHERE id = $1
    `;

    try {
      await this.query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementLikes', { id, error });
      throw error;
    }
  }

  /**
   * Decrement likes count
   */
  async decrementLikes(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = $1
    `;

    try {
      await this.query(query, [id]);
    } catch (error) {
      this.logger.error('Error in decrementLikes', { id, error });
      throw error;
    }
  }

  /**
   * Find comment with user data
   */
  async findWithUser(id: string): Promise<(CommentAttributes & { user: any }) | null> {
    const query = `
      SELECT 
        c.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', u.display_name,
          'profileImage', u.profile_image
        ) as user
      FROM 
        comments c
      LEFT JOIN 
        users u ON c.user_id = u.id
      WHERE 
        c.id = $1
    `;

    try {
      const result = await this.query(query, [id]);
      if (!result.rows[0]) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        postId: row.post_id,
        parentId: row.parent_id,
        content: row.content,
        likesCount: row.likes_count,
        status: row.status,
        moderationReason: row.moderation_reason,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: row.user
      };
    } catch (error) {
      console.error('Error in findWithUser:', error);
      throw error;
    }
  }

  /**
   * Find comment with likes
   */
  async findWithLikes(id: string, limit: number = 20, offset: number = 0): Promise<(CommentAttributes & { likes: any[] }) | null> {
    const query = `
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cl.id,
              'userId', cl.user_id,
              'commentId', cl.comment_id,
              'createdAt', cl.created_at,
              'updatedAt', cl.updated_at,
              'user', json_build_object(
                'id', u.id,
                'username', u.username,
                'displayName', u.display_name,
                'profileImage', u.profile_image
              )
            ) ORDER BY cl.created_at DESC
          ) FILTER (WHERE cl.id IS NOT NULL), '[]'
        ) as likes
      FROM 
        comments c
      LEFT JOIN 
        comment_likes cl ON c.id = cl.comment_id
      LEFT JOIN
        users u ON cl.user_id = u.id
      WHERE 
        c.id = $1
      GROUP BY 
        c.id
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.query(query, [id, limit, offset]);
      if (!result.rows[0]) return null;

      return {
        ...result.rows[0],
        userId: result.rows[0].user_id,
        postId: result.rows[0].post_id,
        parentId: result.rows[0].parent_id,
        likesCount: result.rows[0].likes_count,
        moderationReason: result.rows[0].moderation_reason,
        moderatedBy: result.rows[0].moderated_by,
        moderatedAt: result.rows[0].moderated_at,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        likes: result.rows[0].likes || []
      };
    } catch (error) {
      console.error('Error in findWithLikes:', error);
      throw error;
    }
  }

  /**
   * Find complete comment with all relationships
   */
  async findComplete(id: string, options: {
    likesLimit?: number;
    likesOffset?: number;
  } = {}, client?: Pool): Promise<(CommentAttributes & { user: any, likes: any[] }) | null> {
    const {
      likesLimit = 20,
      likesOffset = 0
    } = options;

    const query = `
      WITH comment_data AS (
        SELECT 
          c.*,
          u.id as "user.id",
          u.username as "user.username",
          u.display_name as "user.displayName",
          u.profile_image as "user.profileImage"
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
      ),
      like_data AS (
        SELECT 
          l.id,
          l.user_id,
          l.created_at,
          u.username,
          u.display_name as displayName,
          u.profile_image as profileImage
        FROM comment_likes l
        JOIN users u ON l.user_id = u.id
        WHERE l.comment_id = $1
        ORDER BY l.created_at DESC
        LIMIT $2 OFFSET $3
      )
      SELECT 
        cd.*,
        json_agg(ld.*) FILTER (WHERE ld.id IS NOT NULL) as likes
      FROM comment_data cd
      LEFT JOIN like_data ld ON true
      GROUP BY 
        cd.id, cd.user_id, cd.post_id, cd.content,
        cd.likes_count, cd.created_at, cd.updated_at,
        cd."user.id", cd."user.username", cd."user.displayName", cd."user.profileImage"
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool())
        .query(query, [id, likesLimit, likesOffset]);
      
      if (!result.rows[0]) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        postId: row.post_id,
        content: row.content,
        likesCount: row.likes_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          id: row['user.id'],
          username: row['user.username'],
          displayName: row['user.displayName'],
          profileImage: row['user.profileImage']
        },
        likes: row.likes || []
      } as any;
    } catch (error) {
      this.logger.error('Error in findComplete', { id, options, error });
      throw error;
    }
  }

  /**
   * Find comments by post ID with user data
   */
  async findByPostIdWithUser(postId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(CommentAttributes & { user: any })[]> {
    const query = `
      SELECT 
        c.*,
        u.id as "user.id",
        u.username as "user.username",
        u.display_name as "user.displayName",
        u.profile_image as "user.profileImage"
      FROM ${this.tableName} c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [postId, limit, offset]);
      return result.rows.map(row => ({
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

  static async findByPostId(options: {
    postId: string;
    parentId?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<Comment[]> {
    const comments = await commentRepository.findByPostId(options);
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

  toJSON(): CommentJSON {
    return {
      ...this,
      moderatedAt: this.moderatedAt?.toISOString() || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Comment; 