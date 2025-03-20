import { Logger } from "../../../services/dev/logger/LoggerService";
import { Token, TokenAttributes, TokenType } from "../../models/auth/Token";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling Token database operations.
 * This class is responsible for:
 * 1. All database operations related to tokens
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for tokens
 * 4. NOT implementing business logic - that belongs in the Token model
 */
export class TokenRepository extends BaseRepository<Token> {
  protected logger = new Logger("TokenRepository");
  protected tableName = "tokens";
  protected columns = [
    "id",
    "user_id as userId",
    "token",
    "type",
    "device_info as deviceInfo",
    "ip_address as ipAddress",
    "expires_at as expiresAt",
    "last_used_at as lastUsedAt",
    "revoked",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Find a token by its primary key
   */
  async findByPk(id: string): Promise<Token | null> {
    const result = await this.findOneByField("id", id);
    if (!result) return null;
    return new Token(result);
  }

  /**
   * Find a token by its token string
   */
  async findByToken(token: string): Promise<Token | null> {
    const result = await this.findOneByField("token", token);
    if (!result) return null;
    return new Token(result);
  }

  /**
   * Find tokens by user ID and type
   */
  async findByUserAndType(userId: string, type: TokenType): Promise<Token[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE user_id = $1 AND type = $2 AND revoked = false AND expires_at > NOW()
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery<TokenAttributes>(query, [
      userId,
      type,
    ]);
    return this.mapResultRows(
      result.rows,
      (result) => new Token(result as unknown as TokenAttributes),
    );
  }

  /**
   * Create a new token
   */
  async create(
    data: Omit<TokenAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Token> {
    const token = new Token(data);
    token.validate();

    const result = await super.create(token);
    return new Token(result as unknown as TokenAttributes);
  }

  /**
   * Update a token
   */
  async update(
    id: string,
    data: Partial<TokenAttributes>,
  ): Promise<Token | null> {
    const token = new Token(data);

    const result = await super.update(id, token);
    if (!result) return null;

    return new Token(result as unknown as TokenAttributes);
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: string): Promise<Token | null> {
    const token = await this.findByPk(id);
    if (!token) return null;

    token.markAsUsed();
    const result = await super.update(id, token);
    if (!result) return null;

    return new Token(result as unknown as TokenAttributes);
  }

  /**
   * Revoke a token
   */
  async revoke(id: string): Promise<Token | null> {
    const token = await this.findByPk(id);
    if (!token) return null;

    token.revokeToken();
    const result = await super.update(id, token);
    if (!result) return null;

    return new Token(result as unknown as TokenAttributes);
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllForUser(
    userId: string,
    exceptTokenId?: string,
  ): Promise<number> {
    const query = `
      UPDATE ${this.tableName}
      SET revoked = true, updated_at = NOW()
      WHERE user_id = $1 AND revoked = false
      ${exceptTokenId ? "AND id != $2" : ""}
    `;

    const params = [userId];
    if (exceptTokenId) {
      params.push(exceptTokenId);
    }

    const result = await this.executeQuery<{ id: string }>(query, params);
    return result.rowCount;
  }

  /**
   * Delete expired tokens
   */
  async deleteExpired(): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE expires_at < NOW() AND revoked = true
    `;

    const result = await this.executeQuery<{ id: string }>(query);
    return result.rowCount;
  }

  /**
   * Map database result to Token model
   */
  protected mapResultToModel(row: Record<string, unknown>): Token {
    if (!row) return null as unknown as Token;

    return new Token({
      id: row.id as string,
      userId: (row.userId || row.user_id) as string,
      token: row.token as string,
      type: row.type as TokenType,
      deviceInfo: (row.deviceInfo || row.device_info) as string,
      ipAddress: (row.ipAddress || row.ip_address) as string,
      expiresAt: (row.expiresAt || row.expires_at) as Date,
      lastUsedAt: (row.lastUsedAt || row.last_used_at) as Date,
      revoked: row.revoked as boolean,
      createdAt: (row.createdAt || row.created_at) as Date,
      updatedAt: (row.updatedAt || row.updated_at) as Date,
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET revoked = true, updated_at = NOW()
      WHERE user_id = $1
    `;

    await this.executeQuery(query, [userId]);
  }
}
