// packages/db/src/builder/types.ts

/**
 * SQL Fragment - the fundamental building block of the query builder.
 * Represents a parameterized SQL string with its values.
 *
 * IMPORTANT: All values MUST be parameterized. Never interpolate values into text.
 */
export interface SqlFragment {
  /** Parameterized SQL string with $1, $2, etc. placeholders */
  readonly text: string;
  /** Values corresponding to placeholders in text */
  readonly values: readonly unknown[];
}

/**
 * Empty SQL fragment constant - useful for identity operations
 */
export const EMPTY_FRAGMENT: SqlFragment = { text: '', values: [] };

/**
 * Create a SQL fragment from text and values
 */
export function fragment(text: string, values: readonly unknown[] = []): SqlFragment {
  return { text, values };
}

/**
 * Create a raw SQL fragment (no parameterization).
 * WARNING: Only use for trusted static strings like column names or SQL keywords.
 */
export function raw(text: string): SqlFragment {
  return { text, values: [] };
}

/**
 * Create a parameterized value placeholder.
 * Returns ($N, value) where N is based on the provided offset.
 */
export function param(value: unknown, paramIndex: number): SqlFragment {
  return { text: `$${String(paramIndex)}`, values: [value] };
}

/**
 * Combine multiple SQL fragments into one.
 * Renumbers parameters automatically.
 */
export function combine(fragments: SqlFragment[], separator = ' '): SqlFragment {
  if (fragments.length === 0) {
    return EMPTY_FRAGMENT;
  }

  const allValues: unknown[] = [];
  const textParts: string[] = [];

  for (const frag of fragments) {
    if (frag.text === '') continue;

    // Renumber parameters
    let renumberedText = frag.text;
    for (let i = frag.values.length; i >= 1; i--) {
      const newIndex = allValues.length + i;
      renumberedText = renumberedText.replace(
        new RegExp(`\\$${String(i)}(?!\\d)`, 'g'),
        `$${String(newIndex)}`,
      );
    }

    textParts.push(renumberedText);
    allValues.push(...frag.values);
  }

  return { text: textParts.join(separator), values: allValues };
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort specification
 */
export interface SortSpec {
  column: string;
  direction: SortDirection;
  nulls?: 'first' | 'last';
}

/**
 * Query result from toSql() methods
 */
export interface QueryResult {
  readonly text: string;
  readonly values: readonly unknown[];
}

/**
 * Base interface for all query builders
 */
export interface QueryBuilder {
  toSql(): QueryResult;
}

/**
 * Table specification for queries
 */
export interface TableSpec {
  name: string;
  alias?: string;
  schema?: string;
  subquery?: SqlFragment;
}

/**
 * Join specification
 */
export interface JoinSpec {
  type: 'inner' | 'left' | 'right' | 'full';
  table: TableSpec;
  on: SqlFragment;
}

/**
 * Column specification for SELECT
 */
export interface ColumnSpec {
  expression: string | SqlFragment;
  alias?: string;
}

/**
 * Value type for database operations
 * Supports common PostgreSQL types
 */
export type DbValue =
  | string
  | number
  | boolean
  | Date
  | null
  | Buffer
  | DbValue[]
  | Record<string, unknown>;

/**
 * Type-safe identifier escaping.
 * Uses double quotes for PostgreSQL identifiers.
 */
export function escapeIdentifier(name: string): string {
  // Check for valid identifier characters
  if (!/^[\w]+$/i.test(name)) {
    // Contains special characters - quote it
    return `"${name.replace(/"/g, '""')}"`;
  }
  // Simple alphanumeric - no quoting needed
  return name;
}

/**
 * Format a table name with optional schema or subquery
 */
export function formatTable(table: TableSpec): SqlFragment {
  let text = '';
  let values: unknown[] = [];

  if (table.subquery !== undefined) {
    // For subqueries, wrap in parentheses if not already
    text = `(${table.subquery.text})`;
    values = [...table.subquery.values];
  } else {
    if (table.schema !== undefined && table.schema !== '') {
      text = escapeIdentifier(table.schema) + '.';
    }
    text += escapeIdentifier(table.name);
  }

  if (table.alias !== undefined && table.alias !== '') {
    text += ' AS ' + escapeIdentifier(table.alias);
  }
  return { text, values };
}
