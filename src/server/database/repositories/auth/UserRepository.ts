import bcrypt from "bcrypt";

import { Logger } from "../../../services/dev/logger/LoggerService";
import { User, UserAttributes } from "../../models/auth/User";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling User database operations.
 * This class is responsible for:
 * 1. All database operations related to users
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for users
 * 4. NOT implementing business logic - that belongs in the User model
 */
export class UserRepository extends BaseRepository<User> {
  protected logger = new Logger("UserRepository");
  protected tableName = "users";
  protected columns = [
    "id",
    "username",
    "email",
    "password",
    "display_name as displayName",
    "first_name as firstName",
    "last_name as lastName",
    "bio",
    "profile_image as profileImage",
    "banner_image as bannerImage",
    "role",
    "is_verified as isVerified",
    "email_confirmed as emailConfirmed",
    "email_token as emailToken",
    "email_token_expire as emailTokenExpire",
    "last_email_sent as lastEmailSent",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Find a user by ID
   * @param id The user ID
   * @returns The user or null if not found
   */
  async findByPk(id: string): Promise<User | null> {
    const result = await this.findOneByField("id", id);
    if (!result) return null;
    return new User(result as unknown as UserAttributes);
  }

  /**
   * Find all users
   * @returns An array of users
   */
  async findAll(): Promise<User[]> {
    const results = await this.findByField("id", null);
    return this.mapResultRows(
      results,
      (result) => new User(result as unknown as UserAttributes),
    );
  }

  /**
   * Find a user by email
   * @param email The email to search for
   * @returns The user or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.findOneByField("email", email);
    if (!result) return null;
    return new User(result as unknown as UserAttributes);
  }

  /**
   * Find a user by username
   * @param username The username to search for
   * @returns The user or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await this.findOneByField("username", username);
    if (!result) return null;
    return new User(result as unknown as UserAttributes);
  }

  /**
   * Find a user by multiple conditions
   * @param conditions The conditions to search by
   * @returns The user or null if not found
   */
  async findOne(conditions: Partial<UserAttributes>): Promise<User | null> {
    const whereConditions: Record<string, unknown> = {};

    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined) {
        whereConditions[key] = value;
      }
    });

    if (Object.keys(whereConditions).length === 0) {
      return null;
    }

    // For simple single-field conditions, use findOneByField
    if (Object.keys(whereConditions).length === 1) {
      const [key, value] = Object.entries(whereConditions)[0];
      return this.findOneByField(
        key,
        value as string | number | boolean | Date | null,
      );
    }

    // For multiple conditions, build a custom query
    const whereClause = Object.keys(whereConditions)
      .map((key, index) => `${this.camelToSnake(key)} = $${index + 1}`)
      .join(" AND ");

    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE ${whereClause}
    `;

    const values = Object.values(whereConditions);
    const result = await this.executeQuery<UserAttributes>(query, values);

    if (!result.rows.length) return null;
    return new User(result.rows[0] as unknown as UserAttributes);
  }

  /**
   * Create a new user with a hashed password
   * @param data The user data
   * @returns The created user
   */
  async createWithHashedPassword(
    data: Omit<UserAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<User> {
    // Create a new user instance
    const user = new User(data);

    // Validate the user data
    user.validate();

    // Hash the password
    user.password = await bcrypt.hash(data.password as string, 10);

    // Create the user in the database
    const result = await super.create(user);

    return new User(result as unknown as UserAttributes);
  }

  /**
   * Update a user
   * @param id The user ID
   * @param data The data to update
   * @returns The updated user
   */
  async update(
    id: string,
    data: Partial<UserAttributes>,
  ): Promise<User | null> {
    // If password is included, hash it
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Create a user instance with the data
    const user = new User(data);

    // Update the user in the database
    const result = await super.update(id, user);
    if (!result) return null;

    return new User(result as unknown as UserAttributes);
  }

  /**
   * Delete a user
   * @param id The user ID
   * @returns True if the user was deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }

  /**
   * Find users by their role
   * @param role The role to search for
   * @returns An array of users with the specified role
   */
  async findByRole(role: string): Promise<User[]> {
    const results = await this.findByField("role", role);
    return this.mapResultRows(
      results,
      (result) => new User(result as unknown as UserAttributes),
    );
  }

  /**
   * Find unverified users
   * @returns An array of unverified users
   */
  async findUnverifiedUsers(): Promise<User[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE is_verified = false AND email_confirmed = false
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query);
    return this.mapResultRows(
      result.rows,
      (result) => new User(result as unknown as UserAttributes),
    );
  }

  /**
   * Find a user by email token
   * @param token The email token to search for
   * @returns The user or null if not found
   */
  async findByEmailToken(token: string): Promise<User | null> {
    const result = await this.findOneByField("email_token", token);
    if (!result) return null;
    return new User(result as unknown as UserAttributes);
  }

  /**
   * Convert camelCase to snake_case
   * @param str The string to convert
   * @returns The converted string
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Maps database result to User model
   */
  protected mapResultToModel(row: Record<string, unknown>): User {
    if (!row) return null as unknown as User;

    return new User({
      id: row.id as string,
      username: row.username as string,
      email: row.email as string,
      password: row.password as string,
      displayName: (row.displayName || row.display_name) as string,
      firstName: (row.firstName || row.first_name) as string,
      lastName: (row.lastName || row.last_name) as string,
      bio: row.bio as string,
      profileImage: (row.profileImage || row.profile_image) as string,
      bannerImage: (row.bannerImage || row.banner_image) as string,
      role: row.role as string,
      isVerified: (row.isVerified || row.is_verified) as boolean,
      emailConfirmed: (row.emailConfirmed || row.email_confirmed) as boolean,
      emailToken: (row.emailToken || row.email_token) as string,
      emailTokenExpire: (row.emailTokenExpire ||
        row.email_token_expire) as Date,
      lastEmailSent: (row.lastEmailSent || row.last_email_sent) as Date,
      createdAt: (row.createdAt || row.created_at) as Date,
      updatedAt: (row.updatedAt || row.updated_at) as Date,
    });
  }
}

// Export a singleton instance
export const userRepository = new UserRepository();
