import {
  EMAIL_VERIFICATION_TOKENS_TABLE,
  PASSWORD_RESET_TOKENS_TABLE,
  REFRESH_TOKENS_TABLE,
  type EmailVerificationToken,
  type EmailVerificationTokenInsert,
  type PasswordResetToken,
  type PasswordResetTokenInsert,
  type RefreshToken,
  type RefreshTokenInsert
} from '../schema';
import { BaseRepository } from './base';

export class AuthRepository extends BaseRepository {
  // ===================================
  // Refresh Tokens
  // ===================================

  async createRefreshToken(data: RefreshTokenInsert): Promise<RefreshToken> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${REFRESH_TOKENS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;
    const rows = await this.db.query<RefreshToken>({ text: sql, values });
    if (!rows[0]) throw new Error('Failed to create refresh token');
    return rows[0];
  }

  async findRefreshTokenByHash(hash: string): Promise<RefreshToken | null> {
    const result = await this.db.queryOne<RefreshToken>({
      text: 'SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1',
      values: [hash]
    });
    return result;
  }

  async deleteRefreshToken(tokenHash: string): Promise<void> {
    await this.db.execute({
        text: 'DELETE FROM refresh_tokens WHERE token_hash = $1',
        values: [tokenHash]
    });
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.db.execute({
        text: 'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1',
        values: [familyId]
    });
  }

  // ===================================
  // Email Verification
  // ===================================

  async createEmailVerificationToken(data: EmailVerificationTokenInsert): Promise<EmailVerificationToken> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${EMAIL_VERIFICATION_TOKENS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;
    const rows = await this.db.query<EmailVerificationToken>({ text: sql, values });
    if (!rows[0]) throw new Error('Failed to create verification token');
    return rows[0];
  }

    async findEmailVerificationTokenByHash(hash: string): Promise<EmailVerificationToken | null> {
    const result = await this.db.queryOne<EmailVerificationToken>({
      text: 'SELECT * FROM email_verification_tokens WHERE token_hash = $1 LIMIT 1',
      values: [hash]
    });
    return result;
  }


  // ===================================
  // Password Reset
  // ===================================

  async createPasswordResetToken(data: PasswordResetTokenInsert): Promise<PasswordResetToken> {
      const columns = Object.keys(data).join(', ');
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      const sql = `
        INSERT INTO ${PASSWORD_RESET_TOKENS_TABLE} (${columns})
        VALUES (${placeholders})
        RETURNING *
      `;
      const rows = await this.db.query<PasswordResetToken>({ text: sql, values });
      if (!rows[0]) throw new Error('Failed to create password reset token');
      return rows[0];
  }

    async findValidPasswordResetToken(hash: string): Promise<PasswordResetToken | null> {
        // Find token that matches hash, hasn't been used, and isn't expired
        const sql = `
            SELECT * FROM password_reset_tokens
            WHERE token_hash = $1
            AND used_at IS NULL
            AND expires_at > NOW()
            LIMIT 1
        `;
        const result = await this.db.queryOne<PasswordResetToken>({ text: sql, values: [hash] });
        return result;
    }
}
