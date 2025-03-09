import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';
import { User } from './User';
import { Track } from './Track';
import { PlaylistTrack } from './PlaylistTrack';

export interface PlaylistAttributes extends BaseModel {
  name: string;
  description: string | null;
  coverArtUrl: string | null;
  isPublic: boolean;
  trackCount: number;
  followersCount: number;
  userId: string;
}

export class PlaylistRepository extends BaseRepository<PlaylistAttributes> {
  protected tableName = 'playlists';
  protected columns = [
    'id',
    'name',
    'description',
    'cover_art_url as coverArtUrl',
    'is_public as isPublic',
    'track_count as trackCount',
    'followers_count as followersCount',
    'user_id as userId',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find playlists by user ID
   */
  async findByUserId(userId: string, client?: Pool): Promise<PlaylistAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY name ASC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByUserId', { userId, error });
      throw error;
    }
  }

  /**
   * Find public playlists
   */
  async findPublic(limit: number = 20, offset: number = 0, client?: Pool): Promise<PlaylistAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE is_public = true
      ORDER BY followers_count DESC, name ASC
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
   * Increment track count
   */
  async incrementTrackCount(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET track_count = track_count + 1
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementTrackCount', { id, error });
      throw error;
    }
  }

  /**
   * Decrement track count
   */
  async decrementTrackCount(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET track_count = GREATEST(track_count - 1, 0)
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in decrementTrackCount', { id, error });
      throw error;
    }
  }

  /**
   * Increment followers count
   */
  async incrementFollowersCount(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET followers_count = followers_count + 1
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementFollowersCount', { id, error });
      throw error;
    }
  }

  /**
   * Decrement followers count
   */
  async decrementFollowersCount(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET followers_count = GREATEST(followers_count - 1, 0)
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in decrementFollowersCount', { id, error });
      throw error;
    }
  }
}

// Singleton instance
export const playlistRepository = new PlaylistRepository();

export class Playlist implements PlaylistAttributes {
  id: string;
  name: string;
  description: string | null;
  coverArtUrl: string | null;
  isPublic: boolean;
  trackCount: number;
  followersCount: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PlaylistAttributes) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.coverArtUrl = data.coverArtUrl;
    this.isPublic = data.isPublic;
    this.trackCount = data.trackCount;
    this.followersCount = data.followersCount;
    this.userId = data.userId;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Playlist | null> {
    const playlist = await playlistRepository.findById(id);
    return playlist ? new Playlist(playlist) : null;
  }

  static async findByUserId(userId: string): Promise<Playlist[]> {
    const playlists = await playlistRepository.findByUserId(userId);
    return playlists.map(playlist => new Playlist(playlist));
  }

  static async findPublic(limit?: number, offset?: number): Promise<Playlist[]> {
    const playlists = await playlistRepository.findPublic(limit, offset);
    return playlists.map(playlist => new Playlist(playlist));
  }

  static async create(data: Omit<PlaylistAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Playlist> {
    const {
      coverArtUrl, isPublic, trackCount, followersCount, userId,
      ...rest
    } = data;
    const playlist = await playlistRepository.create({
      ...rest,
      cover_art_url: coverArtUrl,
      is_public: isPublic,
      track_count: trackCount,
      followers_count: followersCount,
      user_id: userId
    } as any);
    return new Playlist(playlist);
  }

  // Instance methods
  async update(data: Partial<PlaylistAttributes>): Promise<Playlist> {
    const {
      coverArtUrl, isPublic, trackCount, followersCount, userId,
      ...rest
    } = data;
    const updateData = {
      ...rest,
      ...(coverArtUrl !== undefined && { cover_art_url: coverArtUrl }),
      ...(isPublic !== undefined && { is_public: isPublic }),
      ...(trackCount !== undefined && { track_count: trackCount }),
      ...(followersCount !== undefined && { followers_count: followersCount }),
      ...(userId !== undefined && { user_id: userId })
    };
    const updated = await playlistRepository.update(this.id, updateData as any);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return playlistRepository.delete(this.id);
  }

  async incrementTrackCount(): Promise<void> {
    await playlistRepository.incrementTrackCount(this.id);
    this.trackCount++;
  }

  async decrementTrackCount(): Promise<void> {
    await playlistRepository.decrementTrackCount(this.id);
    this.trackCount = Math.max(0, this.trackCount - 1);
  }

  async incrementFollowersCount(): Promise<void> {
    await playlistRepository.incrementFollowersCount(this.id);
    this.followersCount++;
  }

  async decrementFollowersCount(): Promise<void> {
    await playlistRepository.decrementFollowersCount(this.id);
    this.followersCount = Math.max(0, this.followersCount - 1);
  }

  async getUser(): Promise<User | null> {
    return User.findByPk(this.userId);
  }

  async getTracks(): Promise<Track[]> {
    const playlistTracks = await PlaylistTrack.findByPlaylistId(this.id);
    const trackIds = playlistTracks.map(pt => pt.trackId);
    const tracks = await Promise.all(trackIds.map(id => Track.findByPk(id)));
    return tracks.filter((track): track is Track => track !== null);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Playlist; 