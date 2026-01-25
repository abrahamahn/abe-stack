// packages/core/src/infrastructure/search/query-builder.ts
/**
 * Fluent Query Builder
 *
 * Type-safe fluent API for building search queries.
 * Works on both client and server.
 */

import {
  FILTER_OPERATORS,
  LOGICAL_OPERATORS,
  SORT_ORDER,
  type CompoundFilter,
  type FacetConfig,
  type FacetedSearchQuery,
  type FilterCondition,
  type FilterOperator,
  type FilterPrimitive,
  type FilterValue,
  type FullTextSearchConfig,
  type SearchQuery,
  type SortConfig,
  type SortOrder,
} from './types';

// ============================================================================
// Query Builder Class
// ============================================================================

/**
 * Fluent query builder for constructing search queries.
 *
 * @example
 * ```ts
 * const query = new SearchQueryBuilder<User>()
 *   .where('status', 'eq', 'active')
 *   .where('age', 'gte', 18)
 *   .orderBy('createdAt', 'desc')
 *   .limit(20)
 *   .build();
 * ```
 */
export class SearchQueryBuilder<T = Record<string, unknown>> {
  private _filters: Array<FilterCondition<T> | CompoundFilter<T>> = [];
  private _sort: SortConfig<T>[] = [];
  private _search?: FullTextSearchConfig;
  private _page = 1;
  private _limit = 50;
  private _cursor?: string;
  private _select?: Array<keyof T | string>;
  private _includeCount?: boolean;
  private _facets?: FacetConfig[];

  // ============================================================================
  // Filter Methods
  // ============================================================================

  /**
   * Add a filter condition.
   */
  where(
    field: keyof T | string,
    operator: FilterOperator,
    value: FilterValue,
    options?: { caseSensitive?: boolean },
  ): this {
    this._filters.push({
      field,
      operator,
      value,
      caseSensitive: options?.caseSensitive,
    });
    return this;
  }

  /**
   * Add an equality filter.
   */
  whereEq(field: keyof T | string, value: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.EQ, value);
  }

  /**
   * Add a not-equal filter.
   */
  whereNeq(field: keyof T | string, value: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.NEQ, value);
  }

  /**
   * Add a greater-than filter.
   */
  whereGt(field: keyof T | string, value: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.GT, value);
  }

  /**
   * Add a greater-than-or-equal filter.
   */
  whereGte(field: keyof T | string, value: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.GTE, value);
  }

  /**
   * Add a less-than filter.
   */
  whereLt(field: keyof T | string, value: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.LT, value);
  }

  /**
   * Add a less-than-or-equal filter.
   */
  whereLte(field: keyof T | string, value: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.LTE, value);
  }

  /**
   * Add a contains filter (substring match).
   */
  whereContains(field: keyof T | string, value: string, caseSensitive = false): this {
    return this.where(field, FILTER_OPERATORS.CONTAINS, value, { caseSensitive });
  }

  /**
   * Add a starts-with filter.
   */
  whereStartsWith(field: keyof T | string, value: string, caseSensitive = false): this {
    return this.where(field, FILTER_OPERATORS.STARTS_WITH, value, { caseSensitive });
  }

  /**
   * Add an ends-with filter.
   */
  whereEndsWith(field: keyof T | string, value: string, caseSensitive = false): this {
    return this.where(field, FILTER_OPERATORS.ENDS_WITH, value, { caseSensitive });
  }

  /**
   * Add a LIKE pattern filter.
   */
  whereLike(field: keyof T | string, pattern: string, caseSensitive = true): this {
    return this.where(field, FILTER_OPERATORS.LIKE, pattern, { caseSensitive });
  }

  /**
   * Add a case-insensitive LIKE pattern filter.
   */
  whereIlike(field: keyof T | string, pattern: string): this {
    return this.where(field, FILTER_OPERATORS.ILIKE, pattern);
  }

  /**
   * Add an IN array filter.
   */
  whereIn(field: keyof T | string, values: FilterPrimitive[]): this {
    return this.where(field, FILTER_OPERATORS.IN, values);
  }

  /**
   * Add a NOT IN array filter.
   */
  whereNotIn(field: keyof T | string, values: FilterPrimitive[]): this {
    return this.where(field, FILTER_OPERATORS.NOT_IN, values);
  }

  /**
   * Add an IS NULL filter.
   */
  whereNull(field: keyof T | string): this {
    return this.where(field, FILTER_OPERATORS.IS_NULL, null);
  }

  /**
   * Add an IS NOT NULL filter.
   */
  whereNotNull(field: keyof T | string): this {
    return this.where(field, FILTER_OPERATORS.IS_NOT_NULL, null);
  }

  /**
   * Add a BETWEEN range filter (inclusive).
   */
  whereBetween(field: keyof T | string, min: FilterPrimitive, max: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.BETWEEN, { min, max });
  }

  /**
   * Add an array contains filter.
   */
  whereArrayContains(field: keyof T | string, value: FilterPrimitive): this {
    return this.where(field, FILTER_OPERATORS.ARRAY_CONTAINS, value);
  }

  /**
   * Add an array contains any filter.
   */
  whereArrayContainsAny(field: keyof T | string, values: FilterPrimitive[]): this {
    return this.where(field, FILTER_OPERATORS.ARRAY_CONTAINS_ANY, values);
  }

  // ============================================================================
  // Compound Filter Methods
  // ============================================================================

  /**
   * Combine current filters with AND logic.
   * This is the default behavior when multiple where() calls are made.
   */
  and(callback: (builder: SearchQueryBuilder<T>) => SearchQueryBuilder<T>): this {
    const subBuilder = new SearchQueryBuilder<T>();
    callback(subBuilder);
    const subFilters = subBuilder._filters;

    if (subFilters.length > 0) {
      this._filters.push({
        operator: LOGICAL_OPERATORS.AND,
        conditions: subFilters,
      });
    }

    return this;
  }

  /**
   * Combine filters with OR logic.
   */
  or(callback: (builder: SearchQueryBuilder<T>) => SearchQueryBuilder<T>): this {
    const subBuilder = new SearchQueryBuilder<T>();
    callback(subBuilder);
    const subFilters = subBuilder._filters;

    if (subFilters.length > 0) {
      this._filters.push({
        operator: LOGICAL_OPERATORS.OR,
        conditions: subFilters,
      });
    }

    return this;
  }

  /**
   * Negate a filter group.
   */
  not(callback: (builder: SearchQueryBuilder<T>) => SearchQueryBuilder<T>): this {
    const subBuilder = new SearchQueryBuilder<T>();
    callback(subBuilder);
    const subFilters = subBuilder._filters;

    if (subFilters.length > 0) {
      this._filters.push({
        operator: LOGICAL_OPERATORS.NOT,
        conditions: subFilters,
      });
    }

    return this;
  }

  // ============================================================================
  // Sort Methods
  // ============================================================================

  /**
   * Add a sort configuration.
   */
  orderBy(field: keyof T | string, order: SortOrder = SORT_ORDER.ASC): this {
    this._sort.push({ field, order });
    return this;
  }

  /**
   * Add ascending sort.
   */
  orderByAsc(field: keyof T | string): this {
    return this.orderBy(field, SORT_ORDER.ASC);
  }

  /**
   * Add descending sort.
   */
  orderByDesc(field: keyof T | string): this {
    return this.orderBy(field, SORT_ORDER.DESC);
  }

  /**
   * Add sort with null handling.
   */
  orderByWithNulls(
    field: keyof T | string,
    order: SortOrder = SORT_ORDER.ASC,
    nulls: 'first' | 'last' = 'last',
  ): this {
    this._sort.push({ field, order, nulls });
    return this;
  }

  /**
   * Clear all sort configurations.
   */
  clearSort(): this {
    this._sort = [];
    return this;
  }

  // ============================================================================
  // Full-Text Search Methods
  // ============================================================================

  /**
   * Add full-text search.
   */
  search(query: string, options?: Omit<FullTextSearchConfig, 'query'>): this {
    this._search = { query, ...options };
    return this;
  }

  /**
   * Add full-text search on specific fields.
   */
  searchIn(query: string, fields: string[]): this {
    this._search = { query, fields };
    return this;
  }

  /**
   * Add fuzzy full-text search.
   */
  searchFuzzy(query: string, fuzziness = 0.8): this {
    this._search = { query, fuzziness };
    return this;
  }

  /**
   * Clear full-text search.
   */
  clearSearch(): this {
    this._search = undefined;
    return this;
  }

  // ============================================================================
  // Pagination Methods
  // ============================================================================

  /**
   * Set page number (1-indexed).
   */
  page(page: number): this {
    this._page = Math.max(1, page);
    return this;
  }

  /**
   * Set items per page.
   */
  limit(limit: number): this {
    this._limit = Math.max(1, Math.min(limit, 1000));
    return this;
  }

  /**
   * Set cursor for cursor-based pagination.
   */
  cursor(cursor: string): this {
    this._cursor = cursor;
    return this;
  }

  /**
   * Skip a number of items (converts to page).
   */
  skip(count: number): this {
    this._page = Math.floor(count / this._limit) + 1;
    return this;
  }

  /**
   * Alias for limit().
   */
  take(count: number): this {
    return this.limit(count);
  }

  // ============================================================================
  // Select Methods
  // ============================================================================

  /**
   * Select specific fields to return.
   */
  select(...fields: Array<keyof T | string>): this {
    this._select = fields;
    return this;
  }

  /**
   * Clear field selection.
   */
  clearSelect(): this {
    this._select = undefined;
    return this;
  }

  // ============================================================================
  // Count Methods
  // ============================================================================

  /**
   * Include total count in results.
   */
  withCount(): this {
    this._includeCount = true;
    return this;
  }

  /**
   * Exclude total count from results.
   */
  withoutCount(): this {
    this._includeCount = false;
    return this;
  }

  // ============================================================================
  // Facet Methods
  // ============================================================================

  /**
   * Add a facet configuration.
   */
  facet(field: string, options?: Omit<FacetConfig, 'field'>): this {
    if (!this._facets) {
      this._facets = [];
    }
    this._facets.push({ field, ...options });
    return this;
  }

  /**
   * Clear all facets.
   */
  clearFacets(): this {
    this._facets = undefined;
    return this;
  }

  // ============================================================================
  // Build Methods
  // ============================================================================

  /**
   * Build the search query object.
   */
  build(): SearchQuery<T> {
    const query: SearchQuery<T> = {
      page: this._page,
      limit: this._limit,
    };

    if (this._filters.length === 1) {
      query.filters = this._filters[0];
    } else if (this._filters.length > 1) {
      query.filters = {
        operator: LOGICAL_OPERATORS.AND,
        conditions: this._filters,
      };
    }

    if (this._sort.length > 0) {
      query.sort = this._sort;
    }

    if (this._search) {
      query.search = this._search;
    }

    if (this._cursor) {
      query.cursor = this._cursor;
    }

    if (this._select) {
      query.select = this._select;
    }

    if (this._includeCount !== undefined) {
      query.includeCount = this._includeCount;
    }

    return query;
  }

  /**
   * Build a faceted search query.
   */
  buildFaceted(): FacetedSearchQuery<T> {
    const query = this.build() as FacetedSearchQuery<T>;

    if (this._facets) {
      query.facets = this._facets;
    }

    return query;
  }

  /**
   * Clone the builder for modification.
   */
  clone(): SearchQueryBuilder<T> {
    const cloned = new SearchQueryBuilder<T>();
    cloned._filters = [...this._filters];
    cloned._sort = [...this._sort];
    cloned._search = this._search ? { ...this._search } : undefined;
    cloned._page = this._page;
    cloned._limit = this._limit;
    cloned._cursor = this._cursor;
    cloned._select = this._select ? [...this._select] : undefined;
    cloned._includeCount = this._includeCount;
    cloned._facets = this._facets ? [...this._facets] : undefined;
    return cloned;
  }

  /**
   * Reset the builder to initial state.
   */
  reset(): this {
    this._filters = [];
    this._sort = [];
    this._search = undefined;
    this._page = 1;
    this._limit = 50;
    this._cursor = undefined;
    this._select = undefined;
    this._includeCount = undefined;
    this._facets = undefined;
    return this;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new query builder.
 *
 * @example
 * ```ts
 * const query = createSearchQuery<User>()
 *   .whereEq('status', 'active')
 *   .orderByDesc('createdAt')
 *   .limit(10)
 *   .build();
 * ```
 */
export function createSearchQuery<T = Record<string, unknown>>(): SearchQueryBuilder<T> {
  return new SearchQueryBuilder<T>();
}

/**
 * Create a query builder from an existing query.
 */
export function fromSearchQuery<T = Record<string, unknown>>(
  query: SearchQuery<T>,
): SearchQueryBuilder<T> {
  const builder = new SearchQueryBuilder<T>();

  if (query.filters) {
    // Add filters directly to the builder's internal array
    builder['_filters'] = [query.filters];
  }

  if (query.sort) {
    builder['_sort'] = [...query.sort];
  }

  if (query.search) {
    builder['_search'] = { ...query.search };
  }

  if (query.page) {
    builder['_page'] = query.page;
  }

  if (query.limit) {
    builder['_limit'] = query.limit;
  }

  if (query.cursor) {
    builder['_cursor'] = query.cursor;
  }

  if (query.select) {
    builder['_select'] = [...query.select];
  }

  if (query.includeCount !== undefined) {
    builder['_includeCount'] = query.includeCount;
  }

  return builder;
}
