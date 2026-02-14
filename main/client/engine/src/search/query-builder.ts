// main/client/engine/src/search/query-builder.ts
/**
 * Client-Side Query Builder
 *
 * Extends the core SearchQueryBuilder with URL serialization support.
 */

import {
  SearchQueryBuilder,
  fromSearchQuery,
  serializeToURLParams,
  deserializeFromURLParams,
  type SearchQuery,
} from '@abe-stack/shared';

// ============================================================================
// Client Query Builder
// ============================================================================

/**
 * Client search query builder with URL serialization support.
 * Extends the core SearchQueryBuilder — inherits all filter, sort,
 * pagination, and search methods.
 */
export class ClientSearchQueryBuilder<T = Record<string, unknown>> extends SearchQueryBuilder<T> {
  toURLSearchParams(): URLSearchParams {
    const query = this.build();
    return serializeToURLParams(query);
  }

  toQueryString(): string {
    return this.toURLSearchParams().toString();
  }

  static fromQuery<T = Record<string, unknown>>(
    query: SearchQuery<T>,
  ): ClientSearchQueryBuilder<T> {
    const builder = new ClientSearchQueryBuilder<T>();
    const base = fromSearchQuery<T>(query);

    // Copy internal state from base builder
    builder['_filters'] = base['_filters'];
    builder['_sort'] = base['_sort'];
    builder['_search'] = base['_search'];
    builder['_page'] = base['_page'];
    builder['_limit'] = base['_limit'];
    builder['_cursor'] = base['_cursor'];
    builder['_select'] = base['_select'];
    builder['_includeCount'] = base['_includeCount'];

    return builder;
  }

  static fromURLSearchParams<T = Record<string, unknown>>(
    params: URLSearchParams | string,
  ): ClientSearchQueryBuilder<T> {
    const searchParams = typeof params === 'string' ? new URLSearchParams(params) : params;
    const query = deserializeFromURLParams<T>(searchParams);
    return ClientSearchQueryBuilder.fromQuery<T>(query);
  }
}

/** Create a client search query builder. */
export function createClientSearchQuery<
  T = Record<string, unknown>,
>(): ClientSearchQueryBuilder<T> {
  return new ClientSearchQueryBuilder<T>();
}

/** Create from existing query. */
export function fromClientSearchQuery<T = Record<string, unknown>>(
  query: SearchQuery<T>,
): ClientSearchQueryBuilder<T> {
  return ClientSearchQueryBuilder.fromQuery<T>(query);
}
