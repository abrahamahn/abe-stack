// src/server/models/User.ts
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

// Mock in-memory storage for development without PostgreSQL
const mockUsers: Map<string, UserAttributes> = new Map();

export interface UserAttributes extends BaseModel {
  username: string;
  email: string;
  password: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
  emailConfirmed: boolean;
  emailToken: string | null;
  emailTokenExpire: Date | null;
  lastEmailSent: Date | null;
}

export interface UserJSON extends Omit<User, 'password' | 'update' | 'delete' | 'comparePassword' | 'updatePassword' | 'toJSON' | 'emailToken' | 'emailTokenExpire'> {
  posts?: UserAttributes[];
  isFollowing?: boolean;
}

export class UserRepository extends BaseRepository<UserAttributes> {
  protected tableName = 'users';
  protected columns = [
    'id',
    'username',
    'email',
    'password',
    'display_name as displayName',
    'first_name as firstName',
    'last_name as lastName',
    'bio',
    'profile_image as profileImage',
    'banner_image as bannerImage',
    'role',
    'is_verified as isVerified',
    'email_confirmed as emailConfirmed',
    'email_token as emailToken',
    'email_token_expire as emailTokenExpire',
    'last_email_sent as lastEmailSent',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find a user by their email
   */
  async findByEmail(email: string, client?: Pool): Promise<UserAttributes | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE email = $1
    `;

    const result = await (client || DatabaseConnectionManager.getPool()).query(query, [email]);
    return (result.rows[0] || null) as UserAttributes | null;
  }

  /**
   * Find a user by their username
   */
  async findByUsername(username: string, client?: Pool): Promise<UserAttributes | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE username = $1
    `;

    const result = await (client || DatabaseConnectionManager.getPool()).query(query, [username]);
    return (result.rows[0] || null) as UserAttributes | null;
  }

  /**
   * Create a new user with a hashed password
   */
  async createWithHashedPassword(data: Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt'>, client?: Pool): Promise<UserAttributes> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const { displayName, firstName, lastName, profileImage, bannerImage, isVerified, ...rest } = data;
    return this.create({
      ...rest,
      password: hashedPassword,
      display_name: displayName,
      first_name: firstName,
      last_name: lastName,
      profile_image: profileImage,
      banner_image: bannerImage,
      is_verified: isVerified
    } as Partial<UserAttributes>, client);
  }

  async countByRole(): Promise<Record<string, number>> {
    const query = `
      SELECT role, COUNT(*) as count
      FROM ${this.tableName}
      GROUP BY role
    `;

    try {
      const result = await DatabaseConnectionManager.getPool().query(query);
      const roleCount: Record<string, number> = {};
      
      for (const row of result.rows as { role: string; count: string }[]) {
        roleCount[row.role] = parseInt(row.count);
      }
      
      return roleCount;
    } catch (error) {
      this.logger.error('Error in countByRole', { error });
      throw error;
    }
  }

  /**
   * Find user with their posts
   */
  async findWithPosts(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(UserAttributes & { posts: UserAttributes[] }) | null> {
    const query = `
      SELECT 
        u.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'userId', p.user_id,
              'content', p.content,
              'media', p.media,
              'likesCount', p.likes_count,
              'commentsCount', p.comments_count,
              'sharesCount', p.shares_count,
              'status', p.status,
              'moderationReason', p.moderation_reason,
              'moderatedBy', p.moderated_by,
              'moderatedAt', p.moderated_at,
              'createdAt', p.created_at,
              'updatedAt', p.updated_at
            )
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as posts
      FROM 
        users u
      LEFT JOIN 
        posts p ON u.id = p.user_id
      WHERE 
        u.id = $1
      GROUP BY 
        u.id
      LIMIT $2 OFFSET $3;
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id, limit, offset]);
      if (!result.rows[0]) return null;

      const row = result.rows[0] as {
        posts: UserAttributes[];
      } & Omit<UserAttributes, 'posts'>;
      return {
        ...row,
        posts: row.posts || []
      } as (UserAttributes & { posts: UserAttributes[] }) | null;
    } catch (error) {
      console.error('Error in findWithPosts:', error);
      throw error;
    }
  }

  /**
   * Find user with their followers
   */
  async findWithFollowers(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(UserAttributes & { followers: UserAttributes[] }) | null> {
    const query = `
      SELECT 
        u.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', f.id,
              'followerId', f.follower_id,
              'followingId', f.following_id,
              'createdAt', f.created_at,
              'updatedAt', f.updated_at,
              'follower', json_build_object(
                'id', fu.id,
                'username', fu.username,
                'displayName', fu.display_name,
                'profileImage', fu.profile_image
              )
            )
          ) FILTER (WHERE f.id IS NOT NULL), '[]'
        ) as followers
      FROM 
        users u
      LEFT JOIN 
        follows f ON u.id = f.following_id
      LEFT JOIN
        users fu ON f.follower_id = fu.id
      WHERE 
        u.id = $1
      GROUP BY 
        u.id
      LIMIT $2 OFFSET $3;
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id, limit, offset]);
      if (!result.rows[0]) return null;

      const row = result.rows[0] as { followers: UserAttributes[] } & Omit<UserAttributes, 'followers'>;
      return {
        ...row,
        followers: row.followers || []
      } as (UserAttributes & { followers: UserAttributes[] });
    } catch (error) {
      console.error('Error in findWithFollowers:', error);
      throw error;
    }
  }

  /**
   * Find user with their following
   */
  async findWithFollowing(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(UserAttributes & { following: UserAttributes[] }) | null> {
    const query = `
      SELECT 
        u.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', f.id,
              'followerId', f.follower_id,
              'followingId', f.following_id,
              'createdAt', f.created_at,
              'updatedAt', f.updated_at,
              'following', json_build_object(
                'id', fu.id,
                'username', fu.username,
                'displayName', fu.display_name,
                'profileImage', fu.profile_image
              )
            )
          ) FILTER (WHERE f.id IS NOT NULL), '[]'
        ) as following
      FROM 
        users u
      LEFT JOIN 
        follows f ON u.id = f.follower_id
      LEFT JOIN
        users fu ON f.following_id = fu.id
      WHERE 
        u.id = $1
      GROUP BY 
        u.id
      LIMIT $2 OFFSET $3;
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id, limit, offset]);
      if (!result.rows[0]) return null;

      const row = result.rows[0] as {
        following: UserAttributes[];
      } & Omit<UserAttributes, 'following'>;
      return {
        ...row,
        following: row.following || []
      } as (UserAttributes & { following: UserAttributes[] });
    } catch (error) {
      console.error('Error in findWithFollowing:', error);
      throw error;
    }
  }

  /**
   * Find complete user profile with all relationships
   */
  async findComplete(id: string, options: {
    postsLimit?: number;
    postsOffset?: number;
    followersLimit?: number;
    followersOffset?: number;
    followingLimit?: number;
    followingOffset?: number;
  } = {}, client?: Pool): Promise<(UserAttributes & { posts: UserAttributes[], followers: UserAttributes[], following: UserAttributes[] }) | null> {
    const {
      postsLimit = 20,
      postsOffset = 0,
      followersLimit = 20,
      followersOffset = 0,
      followingLimit = 20,
      followingOffset = 0
    } = options;

    const query = `
      WITH user_data AS (
        SELECT ${this.columns.join(', ')}
        FROM ${this.tableName}
        WHERE id = $1
      ),
      post_data AS (
        SELECT 
          p.id,
          p.content,
          p.media,
          p.likes_count,
          p.comments_count,
          p.shares_count,
          p.status,
          p.created_at,
          p.updated_at
        FROM posts p
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      ),
      follower_data AS (
        SELECT 
          u.id,
          u.username,
          u.display_name as displayName,
          u.profile_image as profileImage,
          f.created_at as followedAt
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.followed_id = $1
        ORDER BY f.created_at DESC
        LIMIT $4 OFFSET $5
      ),
      following_data AS (
        SELECT 
          u.id,
          u.username,
          u.display_name as displayName,
          u.profile_image as profileImage,
          f.created_at as followedAt
        FROM follows f
        JOIN users u ON f.followed_id = u.id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
        LIMIT $6 OFFSET $7
      )
      SELECT 
        ud.*,
        json_agg(DISTINCT pd.*) FILTER (WHERE pd.id IS NOT NULL) as posts,
        json_agg(DISTINCT frd.*) FILTER (WHERE frd.id IS NOT NULL) as followers,
        json_agg(DISTINCT fgd.*) FILTER (WHERE fgd.id IS NOT NULL) as following
      FROM user_data ud
      LEFT JOIN post_data pd ON true
      LEFT JOIN follower_data frd ON true
      LEFT JOIN following_data fgd ON true
      GROUP BY ${this.columns.map(c => 'ud.' + c.split(' ')[0]).join(', ')}
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool())
        .query(query, [id, postsLimit, postsOffset, followersLimit, followersOffset, followingLimit, followingOffset]);
      
      if (!result.rows[0]) return null;

      const row = result.rows[0] as { posts: UserAttributes[], followers: UserAttributes[], following: UserAttributes[] } & Omit<UserAttributes, 'posts' | 'followers' | 'following'>;
      return {
        ...row,
        posts: row.posts || [],
        followers: row.followers || [],
        following: row.following || []
      } as (UserAttributes & { posts: UserAttributes[], followers: UserAttributes[], following: UserAttributes[] });
    } catch (error) {
      this.logger.error('Error in findComplete', { id, options, error });
      throw error;
    }
  }
}

// Singleton instance
export const userRepository = new UserRepository();

// Mock implementation for development without PostgreSQL
export class User implements UserAttributes {
  id: string;
  username: string;
  email: string;
  password: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
  emailConfirmed: boolean;
  emailToken: string | null;
  emailTokenExpire: Date | null;
  lastEmailSent: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<UserAttributes>) {
    this.id = data.id || crypto.randomUUID();
    this.username = data.username || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.displayName = data.displayName || null;
    this.firstName = data.firstName || null;
    this.lastName = data.lastName || null;
    this.bio = data.bio || null;
    this.profileImage = data.profileImage || null;
    this.bannerImage = data.bannerImage || null;
    this.role = data.role || 'user';
    this.isVerified = data.isVerified || false;
    this.emailConfirmed = data.emailConfirmed || false;
    this.emailToken = data.emailToken || null;
    this.emailTokenExpire = data.emailTokenExpire || null;
    this.lastEmailSent = data.lastEmailSent || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Static methods for mock database operations
  static async create(data: Partial<UserAttributes>): Promise<User> {
    try {
      // Try to use real database first
      if (DatabaseConnectionManager.isConnected()) {
        // Real database implementation
        const pool = DatabaseConnectionManager.getPool();
        
        // Convert camelCase to snake_case for database columns
        const query = `
          INSERT INTO users (
            username, 
            email, 
            password, 
            display_name, 
            first_name, 
            last_name, 
            bio, 
            profile_image, 
            banner_image, 
            role, 
            is_verified, 
            email_confirmed, 
            email_token, 
            email_token_expire, 
            last_email_sent
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          ) RETURNING *
        `;
        
        const result = await pool.query(query, [
          data.username,
          data.email,
          data.password,
          data.displayName,
          data.firstName,
          data.lastName,
          data.bio,
          data.profileImage,
          data.bannerImage,
          data.role,
          data.isVerified,
          data.emailConfirmed,
          data.emailToken,
          data.emailTokenExpire,
          data.lastEmailSent
        ]);
        
        return new User(result.rows[0] as UserAttributes);
      } else {
        // Mock implementation
        const user = new User(data);
        mockUsers.set(user.id, user);
        return user;
      }
    } catch (error) {
      console.error('Error in User.create', { error });
      throw error;
    }
  }

  // Static methods that use the repository
  static async findByEmail(email: string): Promise<User | null> {
    const user = await userRepository.findByEmail(email);
    return user ? new User(user) : null;
  }

  static async findByPk(id: string): Promise<User | null> {
    const user = await userRepository.findById(id);
    return user ? new User(user) : null;
  }

  static async findAll(): Promise<User[]> {
    const users = await userRepository.findAll();
    return users.map(user => new User(user));
  }
}