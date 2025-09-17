import { injectable, inject } from "inversify";

import type { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";
import { BaseRepository } from "@/server/modules/base/baseRepository";

import { PasswordResetToken } from "../../features/password/models/password-reset-token.model";

/**
 * Repository for managing password reset tokens
 */
@injectable()
export class PasswordResetTokenRepository extends BaseRepository<PasswordResetToken> {
  /**
   * The database table name
   */
  protected tableName: string = "password_reset_tokens";

  /**
   * The table columns
   */
  protected columns: string[] = [
    "id",
    "user_id",
    "token",
    "expires_at",
    "used",
    "used_at",
    "created_by_ip",
    "used_by_ip",
    "created_at",
    "updated_at",
  ];

  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseService) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "PasswordResetToken");
  }

  /**
   * Find a token by its value
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE token = $1
        LIMIT 1
      `;

      const result = await this.executeQuery(query, [token]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding token", { token, error });
      return null;
    }
  }

  /**
   * Find the most recent token for a user
   */
  async findLatestForUser(userId: string): Promise<PasswordResetToken | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await this.executeQuery(query, [userId]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding latest token for user", {
        userId,
        error,
      });
      return null;
    }
  }

  /**
   * Find all valid tokens for a user
   */
  async findValidForUser(userId: string): Promise<PasswordResetToken[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
        AND used = false
        AND expires_at > NOW()
      `;

      const result = await this.executeQuery(query, [userId]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding valid tokens for user", {
        userId,
        error,
      });
      return [];
    }
  }

  /**
   * Invalidate all tokens for a user
   */
  async invalidateAllForUser(userId: string): Promise<number> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET used = true, 
            used_at = NOW(),
            updated_at = NOW()
        WHERE user_id = $1
        AND used = false
        AND expires_at > NOW()
        RETURNING id
      `;

      const result = await this.executeQuery(query, [userId]);
      return result.rowCount;
    } catch (error) {
      this.logger.error("Error invalidating tokens for user", {
        userId,
        error,
      });
      return 0;
    }
  }

  /**
   * Clean up expired or used tokens
   */
  async cleanup(): Promise<number> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE expires_at < NOW()
        OR used = true
        RETURNING id
      `;

      const result = await this.executeQuery(query);
      return result.rowCount;
    } catch (error) {
      this.logger.error("Error cleaning up tokens", { error });
      return 0;
    }
  }

  /**
   * Map database row to model
   */
  protected mapResultToModel(row: Record<string, unknown>): PasswordResetToken {
    return new PasswordResetToken({
      id: row.id as string,
      userId: row.user_id as string,
      token: row.token as string,
      expiresAt: row.expires_at
        ? new Date(row.expires_at as string)
        : new Date(),
      used: Boolean(row.used),
      usedAt: row.used_at ? new Date(row.used_at as string) : undefined,
      createdByIp: row.created_by_ip as string | undefined,
      usedByIp: row.used_by_ip as string | undefined,
      createdAt: row.created_at
        ? new Date(row.created_at as string)
        : new Date(),
      updatedAt: row.updated_at
        ? new Date(row.updated_at as string)
        : new Date(),
    });
  }
}
