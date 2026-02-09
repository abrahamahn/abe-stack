// src/server/db/src/builder/select.ts
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
} from './types/types';

/**
 * A computed column expression with optional alias
 */
interface ComputedColumn {
  expr: SqlFragment;
  alias?: string;
}

/**
 * Common Table Expression (CTE) definition
 */
interface CteDef {
  alias: string;
  query: SelectBuilder;
}

/**
 * Union definition
 */
interface UnionDef {
  type: 'UNION' | 'UNION ALL';
  query: SelectBuilder;
}

/**
 * SelectBuilder class for constructing SELECT queries
 */
export class SelectBuilder implements QueryBuilder {
  private readonly _table: TableSpec;
  private _columns: string[] = ['*'];
  private readonly _computedColumns: ComputedColumn[] = [];
  private _distinct = false;
  private _where: SqlFragment | null = null;
  private readonly _joins: JoinSpec[] = [];
  private readonly _orderBy: SortSpec[] = [];
  private readonly _groupBy: string[] = [];
  private _having: SqlFragment | null = null;
  private _limit: number | null = null;
  private _offset: number | null = null;
  private _forUpdate = false;
  private _forShare = false;
  private readonly _ctes: CteDef[] = [];
  private readonly _unions: UnionDef[] = [];

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
    if (alias !== undefined && alias !== '' && exprAlias !== undefined && exprAlias !== '') {
      // Remove the " AS alias" suffix from the expression text
      const aliasPattern = new RegExp(` AS ${escapeIdentifier(exprAlias)}$`);
      cleanExpr = {
        text: expr.text.replace(aliasPattern, ''),
        values: expr.values,
      };
    }

    const computedCol: ComputedColumn = { expr: cleanExpr };
    const finalAlias = alias ?? exprAlias;
    if (finalAlias !== undefined) {
      computedCol.alias = finalAlias;
    }
    this._computedColumns.push(computedCol);
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
   * Add a Common Table Expression (CTE)
   * @example select('recent_orders').with('recent_orders', select('orders').limit(10))
   */
  with(alias: string, query: SelectBuilder): this {
    this._ctes.push({ alias, query });
    return this;
  }

  /**
   * Combine with another query using UNION
   */
  union(query: SelectBuilder): this {
    this._unions.push({ type: 'UNION', query });
    return this;
  }

  /**
   * Combine with another query using UNION ALL
   */
  unionAll(query: SelectBuilder): this {
    this._unions.push({ type: 'UNION ALL', query });
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
    const sortSpec: SortSpec = { column, direction };
    if (nulls !== undefined) {
      sortSpec.nulls = nulls;
    }
    this._orderBy.push(sortSpec);
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
   * Return a TableSpec representing this query as a subquery with an alias
   * @example select(select('users').as('u')).columns('u.id')
   */
  as(alias: string): TableSpec {
    const { text, values } = this.toSql();
    return {
      name: alias, // The name is technically unused if subquery is present, but kept for type compliance
      alias: alias,
      subquery: { text, values },
    };
  }

  /**
   * Build the SQL query
   */
  toSql(): QueryResult {
    const parts: SqlFragment[] = [];

    // CTEs
    if (this._ctes.length > 0) {
      const cteParts: string[] = [];
      const cteValues: unknown[] = [];

      for (const cte of this._ctes) {
        const cteQuery = cte.query.toSql();

        // Renumber CTE parameters
        let exprText = cteQuery.text;
        for (let i = cteQuery.values.length; i >= 1; i--) {
          exprText = exprText.replace(
            new RegExp(`\\$${String(i)}(?!\\d)`, 'g'),
            `$${String(cteValues.length + i)}`,
          );
        }

        cteParts.push(`${escapeIdentifier(cte.alias)} AS (${exprText})`);
        cteValues.push(...cteQuery.values);
      }

      parts.push({ text: `WITH ${cteParts.join(', ')}`, values: cteValues });
    }

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

      if (computed.alias !== undefined && computed.alias !== '') {
        columnParts.push(`${exprText} AS ${escapeIdentifier(computed.alias)}`);
      } else {
        columnParts.push(exprText);
      }
      columnValues.push(...computed.expr.values);
    }

    const columnList = columnParts.join(', ');
    parts.push({ text: `${selectKeyword} ${columnList}`, values: columnValues });

    // FROM table
    const tableFragment = formatTable(this._table);
    parts.push({ text: `FROM ${tableFragment.text}`, values: [...tableFragment.values] });

    // JOINs
    for (const join of this._joins) {
      const joinType = join.type.toUpperCase();
      const joinTableFragment = formatTable(join.table);
      const joinText = `${joinType} JOIN ${joinTableFragment.text} ON ${join.on.text}`;
      parts.push({
        text: joinText,
        values: [...joinTableFragment.values, ...join.on.values],
      });
    }

    // WHERE
    if (this._where !== null && this._where.text !== '') {
      parts.push({ text: `WHERE ${this._where.text}`, values: [...this._where.values] });
    }

    // GROUP BY
    if (this._groupBy.length > 0) {
      const groupCols = this._groupBy.map(escapeIdentifier).join(', ');
      parts.push({ text: `GROUP BY ${groupCols}`, values: [] });
    }

    // HAVING
    if (this._having !== null && this._having.text !== '') {
      parts.push({ text: `HAVING ${this._having.text}`, values: [...this._having.values] });
    }

    // UNIONS (before ORDER BY/LIMIT if we treat them as compounding, but syntax varies)
    // Actually standard SQL: q1 UNION q2 ORDER BY is valid for the whole result.
    for (const unionUnion of this._unions) {
      const unionQuery = unionUnion.query.toSql();
      // Values handling in combine() will renumber them
      parts.push({
        text: `${unionUnion.type} ${unionQuery.text}`,
        values: [...unionQuery.values],
      });
    }

    // ORDER BY
    if (this._orderBy.length > 0) {
      const orderClauses = this._orderBy.map((spec) => {
        let clause = `${escapeIdentifier(spec.column)} ${spec.direction.toUpperCase()}`;
        if (spec.nulls !== undefined) {
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
