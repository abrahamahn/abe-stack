import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';

// Two-factor authentication status
export enum TwoFactorStatus {
  DISABLED = 'disabled',
  PENDING = 'pending',
  ENABLED = 'enabled'
}

export interface TwoFactorAuthAttributes extends BaseModel {
  userId: string;
  secret: string;
  status: string;
  backupCodes: string[];
  lastUsed: Date | null;
}

export class TwoFactorAuthRepository extends BaseRepository<TwoFactorAuthAttributes> {
  protected tableName = 'two_factor_auth';
  protected columns = [
    'id',
    'user_id as userId',
    'secret',
    'status',
    'backup_codes as backupCodes',
    'last_used as lastUsed',
    'created_at as createdAt',
    'updated_at as updatedAt'
  ];

  /**
   * Find by user ID
   */
  async findByUserId(userId: string, client?: Pool): Promise<TwoFactorAuthAttributes | null> {
    const query = `
      SELECT ${this.columns.join(', ')}
      FROM ${this.tableName}
      WHERE user_id = $1
    `;

    try {
      const result = await (client || DatabaseConnectionManager.getPool()).query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error in findByUserId', { userId, error });
      throw error;
    }
  }
}

// Singleton instance
export const twoFactorAuthRepository = new TwoFactorAuthRepository();

export class TwoFactorAuth implements TwoFactorAuthAttributes {
  id: string;
  userId: string;
  secret: string;
  status: string;
  backupCodes: string[];
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: TwoFactorAuthAttributes) {
    this.id = data.id;
    this.userId = data.userId;
    this.secret = data.secret;
    this.status = data.status;
    this.backupCodes = data.backupCodes;
    this.lastUsed = data.lastUsed ? new Date(data.lastUsed) : null;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<TwoFactorAuth | null> {
    const twoFactorAuth = await twoFactorAuthRepository.findById(id);
    return twoFactorAuth ? new TwoFactorAuth(twoFactorAuth) : null;
  }

  static async findByUserId(userId: string): Promise<TwoFactorAuth | null> {
    const twoFactorAuth = await twoFactorAuthRepository.findByUserId(userId);
    return twoFactorAuth ? new TwoFactorAuth(twoFactorAuth) : null;
  }

  static async create(data: Omit<TwoFactorAuthAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<TwoFactorAuth> {
    const { userId, backupCodes, lastUsed, ...rest } = data;
    const twoFactorAuth = await twoFactorAuthRepository.create({
      ...rest,
      user_id: userId,
      backup_codes: backupCodes,
      last_used: lastUsed
    } as any);
    return new TwoFactorAuth(twoFactorAuth);
  }

  // Instance methods
  async update(data: Partial<TwoFactorAuthAttributes>): Promise<TwoFactorAuth> {
    const { userId, backupCodes, lastUsed, ...rest } = data;
    const updateData = {
      ...rest,
      ...(userId !== undefined && { user_id: userId }),
      ...(backupCodes !== undefined && { backup_codes: backupCodes }),
      ...(lastUsed !== undefined && { last_used: lastUsed })
    };
    const updated = await twoFactorAuthRepository.update(this.id, updateData as any);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return twoFactorAuthRepository.delete(this.id);
  }

  toJSON() {
    return {
      ...this,
      lastUsed: this.lastUsed?.toISOString() || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

export default TwoFactorAuth; 