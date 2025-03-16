import { Pool } from 'pg';

import { DatabaseConnectionManager } from '../../../config/database';
import { BaseModel, BaseRepository } from '../../repositories/BaseRepository';
import { userRepository, UserAttributes } from '../auth/User';

import { Album } from './Album';

export interface ArtistAttributes extends BaseModel {
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  bannerImageUrl: string | null;
  verified: boolean;
  followersCount: number;
  userId: string | null;
}

export class ArtistRepository extends BaseRepository<ArtistAttributes> {
  protected tableName = 'artists';
  protected columns = [
    'id',
    'name',
    'bio',
    'profile_image_url as profileImageUrl',
    'banner_image_url as bannerImageUrl',
    'verified',
    'followers_count as followersCount',
    'user_id as userId',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find an artist by their user ID
   */
  async findByUserId(userId: string, client?: Pool): Promise<ArtistAttributes | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId]);
      return (result.rows[0] || null) as ArtistAttributes | null;
    } catch (error) {
      this.logger.error('Error in findByUserId', { userId, error });
      throw error;
    }
  }

  /**
   * Find artists by verification status
   */
  async findByVerified(verified: boolean, client?: Pool): Promise<ArtistAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE verified = $1
      ORDER BY name ASC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [verified]);
      return result.rows as ArtistAttributes[];
    } catch (error) {
      this.logger.error('Error in findByVerified', { verified, error });
      throw error;
    }
  }

  /**
   * Increment followers count
   */
  async incrementFollowers(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET followers_count = followers_count + 1
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementFollowers', { id, error });
      throw error;
    }
  }

  /**
   * Decrement followers count
   */
  async decrementFollowers(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET followers_count = GREATEST(followers_count - 1, 0)
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in decrementFollowers', { id, error });
      throw error;
    }
  }
}

// Singleton instance
export const artistRepository = new ArtistRepository();

export class Artist implements ArtistAttributes {
  static hasMany(_album: typeof Album, _options: { foreignKey: string; as: string; }) {
    throw new Error('Method not implemented.');
  }
  id: string;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  bannerImageUrl: string | null;
  verified: boolean;
  followersCount: number;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: ArtistAttributes) {
    this.id = data.id;
    this.name = data.name;
    this.bio = data.bio;
    this.profileImageUrl = data.profileImageUrl;
    this.bannerImageUrl = data.bannerImageUrl;
    this.verified = data.verified;
    this.followersCount = data.followersCount;
    this.userId = data.userId;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Artist | null> {
    const artist = await artistRepository.findById(id);
    return artist ? new Artist(artist) : null;
  }

  static async findByUserId(userId: string): Promise<Artist | null> {
    const artist = await artistRepository.findByUserId(userId);
    return artist ? new Artist(artist) : null;
  }

  static async findVerified(): Promise<Artist[]> {
    const artists = await artistRepository.findByVerified(true);
    return artists.map(artist => new Artist(artist));
  }

  static async create(data: Omit<ArtistAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Artist> {
    const { profileImageUrl, bannerImageUrl, followersCount, userId, ...rest } = data;
    const artist = await artistRepository.create({
      ...rest,
      profile_image_url: profileImageUrl,
      banner_image_url: bannerImageUrl,
      followers_count: followersCount,
      user_id: userId
    } as Partial<ArtistAttributes>);
    return new Artist(artist);
  }

  // Instance methods
  async update(data: Partial<ArtistAttributes>): Promise<Artist> {
    const { profileImageUrl, bannerImageUrl, followersCount, userId, ...rest } = data;
    const updateData = {
      ...rest,
      ...(profileImageUrl !== undefined && { profile_image_url: profileImageUrl }),
      ...(bannerImageUrl !== undefined && { banner_image_url: bannerImageUrl }),
      ...(followersCount !== undefined && { followers_count: followersCount }),
      ...(userId !== undefined && { user_id: userId })
    };
    const updated = await artistRepository.update(this.id, updateData as Partial<ArtistAttributes>);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return artistRepository.delete(this.id);
  }

  async incrementFollowers(): Promise<void> {
    await artistRepository.incrementFollowers(this.id);
    this.followersCount++;
  }

  async decrementFollowers(): Promise<void> {
    await artistRepository.decrementFollowers(this.id);
    this.followersCount = Math.max(0, this.followersCount - 1);
  }

  async getUser(): Promise<UserAttributes | null> {
    if (!this.userId) return null;
    return await userRepository.findById(this.userId);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Artist; 