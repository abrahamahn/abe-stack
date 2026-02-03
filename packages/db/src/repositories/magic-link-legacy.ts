import {
    MAGIC_LINK_TOKENS_TABLE,
    type MagicLinkToken,
    type NewMagicLinkToken
} from '../schema';
import { BaseRepository } from './base';

export class MagicLinkRepository extends BaseRepository {
  /**
   * Create a new magic link token.
   */
  async create(data: NewMagicLinkToken): Promise<MagicLinkToken> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${MAGIC_LINK_TOKENS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const rows = await this.db.query<MagicLinkToken>(this.db.raw(sql, values));
    if (!rows[0]) throw new Error('Failed to create magic link token');
    return rows[0];
  }

  /**
   * Find a magic link token by its hash.
   */
  async findByTokenHash(hash: string): Promise<MagicLinkToken | null> {
    const result = await this.db.queryOne<MagicLinkToken>(
      this.db.raw(`SELECT * FROM ${MAGIC_LINK_TOKENS_TABLE} WHERE token_hash = $1 LIMIT 1`, [hash])
    );
    return result;
  }

  /**
   * Find a valid (unused, unexpired) token by hash.
   */
  async findValidByTokenHash(hash: string): Promise<MagicLinkToken | null> {
    const sql = `
      SELECT * FROM ${MAGIC_LINK_TOKENS_TABLE}
      WHERE token_hash = $1
      AND used_at IS NULL
      AND expires_at > NOW()
      LIMIT 1
    `;
    return this.db.queryOne<MagicLinkToken>(this.db.raw(sql, [hash]));
  }

  /**
   * Mark a token as used.
   */
  async markAsUsed(id: string): Promise<void> {
    const sql = `
      UPDATE ${MAGIC_LINK_TOKENS_TABLE}
      SET used_at = NOW()
      WHERE id = $1
    `;
    await this.db.execute(this.db.raw(sql, [id]));
  }

  /**
   * invalidate all tokens for an email (security precaution)
   */
  async invalidateAllForEmail(email: string): Promise<void> {
      const sql = `
        UPDATE ${MAGIC_LINK_TOKENS_TABLE}
        SET used_at = NOW()
        WHERE email = $1 AND used_at IS NULL
      `;
      await this.db.execute(this.db.raw(sql, [email]));
  }
}
