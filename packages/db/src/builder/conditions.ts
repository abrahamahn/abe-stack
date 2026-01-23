// packages/db/src/builder/conditions.ts
/**
 * SQL Condition Builders
 *
 * Type-safe, parameterized SQL conditions.
 * All values are parameterized - never interpolated into SQL text.
 *
 * @example
 * const condition = and(
 *   eq('email', 'user@example.com'),
 *   gt('created_at', new Date('2024-01-01'))
 * );
 * // { text: '"email" = $1 AND "created_at" > $2', values: ['user@example.com', Date] }
 */

import { combine, escapeIdentifier, EMPTY_FRAGMENT, type SqlFragment } from './types';

// ============================================================================
// Comparison Operators
// ============================================================================

/**
 * Equals: column = value
 * @example eq('email', 'user@example.com') => "email" = $1
 */
export function eq(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} = $1`, values: [value] };
}

/**
 * Not equals: column <> value
 * @example ne('status', 'deleted') => "status" <> $1
 */
export function ne(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} <> $1`, values: [value] };
}

/**
 * Greater than: column > value
 * @example gt('age', 18) => "age" > $1
 */
export function gt(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} > $1`, values: [value] };
}

/**
 * Greater than or equal: column >= value
 * @example gte('score', 100) => "score" >= $1
 */
export function gte(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} >= $1`, values: [value] };
}

/**
 * Less than: column < value
 * @example lt('price', 50) => "price" < $1
 */
export function lt(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} < $1`, values: [value] };
}

/**
 * Less than or equal: column <= value
 * @example lte('quantity', 10) => "quantity" <= $1
 */
export function lte(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} <= $1`, values: [value] };
}

// ============================================================================
// Null Checks
// ============================================================================

/**
 * IS NULL: column IS NULL
 * @example isNull('deleted_at') => "deleted_at" IS NULL
 */
export function isNull(column: string): SqlFragment {
  return { text: `${escapeIdentifier(column)} IS NULL`, values: [] };
}

/**
 * IS NOT NULL: column IS NOT NULL
 * @example isNotNull('email_verified_at') => "email_verified_at" IS NOT NULL
 */
export function isNotNull(column: string): SqlFragment {
  return { text: `${escapeIdentifier(column)} IS NOT NULL`, values: [] };
}

// ============================================================================
// Array/Set Operators
// ============================================================================

/**
 * IN: column IN (value1, value2, ...)
 * Returns a false condition if the array is empty.
 * @example inArray('role', ['admin', 'moderator']) => "role" IN ($1, $2)
 */
export function inArray(column: string, values: readonly unknown[]): SqlFragment {
  if (values.length === 0) {
    // Empty IN clause is always false
    return { text: 'FALSE', values: [] };
  }

  const placeholders = values.map((_, i) => `$${String(i + 1)}`).join(', ');
  return { text: `${escapeIdentifier(column)} IN (${placeholders})`, values: [...values] };
}

/**
 * NOT IN: column NOT IN (value1, value2, ...)
 * Returns a true condition (no-op) if the array is empty.
 * @example notInArray('status', ['deleted', 'archived']) => "status" NOT IN ($1, $2)
 */
export function notInArray(column: string, values: readonly unknown[]): SqlFragment {
  if (values.length === 0) {
    // Empty NOT IN clause is always true
    return { text: 'TRUE', values: [] };
  }

  const placeholders = values.map((_, i) => `$${String(i + 1)}`).join(', ');
  return { text: `${escapeIdentifier(column)} NOT IN (${placeholders})`, values: [...values] };
}

// ============================================================================
// Range Operators
// ============================================================================

/**
 * BETWEEN: column BETWEEN min AND max (inclusive)
 * @example between('age', 18, 65) => "age" BETWEEN $1 AND $2
 */
export function between(column: string, min: unknown, max: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} BETWEEN $1 AND $2`, values: [min, max] };
}

/**
 * NOT BETWEEN: column NOT BETWEEN min AND max
 * @example notBetween('temperature', -10, 50) => "temperature" NOT BETWEEN $1 AND $2
 */
export function notBetween(column: string, min: unknown, max: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} NOT BETWEEN $1 AND $2`, values: [min, max] };
}

// ============================================================================
// String Pattern Matching
// ============================================================================

/**
 * LIKE: column LIKE pattern (case-sensitive)
 * WARNING: Caller must escape wildcards in user input using escapeLikePattern()
 * @example like('name', 'John%') => "name" LIKE $1
 */
export function like(column: string, pattern: string): SqlFragment {
  return { text: `${escapeIdentifier(column)} LIKE $1`, values: [pattern] };
}

/**
 * ILIKE: column ILIKE pattern (case-insensitive, PostgreSQL-specific)
 * WARNING: Caller must escape wildcards in user input using escapeLikePattern()
 * @example ilike('email', '%@gmail.com') => "email" ILIKE $1
 */
export function ilike(column: string, pattern: string): SqlFragment {
  return { text: `${escapeIdentifier(column)} ILIKE $1`, values: [pattern] };
}

/**
 * NOT LIKE: column NOT LIKE pattern (case-sensitive)
 * @example notLike('name', 'Test%') => "name" NOT LIKE $1
 */
export function notLike(column: string, pattern: string): SqlFragment {
  return { text: `${escapeIdentifier(column)} NOT LIKE $1`, values: [pattern] };
}

/**
 * NOT ILIKE: column NOT ILIKE pattern (case-insensitive, PostgreSQL-specific)
 * @example notIlike('email', '%@spam.com') => "email" NOT ILIKE $1
 */
export function notIlike(column: string, pattern: string): SqlFragment {
  return { text: `${escapeIdentifier(column)} NOT ILIKE $1`, values: [pattern] };
}

/**
 * Escape LIKE/ILIKE pattern metacharacters in user input.
 * Use this before passing user input to like() or ilike().
 * @example escapeLikePattern('50% off!') => '50\\% off!'
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Contains: column ILIKE '%value%' (convenience wrapper)
 * Automatically escapes the value for LIKE patterns.
 * @example contains('description', 'search term') => "description" ILIKE $1 with '%search term%'
 */
export function contains(column: string, value: string): SqlFragment {
  return ilike(column, `%${escapeLikePattern(value)}%`);
}

/**
 * Starts with: column ILIKE 'value%' (convenience wrapper)
 * Automatically escapes the value for LIKE patterns.
 * @example startsWith('name', 'John') => "name" ILIKE $1 with 'John%'
 */
export function startsWith(column: string, value: string): SqlFragment {
  return ilike(column, `${escapeLikePattern(value)}%`);
}

/**
 * Ends with: column ILIKE '%value' (convenience wrapper)
 * Automatically escapes the value for LIKE patterns.
 * @example endsWith('email', '@example.com') => "email" ILIKE $1 with '%@example.com'
 */
export function endsWith(column: string, value: string): SqlFragment {
  return ilike(column, `%${escapeLikePattern(value)}`);
}

// ============================================================================
// Logical Operators
// ============================================================================

/**
 * AND: combines multiple conditions with AND
 * @example and(eq('active', true), gt('age', 18)) => ("active" = $1 AND "age" > $2)
 */
export function and(...conditions: SqlFragment[]): SqlFragment {
  const validConditions = conditions.filter((c) => c.text !== '');

  if (validConditions.length === 0) {
    return EMPTY_FRAGMENT;
  }

  if (validConditions.length === 1) {
    return validConditions[0] as SqlFragment;
  }

  const combined = combine(validConditions, ' AND ');
  return { text: `(${combined.text})`, values: combined.values };
}

/**
 * OR: combines multiple conditions with OR
 * @example or(eq('role', 'admin'), eq('role', 'superadmin')) => ("role" = $1 OR "role" = $2)
 */
export function or(...conditions: SqlFragment[]): SqlFragment {
  const validConditions = conditions.filter((c) => c.text !== '');

  if (validConditions.length === 0) {
    return EMPTY_FRAGMENT;
  }

  if (validConditions.length === 1) {
    return validConditions[0] as SqlFragment;
  }

  const combined = combine(validConditions, ' OR ');
  return { text: `(${combined.text})`, values: combined.values };
}

/**
 * NOT: negates a condition
 * @example not(eq('deleted', true)) => NOT ("deleted" = $1)
 */
export function not(condition: SqlFragment): SqlFragment {
  if (condition.text === '') {
    return EMPTY_FRAGMENT;
  }

  return { text: `NOT (${condition.text})`, values: [...condition.values] };
}

// ============================================================================
// PostgreSQL-Specific Operators
// ============================================================================

/**
 * ANY: value = ANY(column) for array columns
 * @example any('tags', 'typescript') => $1 = ANY("tags")
 */
export function any(column: string, value: unknown): SqlFragment {
  return { text: `$1 = ANY(${escapeIdentifier(column)})`, values: [value] };
}

/**
 * Array contains: column @> ARRAY[values]
 * @example arrayContains('tags', ['a', 'b']) => "tags" @> $1
 */
export function arrayContains(column: string, values: readonly unknown[]): SqlFragment {
  return { text: `${escapeIdentifier(column)} @> $1`, values: [values] };
}

/**
 * Array overlaps: column && ARRAY[values]
 * @example arrayOverlaps('tags', ['a', 'b']) => "tags" && $1
 */
export function arrayOverlaps(column: string, values: readonly unknown[]): SqlFragment {
  return { text: `${escapeIdentifier(column)} && $1`, values: [values] };
}

/**
 * JSON field access: column->>'field' = value
 * @example jsonbEq('metadata', 'type', 'premium') => "metadata"->>'type' = $1
 */
export function jsonbEq(column: string, path: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)}->>'${path}' = $1`, values: [value] };
}

/**
 * JSON path exists: column ? key
 * @example jsonbHasKey('metadata', 'premium') => "metadata" ? $1
 */
export function jsonbHasKey(column: string, key: string): SqlFragment {
  return { text: `${escapeIdentifier(column)} ? $1`, values: [key] };
}

/**
 * JSONB contains: column @> value::jsonb
 * Tests if column contains the given JSON value.
 * @example jsonbContains('metadata', { role: 'admin' }) => "metadata" @> $1::jsonb
 */
export function jsonbContains(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} @> $1::jsonb`, values: [JSON.stringify(value)] };
}

/**
 * JSONB contained by: column <@ value::jsonb
 * Tests if column is contained within the given JSON value.
 * @example jsonbContainedBy('metadata', { a: 1, b: 2 }) => "metadata" <@ $1::jsonb
 */
export function jsonbContainedBy(column: string, value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} <@ $1::jsonb`, values: [JSON.stringify(value)] };
}

/**
 * JSONB has any key: column ?| array[keys]
 * Tests if column contains ANY of the given keys.
 * @example jsonbHasAnyKey('metadata', ['a', 'b']) => "metadata" ?| $1
 */
export function jsonbHasAnyKey(column: string, keys: readonly string[]): SqlFragment {
  return { text: `${escapeIdentifier(column)} ?| $1`, values: [keys] };
}

/**
 * JSONB has all keys: column ?& array[keys]
 * Tests if column contains ALL of the given keys.
 * @example jsonbHasAllKeys('metadata', ['a', 'b']) => "metadata" ?& $1
 */
export function jsonbHasAllKeys(column: string, keys: readonly string[]): SqlFragment {
  return { text: `${escapeIdentifier(column)} ?& $1`, values: [keys] };
}

/**
 * JSONB path access: column #> path (returns JSONB)
 * Extracts JSON sub-object at the specified path.
 * @example jsonbPath('metadata', ['user', 'settings']) => "metadata" #> $1
 */
export function jsonbPath(column: string, path: readonly string[]): SqlFragment {
  return { text: `${escapeIdentifier(column)} #> $1`, values: [path] };
}

/**
 * JSONB path text access: column #>> path (returns text)
 * Extracts JSON sub-object at the specified path as text.
 * @example jsonbPathText('metadata', ['user', 'name']) => "metadata" #>> $1
 */
export function jsonbPathText(column: string, path: readonly string[]): SqlFragment {
  return { text: `${escapeIdentifier(column)} #>> $1`, values: [path] };
}

/**
 * JSONB path equality: column #>> path = value
 * Tests if the value at the specified path equals the given value.
 * @example jsonbPathEq('metadata', ['user', 'role'], 'admin') => "metadata" #>> $1 = $2
 */
export function jsonbPathEq(column: string, path: readonly string[], value: unknown): SqlFragment {
  return { text: `${escapeIdentifier(column)} #>> $1 = $2`, values: [path, value] };
}

// ============================================================================
// Raw Expression Support
// ============================================================================

/**
 * Create a raw SQL condition (use with caution - values must still be parameterized)
 * @example rawCondition('EXTRACT(YEAR FROM "created_at") = $1', [2024])
 */
export function rawCondition(text: string, values: unknown[] = []): SqlFragment {
  return { text, values };
}

/**
 * Column-to-column comparison
 * @example colEq('updated_at', 'created_at') => "updated_at" = "created_at"
 */
export function colEq(column1: string, column2: string): SqlFragment {
  return { text: `${escapeIdentifier(column1)} = ${escapeIdentifier(column2)}`, values: [] };
}

/**
 * EXISTS subquery condition
 * @example exists('SELECT 1 FROM orders WHERE user_id = $1', [userId])
 */
export function exists(subquery: string, values: unknown[] = []): SqlFragment {
  return { text: `EXISTS (${subquery})`, values };
}

/**
 * NOT EXISTS subquery condition
 * @example notExists('SELECT 1 FROM banned_users WHERE id = $1', [userId])
 */
export function notExists(subquery: string, values: unknown[] = []): SqlFragment {
  return { text: `NOT EXISTS (${subquery})`, values };
}
