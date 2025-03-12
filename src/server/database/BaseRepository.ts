import { Pool } from 'pg';
import { DatabaseConnectionManager } from './config';
import { Logger } from '../services/LoggerService';

export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class BaseRepository<T extends BaseModel> {
  protected abstract tableName: string;
  protected abstract columns: string[];
  protected logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Convert an object to SQL parameters for prepared statements
   */
  protected objectToParams(obj: Partial<T>, startIndex: number = 1): [string[], any[]] {
    const values: any[] = [];
    const placeholders: string[] = [];
    
    Object.entries(obj).forEach(([_key, value], index) => {
      if (value !== undefined) {
        values.push(value);
        placeholders.push(`$${startIndex + index}`);
      }
    });
    
    return [placeholders, values];
  }

  /**
   * Find a record by its ID
   */
  async findById(id: string, client?: Pool): Promise<T | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error in findById', { id, error });
      throw error;
    }
  }

  /**
   * Find all records matching the given criteria
   */
  async findAll(
    where: Partial<T> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      client?: Pool;
    } = {}
  ): Promise<T[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        conditions.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ${options.orderBy ? `ORDER BY ${options.orderBy}` : ''}
      ${options.limit ? `LIMIT $${paramIndex++}` : ''}
      ${options.offset ? `OFFSET $${paramIndex}` : ''}
    `;

    if (options.limit) values.push(options.limit);
    if (options.offset) values.push(options.offset);

    try {
      const result = await (options.client || DatabaseConnectionManager.getPool()).query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findAll', { where, options, error });
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, client?: Pool): Promise<T> {
    const [placeholders, values] = this.objectToParams(data);
    const columns = Object.keys(data).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders.join(', ')})
      RETURNING ${this.columns.join(', ')}
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error in create', { data, error });
      throw error;
    }
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: Partial<T>, client?: Pool): Promise<T> {
    const [placeholders, values] = this.objectToParams(data);
    const setClause = Object.keys(data)
      .map((key, index) => `${key} = ${placeholders[index]}`)
      .join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING ${this.columns.join(', ')}
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [...values, id]);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error in update', { id, data, error });
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string, client?: Pool): Promise<boolean> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
      RETURNING id
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [id]);
      return result.rowCount != null && result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error in delete', { id, error });
      throw error;
    }
  }

  /**
   * Count records matching the given criteria
   */
  async count(where: Partial<T> = {}, client?: Pool): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        conditions.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Error in count', { where, error });
      throw error;
    }
  }
} 