import {
  USERS_TABLE,
  type User,
  type UserInsert,
  type UserUpdate
} from '../schema';
import { BaseRepository } from './base';

export class UserRepository extends BaseRepository {
  /**
   * Find a user by their email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.queryOne<User>({
      text: 'SELECT * FROM users WHERE email = $1 LIMIT 1',
      values: [email]
    });
    return result;
  }

  /**
   * Find a user by their ID.
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.db.queryOne<User>({
      text: 'SELECT * FROM users WHERE id = $1 LIMIT 1',
      values: [id]
    });
    return result;
  }

  /**
   * Create a new user.
   */
  async create(data: UserInsert): Promise<User> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${USERS_TABLE} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const rows = await this.db.query<User>({ text: sql, values });
    if (!rows[0]) throw new Error('Failed to create user');
    return rows[0];
  }

  /**
   * Update a user's data.
   */
  async update(id: string, data: UserUpdate): Promise<User> {
    const keys = Object.keys(data);
    if (keys.length === 0) {
        // Nothing to update, return current user
        const user = await this.findById(id);
        if (!user) throw new Error('User not found');
        return user;
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = Object.values(data);

    const sql = `
      UPDATE ${USERS_TABLE}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const rows = await this.db.query<User>({ text: sql, values: [id, ...values] });
    if (!rows[0]) throw new Error('Failed to update user');
    return rows[0];
  }
}
