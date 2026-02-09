// src/shared/src/utils/search/operators.ts
/**
 * Filter Operator Implementations
 *
 * In-memory filter evaluation for client-side filtering and testing.
 * Provides a consistent filter behavior across client and server.
 */

import {
  FILTER_OPERATORS,
  LOGICAL_OPERATORS,
  isCompoundFilter,
  isFilterCondition,
  type CompoundFilter,
  type FilterCondition,
  type FilterOperator,
  type FilterPrimitive,
  type FilterValue,
} from './types';

// ============================================================================
// Value Comparison Utilities
// ============================================================================

/**
 * Type guard for FilterPrimitive values.
 * Rejects objects and arrays which cannot be meaningfully compared.
 *
 * @param value - The value to check
 * @returns True if value is string, number, boolean, Date, or null
 * @complexity O(1)
 */
function isFilterPrimitive(value: unknown): value is FilterPrimitive {
  if (value === null) return true;
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean' || value instanceof Date;
}

/**
 * Get a nested field value using dot notation.
 */
export function getFieldValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Compare two primitive values.
 */
function comparePrimitives(a: FilterPrimitive, b: FilterPrimitive): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? 1 : -1;
  }

  // Fallback to string comparison
  return String(a).localeCompare(String(b));
}

/**
 * Normalize a value for comparison.
 */
function normalizeForComparison(value: unknown, caseSensitive: boolean): unknown {
  if (typeof value === 'string' && !caseSensitive) {
    return value.toLowerCase();
  }
  return value;
}

// ============================================================================
// Operator Implementations
// ============================================================================

type OperatorFn = (
  fieldValue: unknown,
  filterValue: FilterValue,
  caseSensitive: boolean,
) => boolean;

/**
 * Equality operator.
 */
function evalEq(fieldValue: unknown, filterValue: FilterValue, caseSensitive: boolean): boolean {
  const normalizedField = normalizeForComparison(fieldValue, caseSensitive);
  const normalizedFilter = normalizeForComparison(filterValue, caseSensitive);

  if (normalizedField instanceof Date && normalizedFilter instanceof Date) {
    return normalizedField.getTime() === normalizedFilter.getTime();
  }

  return normalizedField === normalizedFilter;
}

/**
 * Not equal operator.
 */
function evalNeq(fieldValue: unknown, filterValue: FilterValue, caseSensitive: boolean): boolean {
  return !evalEq(fieldValue, filterValue, caseSensitive);
}

/**
 * Greater than operator.
 */
function evalGt(fieldValue: unknown, filterValue: FilterValue): boolean {
  if (filterValue === null || Array.isArray(filterValue)) {
    return false;
  }
  // Allow Date objects but reject other objects (like {min, max} range)
  if (typeof filterValue === 'object' && !(filterValue instanceof Date)) {
    return false;
  }
  if (!isFilterPrimitive(fieldValue)) return false;
  return comparePrimitives(fieldValue, filterValue) > 0;
}

/**
 * Greater than or equal operator.
 */
function evalGte(fieldValue: unknown, filterValue: FilterValue): boolean {
  if (filterValue === null || Array.isArray(filterValue)) {
    return false;
  }
  // Allow Date objects but reject other objects (like {min, max} range)
  if (typeof filterValue === 'object' && !(filterValue instanceof Date)) {
    return false;
  }
  if (!isFilterPrimitive(fieldValue)) return false;
  return comparePrimitives(fieldValue, filterValue) >= 0;
}

/**
 * Less than operator.
 */
function evalLt(fieldValue: unknown, filterValue: FilterValue): boolean {
  if (filterValue === null || Array.isArray(filterValue)) {
    return false;
  }
  // Allow Date objects but reject other objects (like {min, max} range)
  if (typeof filterValue === 'object' && !(filterValue instanceof Date)) {
    return false;
  }
  if (!isFilterPrimitive(fieldValue)) return false;
  return comparePrimitives(fieldValue, filterValue) < 0;
}

/**
 * Less than or equal operator.
 */
function evalLte(fieldValue: unknown, filterValue: FilterValue): boolean {
  if (filterValue === null || Array.isArray(filterValue)) {
    return false;
  }
  // Allow Date objects but reject other objects (like {min, max} range)
  if (typeof filterValue === 'object' && !(filterValue instanceof Date)) {
    return false;
  }
  if (!isFilterPrimitive(fieldValue)) return false;
  return comparePrimitives(fieldValue, filterValue) <= 0;
}

/**
 * Contains operator (substring match).
 */
function evalContains(
  fieldValue: unknown,
  filterValue: FilterValue,
  caseSensitive: boolean,
): boolean {
  if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') {
    return false;
  }

  const normalizedField = caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const normalizedFilter = caseSensitive ? filterValue : filterValue.toLowerCase();

  return normalizedField.includes(normalizedFilter);
}

/**
 * Starts with operator.
 */
function evalStartsWith(
  fieldValue: unknown,
  filterValue: FilterValue,
  caseSensitive: boolean,
): boolean {
  if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') {
    return false;
  }

  const normalizedField = caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const normalizedFilter = caseSensitive ? filterValue : filterValue.toLowerCase();

  return normalizedField.startsWith(normalizedFilter);
}

/**
 * Ends with operator.
 */
function evalEndsWith(
  fieldValue: unknown,
  filterValue: FilterValue,
  caseSensitive: boolean,
): boolean {
  if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') {
    return false;
  }

  const normalizedField = caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const normalizedFilter = caseSensitive ? filterValue : filterValue.toLowerCase();

  return normalizedField.endsWith(normalizedFilter);
}

/**
 * SQL LIKE pattern matching.
 * Supports % (any characters) and _ (single character) wildcards.
 *
 * Uses an iterative two-pointer algorithm instead of regex to avoid
 * ReDoS (catastrophic backtracking) on adversarial patterns like `%a%a%a%a%a`.
 *
 * @complexity O(n * m) worst case where n = field length, m = pattern length
 */
function evalLike(fieldValue: unknown, filterValue: FilterValue, caseSensitive: boolean): boolean {
  if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') {
    return false;
  }

  const text = caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const pattern = caseSensitive ? filterValue : filterValue.toLowerCase();

  return matchLikePattern(text, pattern);
}

/**
 * Iterative LIKE pattern matcher using two-pointer backtracking.
 * Handles '%' (any sequence) and '_' (single char) wildcards.
 *
 * Algorithm: Advance through text and pattern in lock-step. On '%', record
 * a backtrack point and greedily skip. On mismatch, return to the last '%'
 * backtrack point and consume one more text character.
 *
 * @param text - The string to match against
 * @param pattern - The LIKE pattern with % and _ wildcards
 * @returns true if the text matches the pattern
 * @complexity O(n * m) worst case, O(n + m) typical case
 */
function matchLikePattern(text: string, pattern: string): boolean {
  let ti = 0; // text index
  let pi = 0; // pattern index
  let starIdx = -1; // last '%' position in pattern
  let matchIdx = 0; // text position when last '%' was seen

  while (ti < text.length) {
    if (pi < pattern.length && (pattern[pi] === '_' || pattern[pi] === text[ti])) {
      // Character match or single-char wildcard
      ti++;
      pi++;
    } else if (pi < pattern.length && pattern[pi] === '%') {
      // Record backtrack point for '%' wildcard
      starIdx = pi;
      matchIdx = ti;
      pi++;
    } else if (starIdx !== -1) {
      // Mismatch: backtrack to last '%' and consume one more text char
      pi = starIdx + 1;
      matchIdx++;
      ti = matchIdx;
    } else {
      // No match and no '%' to backtrack to
      return false;
    }
  }

  // Consume trailing '%' wildcards in pattern
  while (pi < pattern.length && pattern[pi] === '%') {
    pi++;
  }

  return pi === pattern.length;
}

/**
 * Case-insensitive LIKE (iLIKE in PostgreSQL).
 */
function evalIlike(fieldValue: unknown, filterValue: FilterValue): boolean {
  return evalLike(fieldValue, filterValue, false);
}

/**
 * In array operator.
 */
function evalIn(fieldValue: unknown, filterValue: FilterValue, caseSensitive: boolean): boolean {
  if (!Array.isArray(filterValue)) {
    return false;
  }

  const normalizedField = normalizeForComparison(fieldValue, caseSensitive);

  return filterValue.some((v) => {
    const normalizedV = normalizeForComparison(v, caseSensitive);
    if (normalizedField instanceof Date && normalizedV instanceof Date) {
      return normalizedField.getTime() === normalizedV.getTime();
    }
    return normalizedField === normalizedV;
  });
}

/**
 * Not in array operator.
 */
function evalNotIn(fieldValue: unknown, filterValue: FilterValue, caseSensitive: boolean): boolean {
  return !evalIn(fieldValue, filterValue, caseSensitive);
}

/**
 * Is null operator.
 */
function evalIsNull(fieldValue: unknown): boolean {
  return fieldValue === null || fieldValue === undefined;
}

/**
 * Is not null operator.
 */
function evalIsNotNull(fieldValue: unknown): boolean {
  return fieldValue !== null && fieldValue !== undefined;
}

/**
 * Between operator (inclusive).
 */
function evalBetween(fieldValue: unknown, filterValue: FilterValue): boolean {
  if (
    filterValue === null ||
    typeof filterValue !== 'object' ||
    Array.isArray(filterValue) ||
    !('min' in filterValue) ||
    !('max' in filterValue)
  ) {
    return false;
  }

  const { min, max } = filterValue;
  if (!isFilterPrimitive(fieldValue)) return false;
  return comparePrimitives(fieldValue, min) >= 0 && comparePrimitives(fieldValue, max) <= 0;
}

/**
 * Array contains operator (field is array, contains value).
 */
function evalArrayContains(
  fieldValue: unknown,
  filterValue: FilterValue,
  caseSensitive: boolean,
): boolean {
  if (!Array.isArray(fieldValue)) {
    return false;
  }

  const normalizedFilter = normalizeForComparison(filterValue, caseSensitive);

  return fieldValue.some((v) => {
    const normalizedV = normalizeForComparison(v, caseSensitive);
    return normalizedV === normalizedFilter;
  });
}

/**
 * Array contains any operator (field is array, contains any of values).
 */
function evalArrayContainsAny(
  fieldValue: unknown,
  filterValue: FilterValue,
  caseSensitive: boolean,
): boolean {
  if (!Array.isArray(fieldValue) || !Array.isArray(filterValue)) {
    return false;
  }

  const normalizedFilterValues = filterValue.map((v) => normalizeForComparison(v, caseSensitive));

  return fieldValue.some((v) => {
    const normalizedV = normalizeForComparison(v, caseSensitive);
    if (!isFilterPrimitive(normalizedV)) return false;
    return normalizedFilterValues.includes(normalizedV);
  });
}

/**
 * Full-text search operator (basic implementation).
 * For production, use a proper full-text search engine.
 */
function evalFullText(
  fieldValue: unknown,
  filterValue: FilterValue,
  caseSensitive: boolean,
): boolean {
  if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') {
    return false;
  }

  const normalizedField = caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const normalizedQuery = caseSensitive ? filterValue : filterValue.toLowerCase();

  // Split query into terms and check if all terms are present
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  return terms.every((term) => normalizedField.includes(term));
}

// ============================================================================
// Operator Registry
// ============================================================================

/**
 * Map of operator names to their implementations.
 */
const OPERATOR_FUNCTIONS: Record<FilterOperator, OperatorFn> = {
  [FILTER_OPERATORS.EQ]: evalEq,
  [FILTER_OPERATORS.NEQ]: evalNeq,
  [FILTER_OPERATORS.GT]: evalGt,
  [FILTER_OPERATORS.GTE]: evalGte,
  [FILTER_OPERATORS.LT]: evalLt,
  [FILTER_OPERATORS.LTE]: evalLte,
  [FILTER_OPERATORS.CONTAINS]: evalContains,
  [FILTER_OPERATORS.StartsWith]: evalStartsWith,
  [FILTER_OPERATORS.EndsWith]: evalEndsWith,
  [FILTER_OPERATORS.LIKE]: evalLike,
  [FILTER_OPERATORS.ILIKE]: evalIlike,
  [FILTER_OPERATORS.IN]: evalIn,
  [FILTER_OPERATORS.NotIn]: evalNotIn,
  [FILTER_OPERATORS.IsNull]: evalIsNull,
  [FILTER_OPERATORS.IsNotNull]: evalIsNotNull,
  [FILTER_OPERATORS.BETWEEN]: evalBetween,
  [FILTER_OPERATORS.ArrayContains]: evalArrayContains,
  [FILTER_OPERATORS.ArrayContainsAny]: evalArrayContainsAny,
  [FILTER_OPERATORS.FullText]: evalFullText,
};

// ============================================================================
// Filter Evaluation
// ============================================================================

/**
 * Evaluate a single filter condition against an object.
 */
export function evaluateCondition<T extends Record<string, unknown>>(
  condition: FilterCondition<T>,
  obj: T,
): boolean {
  const fieldValue = getFieldValue(obj, condition.field as string);
  const operatorFn = OPERATOR_FUNCTIONS[condition.operator];

  const caseSensitive = condition.caseSensitive ?? false;
  return operatorFn(fieldValue, condition.value, caseSensitive);
}

/**
 * Evaluate a compound filter against an object.
 */
export function evaluateCompoundFilter<T extends Record<string, unknown>>(
  filter: CompoundFilter<T>,
  obj: T,
): boolean {
  const { operator, conditions } = filter;

  switch (operator) {
    case LOGICAL_OPERATORS.AND:
      return conditions.every((cond) => evaluateFilter(cond, obj));

    case LOGICAL_OPERATORS.OR:
      return conditions.some((cond) => evaluateFilter(cond, obj));

    case LOGICAL_OPERATORS.NOT:
      // NOT applies to the first condition only (or all for consistency)
      return !conditions.every((cond) => evaluateFilter(cond, obj));

    default:
      throw new Error(`Unknown logical operator: ${String(operator)}`);
  }
}

/**
 * Evaluate any filter (single or compound) against an object.
 */
export function evaluateFilter<T extends Record<string, unknown>>(
  filter: FilterCondition<T> | CompoundFilter<T>,
  obj: T,
): boolean {
  if (isFilterCondition(filter)) {
    return evaluateCondition(filter, obj);
  }

  if (isCompoundFilter(filter)) {
    return evaluateCompoundFilter(filter, obj);
  }

  throw new Error('Invalid filter structure');
}

/**
 * Filter an array of objects using a filter.
 */
export function filterArray<T extends Record<string, unknown>>(
  items: T[],
  filter: FilterCondition<T> | CompoundFilter<T> | undefined,
): T[] {
  if (filter === undefined) {
    return items;
  }

  return items.filter((item) => evaluateFilter(filter, item));
}

// ============================================================================
// Sorting
// ============================================================================

/**
 * Sort an array of objects by multiple fields.
 */
export function sortArray<T extends Record<string, unknown>>(
  items: T[],
  sortConfigs: Array<{ field: string; order: 'asc' | 'desc'; nulls?: 'first' | 'last' }>,
): T[] {
  if (sortConfigs.length === 0) {
    return items;
  }

  return [...items].sort((a, b) => {
    for (const config of sortConfigs) {
      const aRawValue = getFieldValue(a, config.field);
      const bRawValue = getFieldValue(b, config.field);

      // Handle nulls/undefined
      const aIsNull = aRawValue === null || aRawValue === undefined;
      const bIsNull = bRawValue === null || bRawValue === undefined;

      if (aIsNull && bIsNull) continue;
      if (aIsNull) return config.nulls === 'first' ? -1 : 1;
      if (bIsNull) return config.nulls === 'first' ? 1 : -1;

      if (!isFilterPrimitive(aRawValue) || !isFilterPrimitive(bRawValue)) continue;
      const comparison = comparePrimitives(aRawValue, bRawValue);

      if (comparison !== 0) {
        return config.order === 'asc' ? comparison : -comparison;
      }
    }

    return 0;
  });
}

// ============================================================================
// Pagination
// ============================================================================

/**
 * Apply offset-based pagination to an array.
 */
export function paginateArray<T>(
  items: T[],
  page: number,
  limit: number,
): { data: T[]; total: number; hasNext: boolean; hasPrev: boolean; totalPages: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = items.slice(offset, offset + limit);

  return {
    data,
    total,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    totalPages,
  };
}
