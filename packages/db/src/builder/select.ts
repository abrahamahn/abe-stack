// packages/db/src/builder/select.ts
/**
 * SelectBuilder - Fluent API for building SELECT queries
 *
 * @example
 * const query = select('users')
 *   .columns('id', 'email', 'name')
 *   .where(and(eq('active', true), gt('age', 18)))
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .toSql();
 * // { text: 'SELECT "id", "email", "name" FROM "users" WHERE ...', values: [...] }
 */

import {
  combine,
  escapeIdentifier,
  formatTable,
  raw,
  type JoinSpec,
  type QueryBuilder,
  type QueryResult,
  type SortDirection,
  type SortSpec,
  type SqlFragment,
  type TableSpec,
} from './types';

/**
 * A computed column expression with optional alias
 */
interface ComputedColumn {
  expr: SqlFragment;
  alias?: string;
}

/**
 * SelectBuilder class for constructing SELECT queries
 */
export class SelectBuilder implements QueryBuilder {
  private _table: TableSpec;
  private _columns: string[] = ['*'];
  private _computedColumns: ComputedColumn[] = [];
  private _distinct = false;
  private _where: SqlFragment | null = null;
  private _joins: JoinSpec[] = [];
  private _orderBy: SortSpec[] = [];
  private _groupBy: string[] = [];
  private _having: SqlFragment | null = null;
  private _limit: number | null = null;
  private _offset: number | null = null;
  private _forUpdate = false;
  private _forShare = false;

  constructor(table: string | TableSpec) {
    this._table = typeof table === 'string' ? { name: table } : table;
  }

  /**
   * Specify columns to select
   * @example select('users').columns('id', 'email')
   */
  columns(...cols: string[]): this {
    this._columns = cols;
    return this;
  }

  /**
   * Add a computed column expression (window function, subquery, etc.)
   * @example select('orders').column(rowNumber().over(partitionBy('user_id')), 'rn')
   * @example select('users').column(sum('amount').over(partitionBy('region')), 'total')
   */
  column(expr: SqlFragment, alias?: string): this {
    // Check if expr has an 'alias' property (e.g., from WindowExpr.as())
    const exprWithAlias = expr as { alias?: string };
    const exprAlias = exprWithAlias.alias;

    // If an explicit alias is provided, strip any existing alias from the expression text
    let cleanExpr = expr;
    if (alias && exprAlias) {
      // Remove the " AS alias" suffix from the expression text
      const aliasPattern = new RegExp(` AS ${escapeIdentifier(exprAlias)}$`);
      cleanExpr = {
        text: expr.text.replace(aliasPattern, ''),
        values: expr.values,
      };
    }

    this._computedColumns.push({ expr: cleanExpr, alias: alias ?? exprAlias });
    return this;
  }

  /**
   * Add a subquery as a computed column
   * @example select('users').columnSubquery(
   *   select('orders').columns('COUNT(*)').where(colEq('orders.user_id', 'users.id')),
   *   'order_count'
   * )
   */
  columnSubquery(query: SelectBuilder, alias: string): this {
    const subquery = query.toSql();
    this._computedColumns.push({
      expr: { text: `(${subquery.text})`, values: subquery.values },
      alias,
    });
    return this;
  }

  /**
   * Add DISTINCT to the query
   * @example select('users').distinct().columns('role')
   */
  distinct(): this {
    this._distinct = true;
    return this;
  }

  /**
   * Add WHERE clause
   * @example select('users').where(eq('id', userId))
   */
  where(condition: SqlFragment): this {
    this._where = condition;
    return this;
  }

  /**
   * Add INNER JOIN
   * @example select('users').innerJoin('orders', 'orders.user_id = users.id')
   */
  innerJoin(table: string | TableSpec, on: SqlFragment): this {
    this._joins.push({
      type: 'inner',
      table: typeof table === 'string' ? { name: table } : table,
      on,
    });
    return this;
  }

  /**
   * Add LEFT JOIN
   * @example select('users').leftJoin('orders', 'orders.user_id = users.id')
   */
  leftJoin(table: string | TableSpec, on: SqlFragment): this {
    this._joins.push({
      type: 'left',
      table: typeof table === 'string' ? { name: table } : table,
      on,
    });
    return this;
  }

  /**
   * Add RIGHT JOIN
   */
  rightJoin(table: string | TableSpec, on: SqlFragment): this {
    this._joins.push({
      type: 'right',
      table: typeof table === 'string' ? { name: table } : table,
      on,
    });
    return this;
  }

  /**
   * Add FULL OUTER JOIN
   */
  fullJoin(table: string | TableSpec, on: SqlFragment): this {
    this._joins.push({
      type: 'full',
      table: typeof table === 'string' ? { name: table } : table,
      on,
    });
    return this;
  }

  /**
   * Add ORDER BY clause
   * @example select('users').orderBy('created_at', 'desc')
   */
  orderBy(column: string, direction: SortDirection = 'asc', nulls?: 'first' | 'last'): this {
    this._orderBy.push({ column, direction, nulls });
    return this;
  }

  /**
   * Add GROUP BY clause
   * @example select('orders').columns('user_id', 'COUNT(*)').groupBy('user_id')
   */
  groupBy(...cols: string[]): this {
    this._groupBy.push(...cols);
    return this;
  }

  /**
   * Add HAVING clause (used with GROUP BY)
   * @example select('orders').groupBy('user_id').having(gt('COUNT(*)', 5))
   */
  having(condition: SqlFragment): this {
    this._having = condition;
    return this;
  }

  /**
   * Add LIMIT clause
   * @example select('users').limit(10)
   */
  limit(n: number): this {
    this._limit = n;
    return this;
  }

  /**
   * Add OFFSET clause
   * @example select('users').limit(10).offset(20)
   */
  offset(n: number): this {
    this._offset = n;
    return this;
  }

  /**
   * Add FOR UPDATE (row-level locking)
   * @example select('users').where(eq('id', userId)).forUpdate()
   */
  forUpdate(): this {
    this._forUpdate = true;
    this._forShare = false;
    return this;
  }

  /**
   * Add FOR SHARE (shared row-level locking)
   */
  forShare(): this {
    this._forShare = true;
    this._forUpdate = false;
    return this;
  }

  /**
   * Build the SQL query
   */
  toSql(): QueryResult {
    const parts: SqlFragment[] = [];

    // SELECT [DISTINCT] columns
    const selectKeyword = this._distinct ? 'SELECT DISTINCT' : 'SELECT';

    // Build column list from regular columns and computed columns
    const columnParts: string[] = [];
    const columnValues: unknown[] = [];

    // Add regular columns
    for (const col of this._columns) {
      if (col === '*') {
        columnParts.push('*');
      } else {
        columnParts.push(escapeIdentifier(col));
      }
    }

    // Add computed columns (window functions, expressions, etc.)
    for (const computed of this._computedColumns) {
      // Renumber parameters in the expression
      let exprText = computed.expr.text;
      for (let i = computed.expr.values.length; i >= 1; i--) {
        exprText = exprText.replace(
          new RegExp(`\\$${String(i)}(?!\\d)`, 'g'),
          `$${String(columnValues.length + i)}`,
        );
      }

      if (computed.alias) {
        columnParts.push(`${exprText} AS ${escapeIdentifier(computed.alias)}`);
      } else {
        columnParts.push(exprText);
      }
      columnValues.push(...computed.expr.values);
    }

    const columnList = columnParts.join(', ');
    parts.push({ text: `${selectKeyword} ${columnList}`, values: columnValues });

    // FROM table
    parts.push({ text: `FROM ${formatTable(this._table)}`, values: [] });

    // JOINs
    for (const join of this._joins) {
      const joinType = join.type.toUpperCase();
      const joinText = `${joinType} JOIN ${formatTable(join.table)} ON ${join.on.text}`;
      parts.push({ text: joinText, values: [...join.on.values] });
    }

    // WHERE
    if (this._where && this._where.text) {
      parts.push({ text: `WHERE ${this._where.text}`, values: [...this._where.values] });
    }

    // GROUP BY
    if (this._groupBy.length > 0) {
      const groupCols = this._groupBy.map(escapeIdentifier).join(', ');
      parts.push({ text: `GROUP BY ${groupCols}`, values: [] });
    }

    // HAVING
    if (this._having && this._having.text) {
      parts.push({ text: `HAVING ${this._having.text}`, values: [...this._having.values] });
    }

    // ORDER BY
    if (this._orderBy.length > 0) {
      const orderClauses = this._orderBy.map((spec) => {
        let clause = `${escapeIdentifier(spec.column)} ${spec.direction.toUpperCase()}`;
        if (spec.nulls) {
          clause += ` NULLS ${spec.nulls.toUpperCase()}`;
        }
        return clause;
      });
      parts.push({ text: `ORDER BY ${orderClauses.join(', ')}`, values: [] });
    }

    // LIMIT
    if (this._limit !== null) {
      parts.push({ text: `LIMIT ${String(this._limit)}`, values: [] });
    }

    // OFFSET
    if (this._offset !== null) {
      parts.push({ text: `OFFSET ${String(this._offset)}`, values: [] });
    }

    // FOR UPDATE / FOR SHARE
    if (this._forUpdate) {
      parts.push({ text: 'FOR UPDATE', values: [] });
    } else if (this._forShare) {
      parts.push({ text: 'FOR SHARE', values: [] });
    }

    // Combine all parts and renumber parameters
    const combined = combine(parts, ' ');

    return { text: combined.text, values: combined.values };
  }
}

/**
 * Create a new SelectBuilder
 * @example select('users').columns('id', 'email').where(eq('active', true))
 */
export function select(table: string | TableSpec): SelectBuilder {
  return new SelectBuilder(table);
}

/**
 * Shorthand for SELECT COUNT(*) FROM table
 * @example selectCount('users').where(eq('active', true))
 */
export function selectCount(table: string | TableSpec): SelectBuilder {
  return new SelectBuilder(table).columns().column(raw('COUNT(*)'), 'count');
}

/**
 * Shorthand for SELECT EXISTS (subquery)
 */
export function selectExists(subquery: QueryResult): QueryResult {
  return {
    text: `SELECT EXISTS (${subquery.text})`,
    values: subquery.values,
  };
}
