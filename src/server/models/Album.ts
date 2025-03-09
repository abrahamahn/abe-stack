import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';
import { Artist } from './Artist';
import { Track } from './Track';

export interface AlbumAttributes extends BaseModel {
  title: string;
  coverArtUrl: string | null;
  releaseDate: Date | null;
  genre: string | null;
  isPublic: boolean;
  trackCount: number;
  artistId: string;
}

export class AlbumRepository extends BaseRepository<AlbumAttributes> {
  protected tableName = 'albums';
  protected columns = [
    'id',
    'title',
    'cover_art_url as coverArtUrl',
    'release_date as releaseDate',
    'genre',
    'is_public as isPublic',
    'track_count as trackCount',
    'artist_id as artistId',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find albums by artist ID
   */
  async findByArtistId(artistId: string, client?: Pool): Promise<AlbumAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE artist_id = $1
      ORDER BY release_date DESC NULLS LAST
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
   * Find public albums by genre
   */
  async findByGenre(genre: string, client?: Pool): Promise<AlbumAttributes[]> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE genre = $1 AND is_public = true
      ORDER BY release_date DESC NULLS LAST
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
}

// Singleton instance
export const albumRepository = new AlbumRepository();

export class Album implements AlbumAttributes {
  id: string;
  title: string;
  coverArtUrl: string | null;
  releaseDate: Date | null;
  genre: string | null;
  isPublic: boolean;
  trackCount: number;
  artistId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: AlbumAttributes) {
    this.id = data.id;
    this.title = data.title;
    this.coverArtUrl = data.coverArtUrl;
    this.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;
    this.genre = data.genre;
    this.isPublic = data.isPublic;
    this.trackCount = data.trackCount;
    this.artistId = data.artistId;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Album | null> {
    const album = await albumRepository.findById(id);
    return album ? new Album(album) : null;
  }

  static async findByArtistId(artistId: string): Promise<Album[]> {
    const albums = await albumRepository.findByArtistId(artistId);
    return albums.map(album => new Album(album));
  }

  static async findByGenre(genre: string): Promise<Album[]> {
    const albums = await albumRepository.findByGenre(genre);
    return albums.map(album => new Album(album));
  }

  static async create(data: Omit<AlbumAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<Album> {
    const { coverArtUrl, releaseDate, isPublic, trackCount, artistId, ...rest } = data;
    const album = await albumRepository.create({
      ...rest,
      cover_art_url: coverArtUrl,
      release_date: releaseDate,
      is_public: isPublic,
      track_count: trackCount,
      artist_id: artistId
    } as any);
    return new Album(album);
  }

  // Instance methods
  async update(data: Partial<AlbumAttributes>): Promise<Album> {
    const { coverArtUrl, releaseDate, isPublic, trackCount, artistId, ...rest } = data;
    const updateData = {
      ...rest,
      ...(coverArtUrl !== undefined && { cover_art_url: coverArtUrl }),
      ...(releaseDate !== undefined && { release_date: releaseDate }),
      ...(isPublic !== undefined && { is_public: isPublic }),
      ...(trackCount !== undefined && { track_count: trackCount }),
      ...(artistId !== undefined && { artist_id: artistId })
    };
    const updated = await albumRepository.update(this.id, updateData as any);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return albumRepository.delete(this.id);
  }

  async incrementTrackCount(): Promise<void> {
    await albumRepository.incrementTrackCount(this.id);
    this.trackCount++;
  }

  async decrementTrackCount(): Promise<void> {
    await albumRepository.decrementTrackCount(this.id);
    this.trackCount = Math.max(0, this.trackCount - 1);
  }

  async getArtist(): Promise<Artist | null> {
    return Artist.findByPk(this.artistId);
  }

  async getTracks(): Promise<Track[]> {
    return Track.findByAlbumId(this.id);
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

export default Album; 