import { Pool } from 'pg';

import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

import { Playlist } from './Playlist';
import { Track } from './Track';
import { userRepository, UserAttributes } from './User';

export interface PlaylistTrackAttributes extends BaseModel {
  playlistId: string;
  trackId: string;
  orderPosition: number;
  addedBy: string;
}

export class PlaylistTrackRepository extends BaseRepository<PlaylistTrackAttributes> {
  protected tableName = 'playlist_tracks';
  protected columns = [
    'id',
    'playlist_id as playlistId',
    'track_id as trackId',
    'order_position as orderPosition',
    'added_by as addedBy',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find tracks in a playlist
   */
  async findByPlaylistId(playlistId: string, client?: Pool): Promise<PlaylistTrackAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE playlist_id = $1
      ORDER BY order_position ASC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [playlistId]);
      return result.rows as PlaylistTrackAttributes[];
    } catch (error) {
      this.logger.error('Error in findByPlaylistId', { playlistId, error });
      throw error;
    }
  }

  /**
   * Find playlists containing a track
   */
  async findByTrackId(trackId: string, client?: Pool): Promise<PlaylistTrackAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE track_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [trackId]);
      return result.rows as PlaylistTrackAttributes[];
    } catch (error) {
      this.logger.error('Error in findByTrackId', { trackId, error });
      throw error;
    }
  }

  /**
   * Get the next order position for a playlist
   */
  async getNextOrderPosition(playlistId: string, client?: Pool): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(order_position), 0) + 1 as next_position
      FROM ${this.tableName}
      WHERE playlist_id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [playlistId]);
      const row = result.rows[0] as { next_position: number };
      return row.next_position;
    } catch (error) {
      this.logger.error('Error in getNextOrderPosition', { playlistId, error });
      throw error;
    }
  }

  /**
   * Reorder tracks in a playlist
   */
  async reorder(playlistId: string, trackId: string, newPosition: number, client?: Pool): Promise<void> {
    const pool = client || DatabaseConnectionManager.getPool();
    const transaction = await pool.connect();

    try {
      await transaction.query('BEGIN');

      // Get current position
      const currentQuery = `
        SELECT order_position
        FROM ${this.tableName}
        WHERE playlist_id = $1 AND track_id = $2
      `;
      const currentResult = await transaction.query(currentQuery, [playlistId, trackId]);
      const row = currentResult.rows[0] as { order_position: number } | undefined;
      const currentPosition = row?.order_position;

      if (currentPosition === undefined) {
        throw new Error('Track not found in playlist');
      }

      if (currentPosition < newPosition) {
        // Moving down: shift tracks up
        await transaction.query(`
          UPDATE ${this.tableName}
          SET order_position = order_position - 1
          WHERE playlist_id = $1
            AND order_position > $2
            AND order_position <= $3
        `, [playlistId, currentPosition, newPosition]);
      } else if (currentPosition > newPosition) {
        // Moving up: shift tracks down
        await transaction.query(`
          UPDATE ${this.tableName}
          SET order_position = order_position + 1
          WHERE playlist_id = $1
            AND order_position >= $2
            AND order_position < $3
        `, [playlistId, newPosition, currentPosition]);
      }

      // Update track position
      await transaction.query(`
        UPDATE ${this.tableName}
        SET order_position = $3
        WHERE playlist_id = $1 AND track_id = $2
      `, [playlistId, trackId, newPosition]);

      await transaction.query('COMMIT');
    } catch (error) {
      await transaction.query('ROLLBACK');
      this.logger.error('Error in reorder', { playlistId, trackId, newPosition, error });
      throw error;
    } finally {
      transaction.release();
    }
  }
}

// Singleton instance
export const playlistTrackRepository = new PlaylistTrackRepository();

export class PlaylistTrack implements PlaylistTrackAttributes {
  id: string;
  playlistId: string;
  trackId: string;
  orderPosition: number;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PlaylistTrackAttributes) {
    this.id = data.id;
    this.playlistId = data.playlistId;
    this.trackId = data.trackId;
    this.orderPosition = data.orderPosition;
    this.addedBy = data.addedBy;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<PlaylistTrack | null> {
    const playlistTrack = await playlistTrackRepository.findById(id);
    return playlistTrack ? new PlaylistTrack(playlistTrack) : null;
  }

  static async findByPlaylistId(playlistId: string): Promise<PlaylistTrack[]> {
    const playlistTracks = await playlistTrackRepository.findByPlaylistId(playlistId);
    return playlistTracks.map(pt => new PlaylistTrack(pt));
  }

  static async findByTrackId(trackId: string): Promise<PlaylistTrack[]> {
    const playlistTracks = await playlistTrackRepository.findByTrackId(trackId);
    return playlistTracks.map(pt => new PlaylistTrack(pt));
  }

  static async create(data: Omit<PlaylistTrackAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlaylistTrack> {
    const { playlistId, trackId, orderPosition, addedBy } = data;
    const nextPosition = orderPosition ?? await playlistTrackRepository.getNextOrderPosition(playlistId);
    
    const playlistTrack = await playlistTrackRepository.create({
      playlist_id: playlistId,
      track_id: trackId,
      order_position: nextPosition,
      added_by: addedBy
    } as Partial<PlaylistTrackAttributes>);
    return new PlaylistTrack(playlistTrack);
  }

  // Instance methods
  async update(data: Partial<PlaylistTrackAttributes>): Promise<PlaylistTrack> {
    const { playlistId, trackId, orderPosition, addedBy, ...rest } = data;
    const updateData = {
      ...rest,
      ...(playlistId !== undefined && { playlist_id: playlistId }),
      ...(trackId !== undefined && { track_id: trackId }),
      ...(orderPosition !== undefined && { order_position: orderPosition }),
      ...(addedBy !== undefined && { added_by: addedBy })
    };
    const updated = await playlistTrackRepository.update(this.id, updateData as Partial<PlaylistTrackAttributes>);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return playlistTrackRepository.delete(this.id);
  }

  async reorder(newPosition: number): Promise<void> {
    await playlistTrackRepository.reorder(this.playlistId, this.trackId, newPosition);
    this.orderPosition = newPosition;
  }

  async getPlaylist(): Promise<Playlist | null> {
    return Playlist.findByPk(this.playlistId);
  }

  async getTrack(): Promise<Track | null> {
    return Track.findByPk(this.trackId);
  }

  async getAddedByUser(): Promise<UserAttributes | null> {
    return await userRepository.findById(this.addedBy);
  }

  toJSON() {
    return {
      ...this,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default PlaylistTrack; 