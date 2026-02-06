// backend/db/src/builder/delete.ts
/**
 * DeleteBuilder - Fluent API for building DELETE queries
 *
 * @example
 * const query = deleteFrom('users')
 *   .where(eq('id', userId))
 *   .returning('id')
 *   .toSql();
 */

import {
  combine,
  escapeIdentifier,
  formatTable,
  type QueryBuilder,
  type QueryResult,
  type SqlFragment,
  type TableSpec,
} from './types';

/**
 * DeleteBuilder class for constructing DELETE queries
 */
export class DeleteBuilder implements QueryBuilder {
  private readonly _table: TableSpec;
  private _where: SqlFragment | null = null;
  private readonly _using: TableSpec[] = [];
  private _returning: string[] = [];

  constructor(table: string | TableSpec) {
    this._table = typeof table === 'string' ? { name: table } : table;
  }

  /**
   * Add WHERE clause
   * @example deleteFrom('users').where(eq('id', userId))
   */
  where(condition: SqlFragment): this {
    this._where = condition;
    return this;
  }

  /**
   * Add USING clause for joins in DELETE
   * @example deleteFrom('orders').using('users').where(colEq('orders.user_id', 'users.id'))
   */
  using(table: string | TableSpec): this {
    this._using.push(typeof table === 'string' ? { name: table } : table);
    return this;
  }

  /**
   * Specify columns to return after delete
   * @example deleteFrom('users').where(...).returning('id', 'email')
   */
  returning(...cols: string[]): this {
    this._returning = cols;
    return this;
  }

  /**
   * Return all columns after delete
   * @example deleteFrom('users').where(...).returningAll()
   */
  returningAll(): this {
    this._returning = ['*'];
    return this;
  }

  /**
   * Build the SQL query
   */
  /**
   * Build the SQL query
   */
  toSql(): QueryResult {
    const parts: SqlFragment[] = [];

    // DELETE FROM table
    const tableFragment = formatTable(this._table);
    parts.push({ text: `DELETE FROM ${tableFragment.text}`, values: [...tableFragment.values] });

    // USING clause (for joins)
    if (this._using.length > 0) {
      const usingFragments = this._using.map(formatTable);
      const usingText = usingFragments.map((f) => f.text).join(', ');
      const usingValues = usingFragments.flatMap((f) => f.values);
      parts.push({ text: `USING ${usingText}`, values: usingValues });
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
 * Create a new DeleteBuilder
 * @example deleteFrom('users').where(eq('id', userId)).returning('id')
 */
export function deleteFrom(table: string | TableSpec): DeleteBuilder {
  return new DeleteBuilder(table);
}

/**
 * Alias for deleteFrom (for those who prefer this style)
 * @example del('users').where(eq('id', userId))
 */
export const del = deleteFrom;

/**
 * Delete all rows from a table (TRUNCATE is faster but doesn't support RETURNING)
 * @example truncate('temp_data')
 */
export function truncate(table: string | TableSpec): QueryResult {
  const tableSpec = typeof table === 'string' ? { name: table } : table;
  const fragment = formatTable(tableSpec);
  return { text: `TRUNCATE ${fragment.text}`, values: fragment.values as unknown[] };
}

/**
 * Truncate with options
 * @example truncateCascade('parent_table')
 */
export function truncateCascade(table: string | TableSpec): QueryResult {
  const tableSpec = typeof table === 'string' ? { name: table } : table;
  const fragment = formatTable(tableSpec);
  return { text: `TRUNCATE ${fragment.text} CASCADE`, values: fragment.values as unknown[] };
}
