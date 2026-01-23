// packages/db/src/builder/cte.ts
/**
 * CTE (Common Table Expressions) - WITH clause builders
 *
 * Provides a fluent API for building PostgreSQL CTEs.
 *
 * @example
 * // Simple CTE
 * withCte('active_users', select('users').where(eq('status', 'active')))
 *   .select('active_users')
 *   .columns('id', 'name')
 *   .toSql()
 *
 * // Multiple CTEs
 * withCte('recent_orders', select('orders').where(gt('created_at', date)))
 *   .withCte('high_value', select('recent_orders').where(gt('total', 1000)))
 *   .select('high_value')
 *   .toSql()
 *
 * // Recursive CTE
 * withRecursiveCte('tree',
 *   select('categories').where(isNull('parent_id')),
 *   select('categories').innerJoin('tree', colEq('categories.parent_id', 'tree.id'))
 * )
 * .select('tree')
 * .toSql()
 */

import { DeleteBuilder } from './delete';
import { InsertBuilder } from './insert';
import { SelectBuilder } from './select';
import { combine, type QueryBuilder, type QueryResult, type TableSpec } from './types';
import { UpdateBuilder } from './update';

// ============================================================================
// Types
// ============================================================================

/**
 * A CTE definition
 */
interface CteDefinition {
  name: string;
  query: QueryBuilder;
  columnNames?: string[];
  recursive?: {
    base: QueryBuilder;
    recursive: QueryBuilder;
  };
}

/**
 * CTE builder interface
 */
export interface CteBuilder {
  /**
   * Add another CTE to the WITH clause
   * @example .withCte('high_value', select('recent_orders').where(gt('total', 1000)))
   */
  withCte(name: string, query: QueryBuilder, columnNames?: string[]): CteBuilder;

  /**
   * Add a recursive CTE
   * @example .withRecursiveCte('tree', baseQuery, recursiveQuery)
   */
  withRecursiveCte(
    name: string,
    base: QueryBuilder,
    recursive: QueryBuilder,
    columnNames?: string[],
  ): CteBuilder;

  /**
   * Start a SELECT query that can reference the CTEs
   * @example .select('active_users').columns('id', 'name')
   */
  select(table: string | TableSpec): CteSelectBuilder;

  /**
   * Start an INSERT query that can reference the CTEs
   * @example .insert('archive').values(...)
   */
  insert(table: string | TableSpec): CteInsertBuilder;

  /**
   * Start an UPDATE query that can reference the CTEs
   * @example .update('users').set(...).where(...)
   */
  update(table: string | TableSpec): CteUpdateBuilder;

  /**
   * Start a DELETE query that can reference the CTEs
   * @example .deleteFrom('old_records').where(...)
   */
  deleteFrom(table: string | TableSpec): CteDeleteBuilder;
}

/**
 * CTE-enabled SelectBuilder
 */
export interface CteSelectBuilder extends QueryBuilder {
  columns(...cols: string[]): CteSelectBuilder;
  distinct(): CteSelectBuilder;
  where(condition: { text: string; values: readonly unknown[] }): CteSelectBuilder;
  innerJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder;
  leftJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder;
  rightJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder;
  fullJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder;
  orderBy(column: string, direction?: 'asc' | 'desc', nulls?: 'first' | 'last'): CteSelectBuilder;
  groupBy(...cols: string[]): CteSelectBuilder;
  having(condition: { text: string; values: readonly unknown[] }): CteSelectBuilder;
  limit(n: number): CteSelectBuilder;
  offset(n: number): CteSelectBuilder;
  forUpdate(): CteSelectBuilder;
  forShare(): CteSelectBuilder;
}

/**
 * CTE-enabled InsertBuilder
 */
export interface CteInsertBuilder extends QueryBuilder {
  values(row: Record<string, unknown>): CteInsertBuilder;
  valuesMany(rows: Record<string, unknown>[]): CteInsertBuilder;
  returning(...cols: string[]): CteInsertBuilder;
  returningAll(): CteInsertBuilder;
  onConflictDoNothing(columns?: string | string[]): CteInsertBuilder;
  onConflictConstraintDoNothing(constraint: string): CteInsertBuilder;
  onConflictDoUpdate(
    columns: string | string[],
    updateColumns: string[],
    where?: { text: string; values: readonly unknown[] },
  ): CteInsertBuilder;
}

/**
 * CTE-enabled UpdateBuilder
 */
export interface CteUpdateBuilder extends QueryBuilder {
  set(values: Record<string, unknown>): CteUpdateBuilder;
  setRaw(column: string, expression: string): CteUpdateBuilder;
  increment(column: string, amount?: number): CteUpdateBuilder;
  decrement(column: string, amount?: number): CteUpdateBuilder;
  where(condition: { text: string; values: readonly unknown[] }): CteUpdateBuilder;
  from(table: string | TableSpec): CteUpdateBuilder;
  returning(...cols: string[]): CteUpdateBuilder;
  returningAll(): CteUpdateBuilder;
}

/**
 * CTE-enabled DeleteBuilder
 */
export interface CteDeleteBuilder extends QueryBuilder {
  where(condition: { text: string; values: readonly unknown[] }): CteDeleteBuilder;
  using(table: string | TableSpec): CteDeleteBuilder;
  returning(...cols: string[]): CteDeleteBuilder;
  returningAll(): CteDeleteBuilder;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Build the WITH clause from CTE definitions
 */
function buildWithClause(ctes: CteDefinition[]): QueryResult {
  const hasRecursive = ctes.some((cte) => cte.recursive);
  const keyword = hasRecursive ? 'WITH RECURSIVE' : 'WITH';

  const cteParts: QueryResult[] = [];

  for (const cte of ctes) {
    const columnList = cte.columnNames ? ` (${cte.columnNames.join(', ')})` : '';

    if (cte.recursive) {
      // Recursive CTE: base UNION ALL recursive
      const baseQuery = cte.recursive.base.toSql();
      const recursiveQuery = cte.recursive.recursive.toSql();

      // Renumber recursive query parameters
      let recursiveText = recursiveQuery.text;
      for (let i = recursiveQuery.values.length; i >= 1; i--) {
        recursiveText = recursiveText.replace(
          new RegExp(`\\$${String(i)}(?!\\d)`, 'g'),
          `$${String(baseQuery.values.length + i)}`,
        );
      }

      cteParts.push({
        text: `${cte.name}${columnList} AS (${baseQuery.text} UNION ALL ${recursiveText})`,
        values: [...baseQuery.values, ...recursiveQuery.values],
      });
    } else {
      const query = cte.query.toSql();
      cteParts.push({
        text: `${cte.name}${columnList} AS (${query.text})`,
        values: query.values,
      });
    }
  }

  const combined = combine(cteParts, ', ');
  return {
    text: `${keyword} ${combined.text}`,
    values: combined.values,
  };
}

/**
 * Combine CTE WITH clause with main query
 */
function combineWithMain(withClause: QueryResult, mainQuery: QueryResult): QueryResult {
  // Renumber main query parameters
  let mainText = mainQuery.text;
  for (let i = mainQuery.values.length; i >= 1; i--) {
    mainText = mainText.replace(
      new RegExp(`\\$${String(i)}(?!\\d)`, 'g'),
      `$${String(withClause.values.length + i)}`,
    );
  }

  return {
    text: `${withClause.text} ${mainText}`,
    values: [...withClause.values, ...mainQuery.values],
  };
}

// ============================================================================
// CteBuilder Implementation
// ============================================================================

class CteBuilderImpl implements CteBuilder {
  private _ctes: CteDefinition[] = [];

  constructor(name: string, query: QueryBuilder, columnNames?: string[]) {
    this._ctes.push({ name, query, columnNames });
  }

  static fromRecursive(
    name: string,
    base: QueryBuilder,
    recursive: QueryBuilder,
    columnNames?: string[],
  ): CteBuilderImpl {
    const builder = new CteBuilderImpl(name, base, columnNames);
    builder._ctes[0] = { name, query: base, columnNames, recursive: { base, recursive } };
    return builder;
  }

  withCte(name: string, query: QueryBuilder, columnNames?: string[]): CteBuilder {
    this._ctes.push({ name, query, columnNames });
    return this;
  }

  withRecursiveCte(
    name: string,
    base: QueryBuilder,
    recursive: QueryBuilder,
    columnNames?: string[],
  ): CteBuilder {
    this._ctes.push({
      name,
      query: base,
      columnNames,
      recursive: { base, recursive },
    });
    return this;
  }

  select(table: string | TableSpec): CteSelectBuilder {
    return new CteSelectBuilderImpl(this._ctes, table);
  }

  insert(table: string | TableSpec): CteInsertBuilder {
    return new CteInsertBuilderImpl(this._ctes, table);
  }

  update(table: string | TableSpec): CteUpdateBuilder {
    return new CteUpdateBuilderImpl(this._ctes, table);
  }

  deleteFrom(table: string | TableSpec): CteDeleteBuilder {
    return new CteDeleteBuilderImpl(this._ctes, table);
  }
}

// ============================================================================
// CTE-Wrapped Builders
// ============================================================================

class CteSelectBuilderImpl implements CteSelectBuilder {
  private _ctes: CteDefinition[];
  private _builder: SelectBuilder;

  constructor(ctes: CteDefinition[], table: string | TableSpec) {
    this._ctes = ctes;
    this._builder = new SelectBuilder(table);
  }

  columns(...cols: string[]): CteSelectBuilder {
    this._builder.columns(...cols);
    return this;
  }

  distinct(): CteSelectBuilder {
    this._builder.distinct();
    return this;
  }

  where(condition: { text: string; values: readonly unknown[] }): CteSelectBuilder {
    this._builder.where(condition);
    return this;
  }

  innerJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder {
    this._builder.innerJoin(table, on);
    return this;
  }

  leftJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder {
    this._builder.leftJoin(table, on);
    return this;
  }

  rightJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder {
    this._builder.rightJoin(table, on);
    return this;
  }

  fullJoin(
    table: string | TableSpec,
    on: { text: string; values: readonly unknown[] },
  ): CteSelectBuilder {
    this._builder.fullJoin(table, on);
    return this;
  }

  orderBy(column: string, direction?: 'asc' | 'desc', nulls?: 'first' | 'last'): CteSelectBuilder {
    this._builder.orderBy(column, direction, nulls);
    return this;
  }

  groupBy(...cols: string[]): CteSelectBuilder {
    this._builder.groupBy(...cols);
    return this;
  }

  having(condition: { text: string; values: readonly unknown[] }): CteSelectBuilder {
    this._builder.having(condition);
    return this;
  }

  limit(n: number): CteSelectBuilder {
    this._builder.limit(n);
    return this;
  }

  offset(n: number): CteSelectBuilder {
    this._builder.offset(n);
    return this;
  }

  forUpdate(): CteSelectBuilder {
    this._builder.forUpdate();
    return this;
  }

  forShare(): CteSelectBuilder {
    this._builder.forShare();
    return this;
  }

  toSql(): QueryResult {
    const withClause = buildWithClause(this._ctes);
    const mainQuery = this._builder.toSql();
    return combineWithMain(withClause, mainQuery);
  }
}

class CteInsertBuilderImpl implements CteInsertBuilder {
  private _ctes: CteDefinition[];
  private _builder: InsertBuilder;

  constructor(ctes: CteDefinition[], table: string | TableSpec) {
    this._ctes = ctes;
    this._builder = new InsertBuilder(table);
  }

  values(row: Record<string, unknown>): CteInsertBuilder {
    this._builder.values(row);
    return this;
  }

  valuesMany(rows: Record<string, unknown>[]): CteInsertBuilder {
    this._builder.valuesMany(rows);
    return this;
  }

  returning(...cols: string[]): CteInsertBuilder {
    this._builder.returning(...cols);
    return this;
  }

  returningAll(): CteInsertBuilder {
    this._builder.returningAll();
    return this;
  }

  onConflictDoNothing(columns?: string | string[]): CteInsertBuilder {
    this._builder.onConflictDoNothing(columns);
    return this;
  }

  onConflictConstraintDoNothing(constraint: string): CteInsertBuilder {
    this._builder.onConflictConstraintDoNothing(constraint);
    return this;
  }

  onConflictDoUpdate(
    columns: string | string[],
    updateColumns: string[],
    where?: { text: string; values: readonly unknown[] },
  ): CteInsertBuilder {
    this._builder.onConflictDoUpdate(columns, updateColumns, where);
    return this;
  }

  toSql(): QueryResult {
    const withClause = buildWithClause(this._ctes);
    const mainQuery = this._builder.toSql();
    return combineWithMain(withClause, mainQuery);
  }
}

class CteUpdateBuilderImpl implements CteUpdateBuilder {
  private _ctes: CteDefinition[];
  private _builder: UpdateBuilder;

  constructor(ctes: CteDefinition[], table: string | TableSpec) {
    this._ctes = ctes;
    this._builder = new UpdateBuilder(table);
  }

  set(values: Record<string, unknown>): CteUpdateBuilder {
    this._builder.set(values);
    return this;
  }

  setRaw(column: string, expression: string): CteUpdateBuilder {
    this._builder.setRaw(column, expression);
    return this;
  }

  increment(column: string, amount?: number): CteUpdateBuilder {
    this._builder.increment(column, amount);
    return this;
  }

  decrement(column: string, amount?: number): CteUpdateBuilder {
    this._builder.decrement(column, amount);
    return this;
  }

  where(condition: { text: string; values: readonly unknown[] }): CteUpdateBuilder {
    this._builder.where(condition);
    return this;
  }

  from(table: string | TableSpec): CteUpdateBuilder {
    this._builder.from(table);
    return this;
  }

  returning(...cols: string[]): CteUpdateBuilder {
    this._builder.returning(...cols);
    return this;
  }

  returningAll(): CteUpdateBuilder {
    this._builder.returningAll();
    return this;
  }

  toSql(): QueryResult {
    const withClause = buildWithClause(this._ctes);
    const mainQuery = this._builder.toSql();
    return combineWithMain(withClause, mainQuery);
  }
}

class CteDeleteBuilderImpl implements CteDeleteBuilder {
  private _ctes: CteDefinition[];
  private _builder: DeleteBuilder;

  constructor(ctes: CteDefinition[], table: string | TableSpec) {
    this._ctes = ctes;
    this._builder = new DeleteBuilder(table);
  }

  where(condition: { text: string; values: readonly unknown[] }): CteDeleteBuilder {
    this._builder.where(condition);
    return this;
  }

  using(table: string | TableSpec): CteDeleteBuilder {
    this._builder.using(table);
    return this;
  }

  returning(...cols: string[]): CteDeleteBuilder {
    this._builder.returning(...cols);
    return this;
  }

  returningAll(): CteDeleteBuilder {
    this._builder.returningAll();
    return this;
  }

  toSql(): QueryResult {
    const withClause = buildWithClause(this._ctes);
    const mainQuery = this._builder.toSql();
    return combineWithMain(withClause, mainQuery);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a CTE (Common Table Expression) builder
 *
 * @example
 * // Simple CTE
 * withCte('active_users', select('users').where(eq('status', 'active')))
 *   .select('active_users')
 *   .columns('id', 'name')
 *   .toSql()
 *
 * // Multiple CTEs
 * withCte('recent', select('orders').where(gt('created_at', date)))
 *   .withCte('large', select('recent').where(gt('total', 1000)))
 *   .select('large')
 *   .toSql()
 */
export function withCte(name: string, query: QueryBuilder, columnNames?: string[]): CteBuilder {
  return new CteBuilderImpl(name, query, columnNames);
}

/**
 * Create a recursive CTE builder
 *
 * @example
 * // Recursive category tree
 * withRecursiveCte('tree',
 *   select('categories').where(isNull('parent_id')),
 *   select('categories')
 *     .innerJoin('tree', colEq('categories.parent_id', 'tree.id'))
 * )
 * .select('tree')
 * .columns('id', 'name', 'parent_id')
 * .toSql()
 */
export function withRecursiveCte(
  name: string,
  base: QueryBuilder,
  recursive: QueryBuilder,
  columnNames?: string[],
): CteBuilder {
  return CteBuilderImpl.fromRecursive(name, base, recursive, columnNames);
}
