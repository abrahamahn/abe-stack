import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';
import { Artist } from './Artist';
import { Album } from './Album';

export interface TrackAttributes extends BaseModel {
  title: string;
  duration: number;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  coverArtUrl: string | null;
  releaseDate: Date | null;
  genre: string | null;
  isPublic: boolean;
  playCount: number;
  artistId: string;
  albumId: string | null;
}

export class TrackRepository extends BaseRepository<TrackAttributes> {
  protected tableName = 'tracks';
  protected columns = [
    'id',
    'title',
    'duration',
    'file_url as fileUrl',
    'file_size as fileSize',
    'file_type as fileType',
    'cover_art_url as coverArtUrl',
    'release_date as releaseDate',
    'genre',
    'is_public as isPublic',
    'play_count as playCount',
    'artist_id as artistId',
    'album_id as albumId',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find tracks by artist ID
   */
  async findByArtistId(artistId: string, client?: Pool): Promise<TrackAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE artist_id = $1
      ORDER BY release_date DESC NULLS LAST, title ASC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [artistId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByArtistId', { artistId, error });
      throw error;
    }
  }

  /**
   * Find tracks by album ID
   */
  async findByAlbumId(albumId: string, client?: Pool): Promise<TrackAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE album_id = $1
      ORDER BY title ASC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [albumId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByAlbumId', { albumId, error });
      throw error;
    }
  }

  /**
   * Find public tracks by genre
   */
  async findByGenre(genre: string, client?: Pool): Promise<TrackAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE genre = $1 AND is_public = true
      ORDER BY release_date DESC NULLS LAST, play_count DESC
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [genre]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findByGenre', { genre, error });
      throw error;
    }
  }

  /**
   * Find top tracks by play count
   */
  async findTopTracks(limit: number = 10, client?: Pool): Promise<TrackAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE is_public = true
      ORDER BY play_count DESC
      LIMIT $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [limit]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findTopTracks', { limit, error });
      throw error;
    }
  }

  /**
   * Increment play count
   */
  async incrementPlayCount(id: string, client?: Pool): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET play_count = play_count + 1
      WHERE id = $1
    `;

    try {
      await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
    } catch (error) {
      this.logger.error('Error in incrementPlayCount', { id, error });
      throw error;
    }
  }
}

// Singleton instance
export const trackRepository = new TrackRepository();

export class Track implements TrackAttributes {
  id: string;
  title: string;
  duration: number;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  coverArtUrl: string | null;
  releaseDate: Date | null;
  genre: string | null;
  isPublic: boolean;
  playCount: number;
  artistId: string;
  albumId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: TrackAttributes) {
    this.id = data.id;
    this.title = data.title;
    this.duration = data.duration;
    this.fileUrl = data.fileUrl;
    this.fileSize = data.fileSize;
    this.fileType = data.fileType;
    this.coverArtUrl = data.coverArtUrl;
    this.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;
    this.genre = data.genre;
    this.isPublic = data.isPublic;
    this.playCount = data.playCount;
    this.artistId = data.artistId;
    this.albumId = data.albumId;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Track | null> {
    const track = await trackRepository.findById(id);
    return track ? new Track(track) : null;
  }

  static async findByArtistId(artistId: string): Promise<Track[]> {
    const tracks = await trackRepository.findByArtistId(artistId);
    return tracks.map(track => new Track(track));
  }

  static async findByAlbumId(albumId: string): Promise<Track[]> {
    const tracks = await trackRepository.findByAlbumId(albumId);
    return tracks.map(track => new Track(track));
  }

  static async findByGenre(genre: string): Promise<Track[]> {
    const tracks = await trackRepository.findByGenre(genre);
    return tracks.map(track => new Track(track));
  }

  static async findTopTracks(limit?: number): Promise<Track[]> {
    const tracks = await trackRepository.findTopTracks(limit);
    return tracks.map(track => new Track(track));
  }

  static async create(data: Omit<TrackAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Track> {
    const {
      fileUrl, fileSize, fileType, coverArtUrl, releaseDate,
      isPublic, playCount, artistId, albumId,
      ...rest
    } = data;
    const track = await trackRepository.create({
      ...rest,
      file_url: fileUrl,
      file_size: fileSize,
      file_type: fileType,
      cover_art_url: coverArtUrl,
      release_date: releaseDate,
      is_public: isPublic,
      play_count: playCount,
      artist_id: artistId,
      album_id: albumId
    } as any);
    return new Track(track);
  }

  // Instance methods
  async update(data: Partial<TrackAttributes>): Promise<Track> {
    const {
      fileUrl, fileSize, fileType, coverArtUrl, releaseDate,
      isPublic, playCount, artistId, albumId,
      ...rest
    } = data;
    const updateData = {
      ...rest,
      ...(fileUrl !== undefined && { file_url: fileUrl }),
      ...(fileSize !== undefined && { file_size: fileSize }),
      ...(fileType !== undefined && { file_type: fileType }),
      ...(coverArtUrl !== undefined && { cover_art_url: coverArtUrl }),
      ...(releaseDate !== undefined && { release_date: releaseDate }),
      ...(isPublic !== undefined && { is_public: isPublic }),
      ...(playCount !== undefined && { play_count: playCount }),
      ...(artistId !== undefined && { artist_id: artistId }),
      ...(albumId !== undefined && { album_id: albumId })
    };
    const updated = await trackRepository.update(this.id, updateData as any);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return trackRepository.delete(this.id);
  }

  async incrementPlayCount(): Promise<void> {
    await trackRepository.incrementPlayCount(this.id);
    this.playCount++;
  }

  async getArtist(): Promise<Artist | null> {
    return Artist.findByPk(this.artistId);
  }

  async getAlbum(): Promise<Album | null> {
    if (!this.albumId) return null;
    return Album.findByPk(this.albumId);
  }

  toJSON() {
    return {
      ...this,
      releaseDate: this.releaseDate?.toISOString() || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default Track; 