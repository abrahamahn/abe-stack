// src/server/models/User.ts
import { Pool } from 'pg';
import { BaseModel, BaseRepository } from '../database/BaseRepository';
import { DatabaseConnectionManager } from '../database/config';
import bcrypt from 'bcrypt';
import { Post } from './Post';

export interface UserAttributes extends BaseModel {
  username: string;
  email: string;
  password: string;
  displayName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
}

export interface UserJSON extends Omit<User, 'password' | 'update' | 'delete' | 'comparePassword' | 'updatePassword' | 'toJSON'> {
  posts?: Post[];
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
    'bio',
    'profile_image as profileImage',
    'banner_image as bannerImage',
    'role',
    'is_verified as isVerified',
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
    const { displayName, profileImage, bannerImage, isVerified, ...rest } = data;
    return this.create({
      ...rest,
      password: hashedPassword,
      display_name: displayName,
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
      return result.rows.reduce((acc, row) => {
        acc[row.role] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      this.logger.error('Error in countByRole', { error });
      throw error;
    }
  }
}

// Singleton instance
export const userRepository = new UserRepository();

export class User implements UserAttributes {
  id: string;
  username: string;
  email: string;
  password: string;
  displayName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: UserAttributes) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.displayName = data.displayName;
    this.bio = data.bio;
    this.profileImage = data.profileImage;
    this.bannerImage = data.bannerImage;
    this.role = data.role;
    this.isVerified = data.isVerified;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<User | null> {
    const user = await userRepository.findById(id);
    return user ? new User(user) : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const user = await userRepository.findByEmail(email);
    return user ? new User(user) : null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const user = await userRepository.findByUsername(username);
    return user ? new User(user) : null;
  }

  static async findAll(): Promise<User[]> {
    const users = await userRepository.findAll();
    return users.map(user => new User(user));
  }

  static async create(data: Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = await userRepository.createWithHashedPassword(data);
    return new User(user);
  }

  // Instance methods
  async update(data: Partial<UserAttributes>): Promise<User> {
    const { displayName, profileImage, bannerImage, isVerified, ...rest } = data;
    const updateData = {
      ...rest,
      ...(displayName !== undefined && { display_name: displayName }),
      ...(profileImage !== undefined && { profile_image: profileImage }),
      ...(bannerImage !== undefined && { banner_image: bannerImage }),
      ...(isVerified !== undefined && { is_verified: isVerified })
    };
    const updated = await userRepository.update(this.id, updateData as any);
    Object.assign(this, updated);
    return this;
  }

  async delete(): Promise<boolean> {
    return userRepository.delete(this.id);
  }

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  async updatePassword(newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.update({ password: hashedPassword });
  }

  toJSON(): UserJSON {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

export default User;