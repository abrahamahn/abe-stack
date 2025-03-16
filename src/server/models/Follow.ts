import { Pool } from 'pg';

import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

interface UserData {
  id: string;
  username: string;
  displayName: string;
  profileImage: string | null;
}

interface FollowWithData extends FollowAttributes {
  follower: UserData;
}

interface FollowWithFollowed extends FollowAttributes {
  followed: UserData;
}

interface MutualFollower extends UserData {
  id: string;
  username: string;
  displayName: string;
  profileImage: string | null;
}

export interface FollowAttributes extends BaseModel {
  followerId: string;
  followingId: string;
}

export class FollowRepository extends BaseRepository<FollowAttributes> {
  protected tableName = 'follows';
  protected columns = [
    'id',
    'follower_id as followerId',
    'following_id as followingId',
    'created_at as createdAt'
  ];

  /**
   * Find a follow relationship by follower and following IDs
   */
  async findByFollowerAndFollowing(followerId: string, followingId: string, client?: Pool): Promise<FollowAttributes | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE follower_id = $1 AND following_id = $2
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [followerId, followingId]);
      return (result.rows[0] || null) as FollowAttributes | null;
    } catch (error) {
      this.logger.error('Error in findByFollowerAndFollowing', { followerId, followingId, error });
      throw error;
    }
  }

  /**
   * Find all users that a user is following
   */
  async findFollowing(followerId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<FollowAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE follower_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [followerId, limit, offset]);
      return result.rows as FollowAttributes[];
    } catch (error) {
      this.logger.error('Error in findFollowing', { followerId, limit, offset, error });
      throw error;
    }
  }

  /**
   * Find all followers of a user
   */
  async findFollowers(followingId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<FollowAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE following_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [followingId, limit, offset]);
      return result.rows as FollowAttributes[];
    } catch (error) {
      this.logger.error('Error in findFollowers', { followingId, limit, offset, error });
      throw error;
    }
  }

  /**
   * Find follow with follower data
   */
  async findWithFollower(id: string, client?: Pool): Promise<FollowWithData | null> {
    const query = `
      SELECT 
        f.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', u.display_name,
          'profileImage', u.profile_image
        ) as follower
      FROM 
        follows f
      LEFT JOIN 
        users u ON f.follower_id = u.id
      WHERE 
        f.id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
      if (!result.rows[0]) return null;

      const row = result.rows[0] as {
        id: string;
        follower_id: string;
        following_id: string;
        created_at: Date;
        updated_at: Date;
        follower: UserData;
      };
      return {
        id: row.id,
        followerId: row.follower_id,
        followingId: row.following_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        follower: row.follower
      };
    } catch (error) {
      console.error('Error in findWithFollower:', error);
      throw error;
    }
  }

  /**
   * Find follow with followed user data
   */
  async findWithFollowed(id: string, client?: Pool): Promise<FollowWithFollowed | null> {
    const query = `
      SELECT 
        f.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', u.display_name,
          'profileImage', u.profile_image
        ) as followed
      FROM 
        follows f
      LEFT JOIN 
        users u ON f.following_id = u.id
      WHERE 
        f.id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
      if (!result.rows[0]) return null;

      const row = result.rows[0] as {
        id: string;
        follower_id: string;
        following_id: string;
        created_at: Date;
        updated_at: Date;
        followed: UserData;
      };
      return {
        id: row.id,
        followerId: row.follower_id,
        followingId: row.following_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        followed: row.followed
      };
    } catch (error) {
      console.error('Error in findWithFollowed:', error);
      throw error;
    }
  }

  /**
   * Find followers of a user with user data
   */
  async findFollowersWithData(userId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<FollowWithData[]> {
    const query = `
      SELECT 
        f.*,
        u.id as "follower.id",
        u.username as "follower.username",
        u.display_name as "follower.displayName",
        u.profile_image as "follower.profileImage"
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.follower_id = u.id
      WHERE f.followed_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, limit, offset]);
      return result.rows.map((row: {
        'follower.id': string;
        'follower.username': string;
        'follower.displayName': string;
        'follower.profileImage': string | null;
      } & FollowAttributes) => ({
        ...row,
        follower: {
          id: row['follower.id'],
          username: row['follower.username'],
          displayName: row['follower.displayName'],
          profileImage: row['follower.profileImage']
        }
      })) as FollowWithData[];
    } catch (error) {
      this.logger.error('Error in findFollowersWithData', { userId, limit, offset, error });
      throw error;
    }
  }

  /**
   * Find users followed by a user with user data
   */
  async findFollowingWithData(userId: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<FollowWithFollowed[]> {
    const query = `
      SELECT 
        f.*,
        u.id as "followed.id",
        u.username as "followed.username",
        u.display_name as "followed.displayName",
        u.profile_image as "followed.profileImage"
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.followed_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId, limit, offset]);
      return result.rows.map((row: {
        'followed.id': string;
        'followed.username': string;
        'followed.displayName': string;
        'followed.profileImage': string | null;
      } & FollowAttributes) => ({
        ...row,
        followed: {
          id: row['followed.id'],
          username: row['followed.username'],
          displayName: row['followed.displayName'],
          profileImage: row['followed.profileImage']
        }
      })) as FollowWithFollowed[];
    } catch (error) {
      this.logger.error('Error in findFollowingWithData', { userId, limit, offset, error });
      throw error;
    }
  }

  /**
   * Check if a user follows another user
   */
  async isFollowing(followerId: string, followedId: string, client?: Pool): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM ${this.tableName}
        WHERE follower_id = $1 AND followed_id = $2
      ) as is_following
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [followerId, followedId]);
      const row = result.rows[0] as { is_following: boolean };
      return row.is_following;
    } catch (error) {
      this.logger.error('Error in isFollowing', { followerId, followedId, error });
      throw error;
    }
  }

  /**
   * Get mutual followers between two users
   */
  async findMutualFollowers(userId1: string, userId2: string, limit: number = 20, offset: number = 0, client?: Pool): Promise<MutualFollower[]> {
    const query = `
      WITH mutual_followers AS (
        SELECT DISTINCT f1.follower_id
        FROM ${this.tableName} f1
        JOIN ${this.tableName} f2 ON f1.follower_id = f2.follower_id
        WHERE f1.followed_id = $1 AND f2.followed_id = $2
      )
      SELECT 
        u.id,
        u.username,
        u.display_name as "displayName",
        u.profile_image as "profileImage"
      FROM mutual_followers mf
      JOIN users u ON mf.follower_id = u.id
      ORDER BY u.username
      LIMIT $3 OFFSET $4
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId1, userId2, limit, offset]);
      return result.rows as MutualFollower[];
    } catch (error) {
      this.logger.error('Error in findMutualFollowers', { userId1, userId2, limit, offset, error });
      throw error;
    }
  }
}

// Singleton instance
export const followRepository = new FollowRepository();

export class Follow implements FollowAttributes {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: FollowAttributes) {
    this.id = data.id;
    this.followerId = data.followerId;
    this.followingId = data.followingId;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Follow | null> {
    const follow = await followRepository.findById(id);
    return follow ? new Follow(follow) : null;
  }

  static async findByFollowerAndFollowing(followerId: string, followingId: string): Promise<Follow | null> {
    const follow = await followRepository.findByFollowerAndFollowing(followerId, followingId);
    return follow ? new Follow(follow) : null;
  }

  static async findFollowing(followerId: string, limit?: number, offset?: number): Promise<Follow[]> {
    const follows = await followRepository.findFollowing(followerId, limit, offset);
    return follows.map(follow => new Follow(follow));
  }

  static async findFollowers(followingId: string, limit?: number, offset?: number): Promise<Follow[]> {
    const follows = await followRepository.findFollowers(followingId, limit, offset);
    return follows.map(follow => new Follow(follow));
  }

  static async create(data: Omit<FollowAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Follow> {
    const { followerId, followingId } = data;
    const follow = await followRepository.create({
      follower_id: followerId,
      following_id: followingId
    } as Partial<FollowAttributes>);
    return new Follow(follow);
  }

  async delete(): Promise<boolean> {
    return followRepository.delete(this.id);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Follow; 