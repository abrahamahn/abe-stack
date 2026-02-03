import {
    OAUTH_CONNECTIONS_TABLE,
    type NewOAuthConnection,
    type OAuthConnection,
    type OAuthProvider,
    type UpdateOAuthConnection
} from '../schema';
import { BaseRepository } from './base';

export class OAuthRepository extends BaseRepository {
  /**
   * Create a new OAuth connection.
   */
  async create(data: NewOAuthConnection): Promise<OAuthConnection> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${OAUTH_CONNECTIONS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const rows = await this.db.query<OAuthConnection>(this.db.raw(sql, values));
    if (!rows[0]) throw new Error('Failed to create OAuth connection');
    return rows[0];
  }

  /**
   * Find connection by provider and provider's user ID.
   */
  async findByProviderUserId(provider: OAuthProvider, providerUserId: string): Promise<OAuthConnection | null> {
    const sql = `
      SELECT * FROM ${OAUTH_CONNECTIONS_TABLE}
      WHERE provider = $1 AND provider_user_id = $2
      LIMIT 1
    `;
    return this.db.queryOne<OAuthConnection>(this.db.raw(sql, [provider, providerUserId]));
  }

  /**
   * Find all connections for a user.
   */
  async findAllByUserId(userId: string): Promise<OAuthConnection[]> {
    const sql = `
      SELECT * FROM ${OAUTH_CONNECTIONS_TABLE}
      WHERE user_id = $1
    `;
    return this.db.query<OAuthConnection>(this.db.raw(sql, [userId]));
  }

  /**
   * Update an existing connection.
   */
  async update(id: string, data: UpdateOAuthConnection): Promise<OAuthConnection> {
    const keys = Object.keys(data);
    if (keys.length === 0) {
        const conn = await this.db.queryOne<OAuthConnection>(
            this.db.raw(`SELECT * FROM ${OAUTH_CONNECTIONS_TABLE} WHERE id = $1`, [id])
        );
        if (!conn) throw new Error('Connection not found');
        return conn;
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = Object.values(data);

    const sql = `
      UPDATE ${OAUTH_CONNECTIONS_TABLE}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const rows = await this.db.query<OAuthConnection>(this.db.raw(sql, [id, ...values]));
    if (!rows[0]) throw new Error('Failed to update OAuth connection');
    return rows[0];
  }

  /**
   * Delete a connection.
   */
  async delete(id: string): Promise<void> {
    await this.db.execute(
        this.db.raw(`DELETE FROM ${OAUTH_CONNECTIONS_TABLE} WHERE id = $1`, [id])
    );
  }
}
