// packages/sdk/src/search/query-builder.ts
/**
 * Client-Side Query Builder
 *
 * Re-exports the core query builder with additional client-specific utilities.
 * Provides a convenient API for building search queries in React applications.
 */

import {
  createSearchQuery as coreCreateSearchQuery,
  fromSearchQuery as coreFromSearchQuery,
  SearchQueryBuilder,
  type CompoundFilter,
  type FilterCondition,
  type FilterOperator,
  type FilterValue,
  type SearchQuery,
  type SortOrder,
  type SortConfig,
  type FullTextSearchConfig,
  FILTER_OPERATORS,
} from '@abe-stack/core';

// Re-export core query builder
export { coreCreateSearchQuery as createSearchQuery, coreFromSearchQuery as fromSearchQuery, SearchQueryBuilder };

// ============================================================================
// Client Query Builder
// ============================================================================

/**
 * Client search query builder with URL serialization support.
 * Wraps the core query state and provides URL serialization methods.
 */
export class ClientSearchQueryBuilder<T = Record<string, unknown>> {
  private _filters: Array<FilterCondition<T> | CompoundFilter<T>> = [];
  private _sort: SortConfig<T>[] = [];
  private _search?: FullTextSearchConfig;
  private _page?: number;
  private _limit?: number;
  private _cursor?: string;
  private _select?: Array<keyof T | string>;
  private _includeCount?: boolean;

  /**
   * Add a filter condition.
   */
  whereEq(field: keyof T | string, value: FilterValue): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.EQ, value } as FilterCondition<T>);
    return this;
  }

  whereNeq(field: keyof T | string, value: FilterValue): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.NEQ, value } as FilterCondition<T>);
    return this;
  }

  whereGt(field: keyof T | string, value: FilterValue): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.GT, value } as FilterCondition<T>);
    return this;
  }

  whereGte(field: keyof T | string, value: FilterValue): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.GTE, value } as FilterCondition<T>);
    return this;
  }

  whereLt(field: keyof T | string, value: FilterValue): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.LT, value } as FilterCondition<T>);
    return this;
  }

  whereLte(field: keyof T | string, value: FilterValue): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.LTE, value } as FilterCondition<T>);
    return this;
  }

  whereContains(field: keyof T | string, value: string): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.CONTAINS, value } as FilterCondition<T>);
    return this;
  }

  whereIn(field: keyof T | string, values: FilterValue[]): this {
    this._filters.push({ field, operator: FILTER_OPERATORS.IN, value: values } as FilterCondition<T>);
    return this;
  }

  and(callback: (builder: ClientSearchQueryBuilder<T>) => ClientSearchQueryBuilder<T>): this {
    const subBuilder = new ClientSearchQueryBuilder<T>();
    callback(subBuilder);
    if (subBuilder._filters.length > 0) {
      this._filters.push({
        operator: 'and',
        conditions: subBuilder._filters,
      } as CompoundFilter<T>);
    }
    return this;
  }

  or(callback: (builder: ClientSearchQueryBuilder<T>) => ClientSearchQueryBuilder<T>): this {
    const subBuilder = new ClientSearchQueryBuilder<T>();
    callback(subBuilder);
    if (subBuilder._filters.length > 0) {
      this._filters.push({
        operator: 'or',
        conditions: subBuilder._filters,
      } as CompoundFilter<T>);
    }
    return this;
  }

  orderBy(field: keyof T | string, order: SortOrder = 'asc'): this {
    this._sort.push({ field, order });
    return this;
  }

  orderByAsc(field: keyof T | string): this {
    return this.orderBy(field, 'asc');
  }

  orderByDesc(field: keyof T | string): this {
    return this.orderBy(field, 'desc');
  }

  search(query: string): this {
    this._search = { ...this._search, query };
    return this;
  }

  searchIn(fields: string[]): this {
    this._search = { ...this._search, query: this._search?.query ?? '', fields };
    return this;
  }

  page(page: number): this {
    this._page = page;
    return this;
  }

  limit(limit: number): this {
    this._limit = limit;
    return this;
  }

  cursor(cursor: string): this {
    this._cursor = cursor;
    return this;
  }

  select(...fields: Array<keyof T | string>): this {
    this._select = fields;
    return this;
  }

  includeCount(): this {
    this._includeCount = true;
    return this;
  }

  build(): SearchQuery<T> {
    const query: SearchQuery<T> = {};

    if (this._filters.length === 1) {
      query.filters = this._filters[0];
    } else if (this._filters.length > 1) {
      query.filters = { operator: 'and', conditions: this._filters };
    }

    if (this._sort.length > 0) {
      query.sort = this._sort;
    }

    if (this._search) {
      query.search = this._search;
    }

    if (this._page !== undefined) {
      query.page = this._page;
    }

    if (this._limit !== undefined) {
      query.limit = this._limit;
    }

    if (this._cursor !== undefined) {
      query.cursor = this._cursor;
    }

    if (this._select !== undefined) {
      query.select = this._select;
    }

    if (this._includeCount !== undefined) {
      query.includeCount = this._includeCount;
    }

    return query;
  }

  toURLSearchParams(): URLSearchParams {
    const query = this.build();
    return queryToURLSearchParams(query);
  }

  toQueryString(): string {
    return this.toURLSearchParams().toString();
  }

  static fromQuery<T = Record<string, unknown>>(
    query: SearchQuery<T>,
  ): ClientSearchQueryBuilder<T> {
    const builder = new ClientSearchQueryBuilder<T>();

    if (query.filters) {
      builder._filters = [query.filters];
    }

    if (query.sort) {
      builder._sort = [...query.sort];
    }

    if (query.search) {
      builder._search = { ...query.search };
    }

    if (query.page) {
      builder._page = query.page;
    }

    if (query.limit) {
      builder._limit = query.limit;
    }

    if (query.cursor) {
      builder._cursor = query.cursor;
    }

    if (query.select) {
      builder._select = [...query.select];
    }

    if (query.includeCount !== undefined) {
      builder._includeCount = query.includeCount;
    }

    return builder;
  }

  static fromURLSearchParams<T = Record<string, unknown>>(
    params: URLSearchParams | string,
  ): ClientSearchQueryBuilder<T> {
    const searchParams = typeof params === 'string' ? new URLSearchParams(params) : params;
    const query = urlSearchParamsToQuery<T>(searchParams);
    return ClientSearchQueryBuilder.fromQuery<T>(query);
  }
}

/**
 * Create a client search query builder.
 */
export function createClientSearchQuery<T = Record<string, unknown>>(): ClientSearchQueryBuilder<T> {
  return new ClientSearchQueryBuilder<T>();
}

/**
 * Create from existing query.
 */
export function fromClientSearchQuery<T = Record<string, unknown>>(
  query: SearchQuery<T>,
): ClientSearchQueryBuilder<T> {
  return ClientSearchQueryBuilder.fromQuery<T>(query);
}

// ============================================================================
// URL Serialization Helpers
// ============================================================================

/**
 * Convert a search query to URL search params.
 */
export function queryToURLSearchParams<T = Record<string, unknown>>(
  query: SearchQuery<T>,
): URLSearchParams {
  const params = new URLSearchParams();

  // Filters - serialize as JSON
  if (query.filters) {
    params.set('filters', JSON.stringify(serializeFilters(query.filters)));
  }

  // Sort - serialize as "field:order,field2:order2"
  if (query.sort && query.sort.length > 0) {
    const sortStr = query.sort.map((s: SortConfig<T>) => `${String(s.field)}:${s.order}`).join(',');
    params.set('sort', sortStr);
  }

  // Full-text search
  if (query.search?.query) {
    params.set('q', query.search.query);
    if (query.search.fields && query.search.fields.length > 0) {
      params.set('searchFields', query.search.fields.join(','));
    }
    if (query.search.fuzziness !== undefined) {
      params.set('fuzziness', String(query.search.fuzziness));
    }
  }

  // Pagination
  if (query.page !== undefined && query.page !== 1) {
    params.set('page', String(query.page));
  }

  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }

  if (query.cursor) {
    params.set('cursor', query.cursor);
  }

  // Field selection
  if (query.select && query.select.length > 0) {
    params.set('select', query.select.map(String).join(','));
  }

  // Include count
  if (query.includeCount) {
    params.set('includeCount', '1');
  }

  return params;
}

/**
 * Parse URL search params to a search query.
 */
export function urlSearchParamsToQuery<T = Record<string, unknown>>(
  params: URLSearchParams,
): SearchQuery<T> {
  const query: SearchQuery<T> = {};

  // Parse filters
  const filtersStr = params.get('filters');
  if (filtersStr) {
    try {
      const parsed = JSON.parse(filtersStr) as SerializedFilter;
      query.filters = deserializeFilters(parsed);
    } catch {
      // Invalid filters JSON, skip
    }
  }

  // Parse sort
  const sortStr = params.get('sort');
  if (sortStr) {
    query.sort = sortStr.split(',').map((s) => {
      const [field, order] = s.split(':');
      return {
        field: field as keyof T,
        order: (order === 'desc' ? 'desc' : 'asc') as SortOrder,
      };
    });
  }

  // Parse search
  const searchQuery = params.get('q');
  if (searchQuery) {
    query.search = { query: searchQuery };

    const searchFields = params.get('searchFields');
    if (searchFields) {
      query.search.fields = searchFields.split(',');
    }

    const fuzziness = params.get('fuzziness');
    if (fuzziness) {
      query.search.fuzziness = parseFloat(fuzziness);
    }
  }

  // Parse pagination
  const page = params.get('page');
  if (page) {
    query.page = parseInt(page, 10);
  }

  const limit = params.get('limit');
  if (limit) {
    query.limit = parseInt(limit, 10);
  }

  const cursor = params.get('cursor');
  if (cursor) {
    query.cursor = cursor;
  }

  // Parse select
  const select = params.get('select');
  if (select) {
    query.select = select.split(',') as Array<keyof T | string>;
  }

  // Parse includeCount
  const includeCount = params.get('includeCount');
  if (includeCount === '1' || includeCount === 'true') {
    query.includeCount = true;
  }

  return query;
}

// ============================================================================
// Filter Serialization
// ============================================================================

interface SerializedFilter {
  f?: string; // field
  o?: string; // operator
  v?: unknown; // value
  cs?: boolean; // caseSensitive
  op?: string; // logical operator (for compound)
  c?: SerializedFilter[]; // conditions (for compound)
}

/**
 * Serialize filters for URL transport.
 */
function serializeFilters<T>(
  filter: FilterCondition<T> | CompoundFilter<T>,
): SerializedFilter {
  if ('conditions' in filter) {
    // Compound filter
    return {
      op: filter.operator,
      c: filter.conditions.map((c: FilterCondition<T> | CompoundFilter<T>) => serializeFilters(c)),
    };
  }

  // Simple filter
  const serialized: SerializedFilter = {
    f: String(filter.field),
    o: filter.operator,
    v: serializeValue(filter.value),
  };

  if (filter.caseSensitive !== undefined) {
    serialized.cs = filter.caseSensitive;
  }

  return serialized;
}

/**
 * Deserialize filters from URL transport format.
 */
function deserializeFilters<T>(
  serialized: SerializedFilter,
): FilterCondition<T> | CompoundFilter<T> {
  if (serialized.op && serialized.c) {
    // Compound filter
    return {
      operator: serialized.op as 'and' | 'or' | 'not',
      conditions: serialized.c.map((c: SerializedFilter) => deserializeFilters<T>(c)),
    } as CompoundFilter<T>;
  }

  // Simple filter
  return {
    field: serialized.f as keyof T,
    operator: serialized.o as FilterOperator,
    value: deserializeValue(serialized.v),
    caseSensitive: serialized.cs,
  } as FilterCondition<T>;
}

/**
 * Serialize a filter value for URL transport.
 */
function serializeValue(value: FilterValue): unknown {
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v));
  }

  if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
    return {
      $range: {
        min: serializeValue(value.min),
        max: serializeValue(value.max),
      },
    };
  }

  return value;
}

/**
 * Deserialize a filter value from URL transport format.
 */
function deserializeValue(value: unknown): FilterValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    if ('$date' in value) {
      return new Date((value as { $date: string }).$date);
    }

    if ('$range' in value) {
      const range = (value as { $range: { min: unknown; max: unknown } }).$range;
      return {
        min: deserializeValue(range.min) as string | number | boolean | Date | null,
        max: deserializeValue(range.max) as string | number | boolean | Date | null,
      };
    }

    if (Array.isArray(value)) {
      return value.map((v) => deserializeValue(v)) as Array<string | number | boolean | Date | null>;
    }
  }

  return value as FilterValue;
}

// ============================================================================
// Quick Filter Helpers
// ============================================================================

/**
 * Create a quick equality filter.
 */
export function eq<T = Record<string, unknown>>(
  field: keyof T | string,
  value: string | number | boolean | null,
): FilterCondition<T> {
  return { field, operator: FILTER_OPERATORS.EQ, value } as FilterCondition<T>;
}

/**
 * Create a quick not-equal filter.
 */
export function neq<T = Record<string, unknown>>(
  field: keyof T | string,
  value: string | number | boolean | null,
): FilterCondition<T> {
  return { field, operator: FILTER_OPERATORS.NEQ, value } as FilterCondition<T>;
}

/**
 * Create a quick greater-than filter.
 */
export function gt<T = Record<string, unknown>>(
  field: keyof T | string,
  value: number | Date,
): FilterCondition<T> {
  return { field, operator: FILTER_OPERATORS.GT, value } as FilterCondition<T>;
}

/**
 * Create a quick less-than filter.
 */
export function lt<T = Record<string, unknown>>(
  field: keyof T | string,
  value: number | Date,
): FilterCondition<T> {
  return { field, operator: FILTER_OPERATORS.LT, value } as FilterCondition<T>;
}

/**
 * Create a quick contains filter.
 */
export function contains<T = Record<string, unknown>>(
  field: keyof T | string,
  value: string,
): FilterCondition<T> {
  return { field, operator: FILTER_OPERATORS.CONTAINS, value } as FilterCondition<T>;
}

/**
 * Create a quick in-array filter.
 */
export function inArray<T = Record<string, unknown>>(
  field: keyof T | string,
  values: Array<string | number | boolean>,
): FilterCondition<T> {
  return { field, operator: FILTER_OPERATORS.IN, value: values } as FilterCondition<T>;
}
