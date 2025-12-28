import { injectable, inject } from "inversify";

import { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";
import { BaseRepository } from "@/server/modules/base";

import { VerificationToken } from "../../models/verification-token.model";

/**
 * Repository for verification tokens
 */
@injectable()
export class VerificationTokenRepository extends BaseRepository<VerificationToken> {
  protected tableName = "verification_tokens";
  protected columns = [
    "id",
    "user_id",
    "token",
    "expires_at",
    "used",
    "used_at",
    "created_at",
    "updated_at",
  ];

  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseServer) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "VerificationToken");
  }

  /**
   * Find a verification token by token string
   */
  async findByToken(token: string): Promise<VerificationToken | null> {
    try {
      const result = await this.db.executeQuery(
        `SELECT ${this.columns.join(", ")} 
         FROM ${this.tableName} 
         WHERE token = $1 AND used = false`,
        [token]
      );

      return result.rows.length > 0
        ? this.mapRowToEntity(result.rows[0])
        : null;
    } catch (error) {
      this.logger.error("Error finding verification token", { error });
      return null;
    }
  }

  /**
   * Mark a verification token as used
   */
  async markAsUsed(id: string): Promise<boolean> {
    try {
      const result = await this.db.executeQuery(
        `UPDATE ${this.tableName} 
         SET used = true, used_at = NOW(), updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Error marking verification token as used", { error });
      return false;
    }
  }

  /**
   * Create verification token with mapping
   */
  async create(data: Partial<VerificationToken>): Promise<VerificationToken> {
    const entity = await super.create({
      ...data,
      user_id: data.userId,
    });

    return this.mapRowToEntity(entity);
  }

  /**
   * Map database row to entity
   */
  protected mapRowToEntity(row: any): VerificationToken {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      used: row.used,
      usedAt: row.used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
