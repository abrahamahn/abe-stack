// infra/db/src/builder/update.ts
/**
 * UpdateBuilder - Fluent API for building UPDATE queries
 *
 * @example
 * const query = update('users')
 *   .set({ name: 'Jane', updated_at: new Date() })
 *   .where(eq('id', userId))
 *   .returning('id', 'name')
 *   .toSql();
 */

import {
  combine,
  escapeIdentifier,
  formatTable,
  type DbValue,
  type QueryBuilder,
  type QueryResult,
  type SqlFragment,
  type TableSpec,
} from './types';

/**
 * UpdateBuilder class for constructing UPDATE queries
 */
export class UpdateBuilder implements QueryBuilder {
  private _table: TableSpec;
  private _set: Map<string, DbValue | SqlFragment> = new Map();
  private _where: SqlFragment | null = null;
  private _returning: string[] = [];
  private _from: TableSpec | null = null;

  constructor(table: string | TableSpec) {
    this._table = typeof table === 'string' ? { name: table } : table;
  }

  /**
   * Set columns to update
   * @example update('users').set({ name: 'Jane', email: 'jane@example.com' })
   */
  set(values: Record<string, unknown>): this {
    for (const [key, value] of Object.entries(values)) {
      this._set.set(key, value as DbValue);
    }
    return this;
  }

  /**
   * Set a single column with a raw SQL expression
   * @example update('users').setRaw('version', 'version + 1')
   */
  setRaw(column: string, expression: string): this {
    this._set.set(column, { text: expression, values: [] } as SqlFragment);
    return this;
  }

  /**
   * Set a column to its current value plus an increment
   * @example update('users').increment('login_count', 1)
   */
  increment(column: string, amount: number = 1): this {
    this._set.set(column, {
      text: `${escapeIdentifier(column)} + $1`,
      values: [amount],
    } as SqlFragment);
    return this;
  }

  /**
   * Set a column to its current value minus a decrement
   * @example update('users').decrement('balance', 100)
   */
  decrement(column: string, amount: number = 1): this {
    this._set.set(column, {
      text: `${escapeIdentifier(column)} - $1`,
      values: [amount],
    } as SqlFragment);
    return this;
  }

  /**
   * Add WHERE clause
   * @example update('users').set(...).where(eq('id', userId))
   */
  where(condition: SqlFragment): this {
    this._where = condition;
    return this;
  }

  /**
   * Add FROM clause for joins in UPDATE
   * @example update('orders').set({ status: 'shipped' }).from('users').where(...)
   */
  from(table: string | TableSpec): this {
    this._from = typeof table === 'string' ? { name: table } : table;
    return this;
  }

  /**
   * Specify columns to return after update
   * @example update('users').set(...).where(...).returning('id', 'updated_at')
   */
  returning(...cols: string[]): this {
    this._returning = cols;
    return this;
  }

  /**
   * Return all columns after update
   * @example update('users').set(...).where(...).returningAll()
   */
  returningAll(): this {
    this._returning = ['*'];
    return this;
  }

  /**
   * Build the SQL query
   */
  toSql(): QueryResult {
    if (this._set.size === 0) {
      throw new Error('UPDATE requires at least one column to set');
    }

    const parts: SqlFragment[] = [];

    // UPDATE table
    const tableFragment = formatTable(this._table);
    parts.push({ text: `UPDATE ${tableFragment.text}`, values: [...tableFragment.values] });

    // SET clause
    const setClauses: SqlFragment[] = [];
    for (const [column, value] of this._set) {
      if (isSqlFragment(value)) {
        // Raw SQL expression - renumber will happen in combine()
        setClauses.push({
          text: `${escapeIdentifier(column)} = ${value.text}`,
          values: [...value.values],
        });
      } else {
        // Regular parameterized value
        setClauses.push({
          text: `${escapeIdentifier(column)} = $1`,
          values: [value],
        });
      }
    }
    const setCombined = combine(setClauses, ', ');
    parts.push({ text: `SET ${setCombined.text}`, values: setCombined.values });

    // FROM clause (for joins)
    if (this._from !== null) {
      const fromFragment = formatTable(this._from);
      parts.push({ text: `FROM ${fromFragment.text}`, values: [...fromFragment.values] });
    }

    // WHERE clause
    if (this._where !== null && this._where.text !== '') {
      parts.push({ text: `WHERE ${this._where.text}`, values: [...this._where.values] });
    }

    // RETURNING clause
    if (this._returning.length > 0) {
      const returnList =
        this._returning[0] === '*' ? '*' : this._returning.map(escapeIdentifier).join(', ');
      parts.push({ text: `RETURNING ${returnList}`, values: [] });
    }

    const combined = combine(parts, ' ');
    return { text: combined.text, values: combined.values };
  }
}

/**
 * Create a new UpdateBuilder
 * @example update('users').set({ name: 'Jane' }).where(eq('id', userId))
 */
export function update(table: string | TableSpec): UpdateBuilder {
  return new UpdateBuilder(table);
}

/**
 * Type guard for SqlFragment
 */
function isSqlFragment(value: unknown): value is SqlFragment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    'values' in value &&
    typeof (value as SqlFragment).text === 'string' &&
    Array.isArray((value as SqlFragment).values)
  );
}
