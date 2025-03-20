import crypto from "crypto";

import {
  PasswordResetToken,
  PasswordResetTokenAttributes,
  PasswordResetTokenStatus,
} from "../../models/auth/PasswordResetToken";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository for managing password reset tokens.
 * Responsible for:
 * 1. Database operations for password reset tokens
 * 2. Token generation and verification
 * 3. Managing token lifecycle
 * 4. NOT implementing business logic - that belongs in the model
 */
export class PasswordResetTokenRepository extends BaseRepository<PasswordResetToken> {
  protected tableName = "password_reset_tokens";
  protected columns = [
    "id",
    "user_id",
    "token",
    "expires_at",
    "status",
    "used_at",
    "created_at",
    "updated_at",
  ];

  constructor() {
    super();
  }

  /**
   * Find token by token value
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    // Hash the token for lookup
    const hashedToken = this.hashToken(token);
    const result = await this.findOneByField("token", hashedToken);
    if (!result) return null;
    return new PasswordResetToken(
      result as unknown as PasswordResetTokenAttributes,
    );
  }

  /**
   * Find active tokens for a user
   */
  async findActiveTokensByUserId(
    userId: string,
  ): Promise<PasswordResetToken[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE user_id = $1 AND status = $2 AND expires_at > NOW()
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      userId,
      PasswordResetTokenStatus.ACTIVE,
    ]);

    return result.rows.map((row) => this.mapResultToModel(row));
  }

  /**
   * Create a new password reset token
   */
  async createToken(
    userId: string,
    expiresInHours = 24,
  ): Promise<PasswordResetToken> {
    // Generate a random token
    const tokenValue = crypto.randomBytes(32).toString("hex");

    // Hash the token for storage
    const hashedToken = this.hashToken(tokenValue);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const data = {
      userId,
      token: hashedToken,
      expiresAt,
      status: PasswordResetTokenStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const token = new PasswordResetToken(data);
    await super.create(token);

    // Return token with unhashed value for sending to user
    const resultToken = new PasswordResetToken({
      ...token.toJSON(),
      token: tokenValue,
    });
    return resultToken;
  }

  /**
   * Mark a token as used
   */
  async markAsUsed(tokenId: string): Promise<PasswordResetToken | null> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, used_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING ${this.columns.join(", ")}
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      PasswordResetTokenStatus.USED,
      tokenId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapResultToModel(result.rows[0]);
  }

  /**
   * Invalidate all tokens for a user
   */
  async invalidateAllUserTokens(userId: string): Promise<number> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = NOW()
      WHERE user_id = $2 AND status = $3
      RETURNING id
    `;

    const result = await this.executeQuery<{ id: string }>(query, [
      PasswordResetTokenStatus.EXPIRED,
      userId,
      PasswordResetTokenStatus.ACTIVE,
    ]);

    return result.rows.length;
  }

  /**
   * Clean up expired tokens (maintenance function)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = NOW()
      WHERE (expires_at < NOW() AND status = $2)
      RETURNING id
    `;

    const result = await this.executeQuery<{ id: string }>(query, [
      PasswordResetTokenStatus.EXPIRED,
      PasswordResetTokenStatus.ACTIVE,
    ]);

    return result.rows.length;
  }

  /**
   * Verify a reset token
   */
  async verifyToken(tokenValue: string, userId: string): Promise<boolean> {
    // Hash the provided token for comparison
    const hashedToken = this.hashToken(tokenValue);

    const query = `
      SELECT id FROM ${this.tableName}
      WHERE token = $1 AND user_id = $2 AND status = $3 AND expires_at > NOW()
    `;

    const result = await this.executeQuery<{ id: string }>(query, [
      hashedToken,
      userId,
      PasswordResetTokenStatus.ACTIVE,
    ]);

    return result.rows.length > 0;
  }

  /**
   * Helper method to hash a token
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Maps database result to model instance
   */
  protected mapResultToModel(row: Record<string, unknown>): PasswordResetToken {
    if (!row) return null as unknown as PasswordResetToken;

    // Transform snake_case DB fields to camelCase for the model
    const tokenData = {
      id: row.id as string,
      userId: row.user_id as string,
      token: row.token as string,
      expiresAt: row.expires_at as Date,
      status: row.status as PasswordResetTokenStatus,
      usedAt: row.used_at ? (row.used_at as Date) : undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };

    return new PasswordResetToken(tokenData);
  }
}
