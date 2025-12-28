import { injectable, inject } from "inversify";

import { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";
import { BaseRepository } from "@/server/modules/base";

import { User, UserInterface } from "./User";

/**
 * Repository for User entities
 */
@injectable()
export class UserRepository extends BaseRepository<User> {
  protected tableName = "users";
  protected columns = [
    "id",
    "email",
    "username",
    "password",
    "first_name",
    "last_name",
    "display_name",
    "bio",
    "profile_image",
    "banner_image",
    "role",
    "roles",
    "active",
    "is_verified",
    "email_confirmed",
    "email_token",
    "email_token_expire",
    "last_email_sent",
    "last_login",
    "failed_login_attempts",
    "locked_until",
    "last_ip_address",
    "login_history",
    "api_keys",
    "mfa_enabled",
    "mfa_secret",
    "backup_codes",
    "password_reset_token",
    "password_reset_expires",
    "remember_token",
    "remember_token_expires",
    "type",
    "last_login_at",
    "account_status",
    "password_last_changed",
    "created_at",
    "updated_at",
  ];

  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseService) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "User");
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE email = $1
      LIMIT 1
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      email,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapResultToModel(result.rows[0]);
  }

  /**
   * Find a user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE username = $1
      LIMIT 1
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      username,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapResultToModel(result.rows[0]);
  }

  /**
   * Find a user by API key
   */
  async findByApiKey(apiKey: string): Promise<User | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE $1 = ANY(api_keys)
        AND active = true
      LIMIT 1
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      apiKey,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapResultToModel(result.rows[0]);
  }

  /**
   * Get required fields for a user
   */
  protected getRequiredFields(): string[] {
    return ["email", "username", "password", "roles", "active"];
  }

  /**
   * Find a user by remember token
   */
  async findByRememberToken(token: string): Promise<User | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE remember_token = $1
        AND remember_token_expires > NOW()
        AND active = true
      LIMIT 1
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      token,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapResultToModel(result.rows[0]);
  }

  /**
   * Find a user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE password_reset_token = $1
        AND password_reset_expires > NOW()
      LIMIT 1
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      token,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapResultToModel(result.rows[0]);
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE $1 = ANY(roles)
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      role,
    ]);

    return result.rows.map((row) => this.mapResultToModel(row));
  }

  /**
   * Find active users
   */
  async findActiveUsers(): Promise<User[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE active = true
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query);
    return result.rows.map((row) => this.mapResultToModel(row));
  }

  /**
   * Find users with failed login attempts
   */
  async findUsersWithFailedLogins(threshold: number = 3): Promise<User[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE failed_login_attempts >= $1
      ORDER BY failed_login_attempts DESC, last_login DESC
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      threshold,
    ]);

    return result.rows.map((row) => this.mapResultToModel(row));
  }

  /**
   * Prepare data for database operations
   * Convert camelCase properties to snake_case for the database
   */
  protected prepareDataForDatabase(
    data: Partial<User>
  ): Record<string, unknown> {
    const prepared: Record<string, unknown> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        prepared[this.camelToSnake(key)] = value;
      }
    });

    return prepared;
  }

  /**
   * Map a database row to a User model
   */
  protected mapResultToModel(row: Record<string, unknown>): User {
    const userData: Partial<UserInterface> = {
      id: row.id as string,
      email: row.email as string,
      username: row.username as string | undefined,
      password: row.password as string | undefined,
      firstName: row.first_name as string | undefined,
      lastName: row.last_name as string | undefined,
      displayName: row.display_name as string | undefined,
      bio: row.bio as string | undefined,
      profileImage: row.profile_image as string | undefined,
      bannerImage: row.banner_image as string | undefined,
      role: row.role as string,
      roles: row.roles as string[],
      active: row.active as boolean,
      isVerified: row.is_verified as boolean | undefined,
      emailConfirmed: row.email_confirmed as boolean | undefined,
      emailToken: row.email_token as string | undefined,
      emailTokenExpire: row.email_token_expire as Date | undefined,
      lastEmailSent: row.last_email_sent as Date | undefined,
      lastLogin: row.last_login as Date | undefined,
      failedLoginAttempts: row.failed_login_attempts as number | undefined,
      lockedUntil: row.locked_until as Date | undefined,
      lastIpAddress: row.last_ip_address as string | undefined,
      loginHistory: row.login_history as any[] | undefined,
      apiKeys: row.api_keys as string[] | undefined,
      mfaEnabled: row.mfa_enabled as boolean | undefined,
      mfaSecret: row.mfa_secret as string | undefined,
      backupCodes: row.backup_codes as string[] | undefined,
      passwordResetToken: row.password_reset_token as string | undefined,
      passwordResetExpires: row.password_reset_expires as Date | undefined,
      rememberToken: row.remember_token as string | undefined,
      rememberTokenExpires: row.remember_token_expires as Date | undefined,
      type: row.type as string | undefined,
      lastLoginAt: row.last_login_at as Date | undefined,
      accountStatus: row.account_status as string | undefined,
      passwordLastChanged: row.password_last_changed as Date | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };

    return new User(userData);
  }
}
