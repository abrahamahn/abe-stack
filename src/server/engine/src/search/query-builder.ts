// backend/engine/src/search/query-builder.ts
/**
 * Search Query Builder
 */

import {
  LOGICAL_OPERATORS,
  type CompoundFilter,
  type FilterCondition,
  type FilterOperator,
  type FilterValue,
  type SearchQuery,
  type SortConfig,
  type SortOrder,
} from '@abe-stack/shared';

export class SearchQueryBuilder<T = Record<string, unknown>> {
  private readonly filters: Array<FilterCondition<T> | CompoundFilter<T>> = [];
  private readonly sort: SortConfig<T>[] = [];
  private search?: SearchQuery<T>['search'];
  private page?: number;
  private limit?: number;
  private cursor?: string;
  private select?: Array<keyof T | string>;
  private includeCount?: boolean;

  where(field: keyof T | string, operator: FilterOperator, value?: FilterValue): this {
    this.filters.push({ field, operator, value } as FilterCondition<T>);
    return this;
  }

  and(builderFn: (builder: SearchQueryBuilder<T>) => SearchQueryBuilder<T>): this {
    const child = new SearchQueryBuilder<T>();
    builderFn(child);
    const childFilters = child.getFilters();
    if (childFilters.length > 0) {
      this.filters.push({
        operator: LOGICAL_OPERATORS.AND,
        conditions: childFilters,
      } as CompoundFilter<T>);
    }
    return this;
  }

  or(builderFn: (builder: SearchQueryBuilder<T>) => SearchQueryBuilder<T>): this {
    const child = new SearchQueryBuilder<T>();
    builderFn(child);
    const childFilters = child.getFilters();
    if (childFilters.length > 0) {
      this.filters.push({
        operator: LOGICAL_OPERATORS.OR,
        conditions: childFilters,
      } as CompoundFilter<T>);
    }
    return this;
  }

  orderBy(field: keyof T | string, order: SortOrder = 'asc'): this {
    this.sort.push({ field, order });
    return this;
  }

  searchText(query: string, fields?: string[], fuzziness?: number): this {
    this.search = {
      query,
      ...(fields !== undefined ? { fields } : {}),
      ...(fuzziness !== undefined ? { fuzziness } : {}),
    };
    return this;
  }

  setPage(page: number): this {
    this.page = page;
    return this;
  }

  setLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  setCursor(cursor: string): this {
    this.cursor = cursor;
    return this;
  }

  setSelect(select: Array<keyof T | string>): this {
    this.select = select;
    return this;
  }

  withCount(includeCount: boolean = true): this {
    this.includeCount = includeCount;
    return this;
  }

  build(): SearchQuery<T> {
    const query: SearchQuery<T> = {};

    if (this.filters.length === 1) {
      const singleFilter = this.filters[0];
      if (singleFilter !== undefined) {
        query.filters = singleFilter;
      }
    } else if (this.filters.length > 1) {
      query.filters = {
        operator: LOGICAL_OPERATORS.AND,
        conditions: this.filters,
      } as CompoundFilter<T>;
    }

    if (this.sort.length > 0) query.sort = this.sort;
    if (this.search != null) query.search = this.search;
    if (this.page != null) query.page = this.page;
    if (this.limit != null) query.limit = this.limit;
    if (this.cursor != null) query.cursor = this.cursor;
    if (this.select != null) query.select = this.select;
    if (this.includeCount != null) query.includeCount = this.includeCount;

    return query;
  }

  private getFilters(): Array<FilterCondition<T> | CompoundFilter<T>> {
    return this.filters;
  }
}

export function createSearchQuery<T = Record<string, unknown>>(): SearchQueryBuilder<T> {
  return new SearchQueryBuilder<T>();
}

export function fromSearchQuery<T = Record<string, unknown>>(
  query: SearchQuery<T>,
): SearchQueryBuilder<T> {
  const builder = new SearchQueryBuilder<T>();

  if (query.filters != null) {
    (builder as unknown as { filters: Array<FilterCondition<T> | CompoundFilter<T>> }).filters = [
      query.filters,
    ];
  }

  if (query.sort != null) {
    (builder as unknown as { sort: SortConfig<T>[] }).sort = [...query.sort];
  }

  if (query.search != null) {
    (builder as unknown as { search?: SearchQuery<T>['search'] }).search = query.search;
  }

  if (query.page != null) (builder as unknown as { page?: number }).page = query.page;
  if (query.limit != null) (builder as unknown as { limit?: number }).limit = query.limit;
  if (query.cursor != null) (builder as unknown as { cursor?: string }).cursor = query.cursor;
  if (query.select != null) {
    (builder as unknown as { select?: Array<keyof T | string> }).select = [...query.select];
  }
  if (query.includeCount != null) {
    (builder as unknown as { includeCount?: boolean }).includeCount = query.includeCount;
  }

  return builder;
}
