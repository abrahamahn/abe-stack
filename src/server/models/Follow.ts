import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

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
      return result.rows[0] || null;
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
      return result.rows;
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
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findFollowers', { followingId, limit, offset, error });
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
    } as any);
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