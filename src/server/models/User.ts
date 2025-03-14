// src/server/models/User.ts
import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';
import bcrypt from 'bcrypt';

// Mock in-memory storage for development without PostgreSQL
const mockUsers: Map<string, any> = new Map();

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
  posts?: any[];
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

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
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

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
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
    } as any, client);
  }

  async countByRole(): Promise<Record<string, number>> {
    const query = `
      SELECT role, COUNT(*) as count
      FROM ${this.tableName}
      GROUP BY role
    `;

    try {
      const result = await DatabaseConnectionManager.getPool().query(query);
      return result.rows.reduce((acc: { [key: string]: number }, row: { count: string; role: string }) => {
        acc[row.role] = parseInt(row.count);
        return acc;
      }, {});
    } catch (error) {
      this.logger.error('Error in countByRole', { error });
      throw error;
    }
  }

  /**
   * Find user with their posts
   */
  async findWithPosts(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(UserAttributes & { posts: any[] }) | null> {
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

      return {
        ...result.rows[0],
        posts: result.rows[0].posts || []
      };
    } catch (error) {
      console.error('Error in findWithPosts:', error);
      throw error;
    }
  }

  /**
   * Find user with their followers
   */
  async findWithFollowers(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(UserAttributes & { followers: any[] }) | null> {
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

      return {
        ...result.rows[0],
        followers: result.rows[0].followers || []
      };
    } catch (error) {
      console.error('Error in findWithFollowers:', error);
      throw error;
    }
  }

  /**
   * Find user with their following
   */
  async findWithFollowing(id: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<(UserAttributes & { following: any[] }) | null> {
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

      return {
        ...result.rows[0],
        following: result.rows[0].following || []
      };
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
  } = {}, client?: Pool): Promise<(UserAttributes & { posts: any[], followers: any[], following: any[] }) | null> {
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

      return {
        ...result.rows[0],
        posts: result.rows[0].posts || [],
        followers: result.rows[0].followers || [],
        following: result.rows[0].following || []
      };
    } catch (error) {
      this.logger.error('Error in findComplete', { id, options, error });
      throw error;
    }
  }
}

// Singleton instance
export const userRepository = new UserRepository();

// Mock implementation for development without PostgreSQL
class User implements UserAttributes {
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
          ) RETURNING 
            id, 
            username, 
            email, 
            password, 
            display_name as "displayName", 
            first_name as "firstName", 
            last_name as "lastName", 
            bio, 
            profile_image as "profileImage", 
            banner_image as "bannerImage", 
            role, 
            is_verified as "isVerified", 
            email_confirmed as "emailConfirmed", 
            email_token as "emailToken", 
            email_token_expire as "emailTokenExpire", 
            last_email_sent as "lastEmailSent", 
            created_at as "createdAt", 
            updated_at as "updatedAt"
        `;
        
        const values = [
          data.username,
          data.email,
          data.password,
          data.displayName,
          data.firstName,
          data.lastName,
          data.bio || '',
          data.profileImage || '',
          data.bannerImage || '',
          data.role || 'user',
          data.isVerified || false,
          data.emailConfirmed || false,
          data.emailToken,
          data.emailTokenExpire,
          data.lastEmailSent
        ];
        
        const result = await pool.query(query, values);
        
        if (result.rows.length > 0) {
          console.log('User created in PostgreSQL database:', result.rows[0].id);
          return new User(result.rows[0]);
        }
      }
      
      // Fall back to mock implementation if database insertion failed
      console.warn('Falling back to mock user creation');
      const user = new User(data);
      mockUsers.set(user.id, user);
      mockUsers.set(user.email, user); // Index by email for findByEmail
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      // Mock implementation as fallback
      const user = new User(data);
      mockUsers.set(user.id, user);
      mockUsers.set(user.email, user); // Index by email for findByEmail
      return user;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      // Try to use real database first
      if (DatabaseConnectionManager.isConnected()) {
        const pool = DatabaseConnectionManager.getPool();
        const query = `
          SELECT 
            id, 
            username, 
            email, 
            password, 
            display_name as "displayName", 
            first_name as "firstName", 
            last_name as "lastName", 
            bio, 
            profile_image as "profileImage", 
            banner_image as "bannerImage", 
            role, 
            is_verified as "isVerified", 
            email_confirmed as "emailConfirmed", 
            email_token as "emailToken", 
            email_token_expire as "emailTokenExpire", 
            last_email_sent as "lastEmailSent", 
            created_at as "createdAt", 
            updated_at as "updatedAt"
          FROM users 
          WHERE email = $1
        `;
        
        const result = await pool.query(query, [email]);
        
        if (result.rows.length > 0) {
          return new User(result.rows[0]);
        }
      }
      
      // Mock implementation as fallback
      const user = mockUsers.get(email);
      return user || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      // Mock implementation as fallback
      const user = mockUsers.get(email);
      return user || null;
    }
  }

  static async findByUsername(username: string): Promise<User | null> {
    try {
      // Try to use real database first
      if (DatabaseConnectionManager.isConnected()) {
        const pool = DatabaseConnectionManager.getPool();
        const query = `
          SELECT 
            id, 
            username, 
            email, 
            password, 
            display_name as "displayName", 
            first_name as "firstName", 
            last_name as "lastName", 
            bio, 
            profile_image as "profileImage", 
            banner_image as "bannerImage", 
            role, 
            is_verified as "isVerified", 
            email_confirmed as "emailConfirmed", 
            email_token as "emailToken", 
            email_token_expire as "emailTokenExpire", 
            last_email_sent as "lastEmailSent", 
            created_at as "createdAt", 
            updated_at as "updatedAt"
          FROM users 
          WHERE username = $1
        `;
        
        const result = await pool.query(query, [username]);
        
        if (result.rows.length > 0) {
          return new User(result.rows[0]);
        }
      }
      
      // Mock implementation as fallback
      // Search through all users to find by username
      for (const user of mockUsers.values()) {
        if (user.username === username) {
          return user;
        }
      }
      return null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      // Mock implementation as fallback
      for (const user of mockUsers.values()) {
        if (user.username === username) {
          return user;
        }
      }
      return null;
    }
  }

  static async findByPk(id: string): Promise<User | null> {
    try {
      // Try to use real database first
      if (DatabaseConnectionManager.isConnected()) {
        const pool = DatabaseConnectionManager.getPool();
        const query = `
          SELECT 
            id, 
            username, 
            email, 
            password, 
            display_name as "displayName", 
            first_name as "firstName", 
            last_name as "lastName", 
            bio, 
            profile_image as "profileImage", 
            banner_image as "bannerImage", 
            role, 
            is_verified as "isVerified", 
            email_confirmed as "emailConfirmed", 
            email_token as "emailToken", 
            email_token_expire as "emailTokenExpire", 
            last_email_sent as "lastEmailSent", 
            created_at as "createdAt", 
            updated_at as "updatedAt"
          FROM users 
          WHERE id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length > 0) {
          return new User(result.rows[0]);
        }
      }
      
      // Mock implementation as fallback
      const user = mockUsers.get(id);
      return user || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      // Mock implementation as fallback
      const user = mockUsers.get(id);
      return user || null;
    }
  }

  // Instance methods
  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  async updatePassword(newPassword: string): Promise<void> {
    this.password = await bcrypt.hash(newPassword, 10);
    this.updatedAt = new Date();
    mockUsers.set(this.id, this);
    mockUsers.set(this.email, this);
  }

  async update(data: Partial<UserAttributes>): Promise<User> {
    Object.assign(this, data);
    this.updatedAt = new Date();
    mockUsers.set(this.id, this);
    mockUsers.set(this.email, this);
    return this;
  }

  async delete(): Promise<void> {
    mockUsers.delete(this.id);
    mockUsers.delete(this.email);
  }

  toJSON(): UserJSON {
    const { password, emailToken, emailTokenExpire, ...userJson } = this;
    return userJson as unknown as UserJSON;
  }
}

// Export the User class both as default and named export
export { User };
export default User;