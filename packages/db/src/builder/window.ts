// packages/db/src/builder/window.ts
/**
 * Window Functions - SQL window function builders
 *
 * Provides a fluent API for building PostgreSQL window functions.
 *
 * @example
 * // ROW_NUMBER
 * select('orders')
 *   .column(rowNumber().over(partitionBy('user_id').orderBy('created_at', 'desc')))
 *   .toSql()
 *
 * // Aggregate as window function
 * select('sales')
 *   .column(sum('amount').over(partitionBy('region')))
 *   .toSql()
 */

import { escapeIdentifier, type SqlFragment } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Frame bound for window frame specification
 */
export type FrameBound =
  | 'unbounded preceding'
  | 'current row'
  | 'unbounded following'
  | { preceding: number }
  | { following: number };

/**
 * Window specification for OVER clause
 */
export interface WindowSpec {
  partitionBy(...columns: string[]): WindowSpec;
  orderBy(column: string, direction?: 'asc' | 'desc'): WindowSpec;
  rows(start: FrameBound, end?: FrameBound): WindowSpec;
  range(start: FrameBound, end?: FrameBound): WindowSpec;
  toSql(): string;
}

/**
 * Window expression with OVER clause applied
 */
export interface WindowExpr extends SqlFragment {
  as(alias: string): AliasedWindowExpr;
}

/**
 * Aliased window expression
 */
export interface AliasedWindowExpr extends SqlFragment {
  readonly alias: string;
}

/**
 * Window function that requires an OVER clause
 */
export interface WindowFunction {
  over(spec?: WindowSpec): WindowExpr;
}

/**
 * Aggregate function that can be used with or without OVER
 */
export interface AggregateFunction extends WindowFunction {
  toSql(): SqlFragment;
}

// ============================================================================
// Window Specification Builder
// ============================================================================

class WindowSpecBuilder implements WindowSpec {
  private _partitionBy: string[] = [];
  private _orderBy: Array<{ column: string; direction: 'asc' | 'desc' }> = [];
  private _frame: { type: 'rows' | 'range'; start: FrameBound; end?: FrameBound } | null = null;

  partitionBy(...columns: string[]): WindowSpec {
    this._partitionBy.push(...columns);
    return this;
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): WindowSpec {
    this._orderBy.push({ column, direction });
    return this;
  }

  rows(start: FrameBound, end?: FrameBound): WindowSpec {
    this._frame = { type: 'rows', start, end };
    return this;
  }

  range(start: FrameBound, end?: FrameBound): WindowSpec {
    this._frame = { type: 'range', start, end };
    return this;
  }

  toSql(): string {
    const parts: string[] = [];

    if (this._partitionBy.length > 0) {
      parts.push(`PARTITION BY ${this._partitionBy.map(escapeIdentifier).join(', ')}`);
    }

    if (this._orderBy.length > 0) {
      const orderClauses = this._orderBy.map(
        (o) => `${escapeIdentifier(o.column)} ${o.direction.toUpperCase()}`,
      );
      parts.push(`ORDER BY ${orderClauses.join(', ')}`);
    }

    if (this._frame) {
      const frameType = this._frame.type.toUpperCase();
      const startBound = formatFrameBound(this._frame.start);
      if (this._frame.end) {
        const endBound = formatFrameBound(this._frame.end);
        parts.push(`${frameType} BETWEEN ${startBound} AND ${endBound}`);
      } else {
        parts.push(`${frameType} ${startBound}`);
      }
    }

    return parts.join(' ');
  }
}

function formatFrameBound(bound: FrameBound): string {
  if (typeof bound === 'string') {
    return bound.toUpperCase();
  }
  if ('preceding' in bound) {
    return `${String(bound.preceding)} PRECEDING`;
  }
  return `${String(bound.following)} FOLLOWING`;
}

// ============================================================================
// Window Expression Implementation
// ============================================================================

class WindowExprImpl implements WindowExpr {
  readonly text: string;
  readonly values: readonly unknown[];

  constructor(funcText: string, funcValues: readonly unknown[], spec?: WindowSpec) {
    const overClause = spec ? `OVER (${spec.toSql()})` : 'OVER ()';
    this.text = `${funcText} ${overClause}`;
    this.values = funcValues;
  }

  as(alias: string): AliasedWindowExpr {
    return {
      text: `${this.text} AS ${escapeIdentifier(alias)}`,
      values: this.values,
      alias,
    };
  }
}

// ============================================================================
// Window Function Implementations
// ============================================================================

class WindowFunctionImpl implements WindowFunction {
  constructor(
    private readonly funcText: string,
    private readonly funcValues: readonly unknown[] = [],
  ) {}

  over(spec?: WindowSpec): WindowExpr {
    return new WindowExprImpl(this.funcText, this.funcValues, spec);
  }
}

class AggregateFunctionImpl implements AggregateFunction {
  constructor(
    private readonly funcText: string,
    private readonly funcValues: readonly unknown[] = [],
  ) {}

  over(spec?: WindowSpec): WindowExpr {
    return new WindowExprImpl(this.funcText, this.funcValues, spec);
  }

  toSql(): SqlFragment {
    return { text: this.funcText, values: [...this.funcValues] };
  }
}

// ============================================================================
// Window Specification Helpers
// ============================================================================

/**
 * Create a window specification starting with PARTITION BY
 * @example partitionBy('user_id', 'region').orderBy('created_at', 'desc')
 */
export function partitionBy(...columns: string[]): WindowSpec {
  return new WindowSpecBuilder().partitionBy(...columns);
}

/**
 * Create a window specification starting with ORDER BY
 * @example orderBy('created_at', 'desc')
 */
export function orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): WindowSpec {
  return new WindowSpecBuilder().orderBy(column, direction);
}

/**
 * Create an empty window specification
 * @example emptyWindow().rows('unbounded preceding', 'current row')
 */
export function emptyWindow(): WindowSpec {
  return new WindowSpecBuilder();
}

// ============================================================================
// Ranking Window Functions
// ============================================================================

/**
 * ROW_NUMBER() - assigns sequential numbers to rows
 * @example rowNumber().over(partitionBy('user_id').orderBy('created_at'))
 */
export function rowNumber(): WindowFunction {
  return new WindowFunctionImpl('ROW_NUMBER()');
}

/**
 * RANK() - assigns rank with gaps for ties
 * @example rank().over(orderBy('score', 'desc'))
 */
export function rank(): WindowFunction {
  return new WindowFunctionImpl('RANK()');
}

/**
 * DENSE_RANK() - assigns rank without gaps for ties
 * @example denseRank().over(orderBy('score', 'desc'))
 */
export function denseRank(): WindowFunction {
  return new WindowFunctionImpl('DENSE_RANK()');
}

/**
 * NTILE(n) - distributes rows into n buckets
 * @example ntile(4).over(orderBy('value'))
 */
export function ntile(buckets: number): WindowFunction {
  return new WindowFunctionImpl(`NTILE(${String(buckets)})`);
}

/**
 * PERCENT_RANK() - relative rank as percentage (0 to 1)
 * @example percentRank().over(orderBy('score', 'desc'))
 */
export function percentRank(): WindowFunction {
  return new WindowFunctionImpl('PERCENT_RANK()');
}

/**
 * CUME_DIST() - cumulative distribution (fraction of rows <= current)
 * @example cumeDist().over(orderBy('score'))
 */
export function cumeDist(): WindowFunction {
  return new WindowFunctionImpl('CUME_DIST()');
}

// ============================================================================
// Value Window Functions
// ============================================================================

/**
 * LAG(column, offset, default) - access value from previous row
 * @example lag('value', 1).over(orderBy('timestamp'))
 */
export function lag(column: string, offset = 1, defaultVal?: unknown): WindowFunction {
  const col = escapeIdentifier(column);
  if (defaultVal !== undefined) {
    return new WindowFunctionImpl(`LAG(${col}, ${String(offset)}, $1)`, [defaultVal]);
  }
  return new WindowFunctionImpl(`LAG(${col}, ${String(offset)})`);
}

/**
 * LEAD(column, offset, default) - access value from following row
 * @example lead('value', 1).over(orderBy('timestamp'))
 */
export function lead(column: string, offset = 1, defaultVal?: unknown): WindowFunction {
  const col = escapeIdentifier(column);
  if (defaultVal !== undefined) {
    return new WindowFunctionImpl(`LEAD(${col}, ${String(offset)}, $1)`, [defaultVal]);
  }
  return new WindowFunctionImpl(`LEAD(${col}, ${String(offset)})`);
}

/**
 * FIRST_VALUE(column) - value of first row in frame
 * @example firstValue('price').over(partitionBy('product_id').orderBy('date'))
 */
export function firstValue(column: string): WindowFunction {
  return new WindowFunctionImpl(`FIRST_VALUE(${escapeIdentifier(column)})`);
}

/**
 * LAST_VALUE(column) - value of last row in frame
 * @example lastValue('price').over(partitionBy('product_id').orderBy('date'))
 */
export function lastValue(column: string): WindowFunction {
  return new WindowFunctionImpl(`LAST_VALUE(${escapeIdentifier(column)})`);
}

/**
 * NTH_VALUE(column, n) - value of nth row in frame
 * @example nthValue('price', 2).over(partitionBy('product_id').orderBy('date'))
 */
export function nthValue(column: string, n: number): WindowFunction {
  return new WindowFunctionImpl(`NTH_VALUE(${escapeIdentifier(column)}, ${String(n)})`);
}

// ============================================================================
// Aggregate Functions (can be used as window functions)
// ============================================================================

/**
 * SUM(column) - sum of values
 * @example sum('amount').over(partitionBy('region'))
 */
export function sum(column: string): AggregateFunction {
  return new AggregateFunctionImpl(`SUM(${escapeIdentifier(column)})`);
}

/**
 * AVG(column) - average of values
 * @example avg('amount').over(partitionBy('region'))
 */
export function avg(column: string): AggregateFunction {
  return new AggregateFunctionImpl(`AVG(${escapeIdentifier(column)})`);
}

/**
 * COUNT(column) - count of values (or COUNT(*) if no column)
 * @example count().over(partitionBy('user_id'))
 */
export function count(column?: string): AggregateFunction {
  const expr = column ? escapeIdentifier(column) : '*';
  return new AggregateFunctionImpl(`COUNT(${expr})`);
}

/**
 * MIN(column) - minimum value
 * @example min('price').over(partitionBy('category'))
 */
export function min(column: string): AggregateFunction {
  return new AggregateFunctionImpl(`MIN(${escapeIdentifier(column)})`);
}

/**
 * MAX(column) - maximum value
 * @example max('price').over(partitionBy('category'))
 */
export function max(column: string): AggregateFunction {
  return new AggregateFunctionImpl(`MAX(${escapeIdentifier(column)})`);
}

/**
 * STRING_AGG(column, delimiter) - concatenate strings
 * @example stringAgg('name', ', ').over(partitionBy('group'))
 */
export function stringAgg(column: string, delimiter: string): AggregateFunction {
  return new AggregateFunctionImpl(`STRING_AGG(${escapeIdentifier(column)}, $1)`, [delimiter]);
}

/**
 * ARRAY_AGG(column) - aggregate into array
 * @example arrayAgg('id').over(partitionBy('group'))
 */
export function arrayAgg(column: string): AggregateFunction {
  return new AggregateFunctionImpl(`ARRAY_AGG(${escapeIdentifier(column)})`);
}
