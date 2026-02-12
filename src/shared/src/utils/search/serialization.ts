// src/shared/src/utils/search/serialization.ts
/**
 * Search Query Serialization
 *
 * Utilities for serializing/deserializing search queries to/from
 * URL parameters, JSON, and other formats.
 * Framework-agnostic — works in browser and Node.js.
 */

import type {
  CompoundFilter,
  FilterCondition,
  FilterOperator,
  FilterValue,
  SearchQuery,
  SortConfig,
} from './types';

// ============================================================================
// Types
// ============================================================================

/** Serialized filter format for URL transport. */
export interface SerializedFilter {
  /** Field name (for simple filter) */
  f?: string;
  /** Operator (for simple filter) */
  o?: string;
  /** Value (for simple filter) */
  v?: unknown;
  /** Case sensitive flag */
  cs?: boolean;
  /** Logical operator (for compound filter) */
  op?: string;
  /** Child conditions (for compound filter) */
  c?: SerializedFilter[];
}

/** Serialized query format for URL transport. */
export interface SerializedQuery {
  /** Filters */
  f?: SerializedFilter;
  /** Sort (format: "field:order,field2:order2") */
  s?: string;
  /** Search query */
  q?: string;
  /** Search fields */
  sf?: string;
  /** Fuzziness */
  fz?: number;
  /** Page */
  p?: number;
  /** Limit */
  l?: number;
  /** Cursor */
  c?: string;
  /** Select fields */
  sl?: string;
  /** Include count */
  ic?: boolean;
}

/** Options for serialization. */
export interface SerializationOptions {
  /** Use compact keys (single-letter) */
  compact?: boolean;
  /** Include default values */
  includeDefaults?: boolean;
  /** Base64 encode the result */
  base64?: boolean;
}

// ============================================================================
// URL Search Params Serialization
// ============================================================================

/** Serialize a search query to URL search params. */
export function serializeToURLParams<T = Record<string, unknown>>(
  query: SearchQuery<T>,
  options: SerializationOptions = {},
): URLSearchParams {
  const params = new URLSearchParams();
  const { compact = false, includeDefaults = false } = options;

  if (query.filters !== undefined) {
    const key = compact ? 'f' : 'filters';
    params.set(key, JSON.stringify(serializeFilter(query.filters)));
  }

  if (query.sort !== undefined && query.sort.length > 0) {
    const key = compact ? 's' : 'sort';
    params.set(key, serializeSort(query.sort));
  }

  if (query.search !== undefined) {
    params.set('q', query.search.query);

    if (query.search.fields !== undefined && query.search.fields.length > 0) {
      const sfKey = compact ? 'sf' : 'searchFields';
      params.set(sfKey, query.search.fields.join(','));
    }

    if (query.search.fuzziness !== undefined) {
      const fzKey = compact ? 'fz' : 'fuzziness';
      params.set(fzKey, String(query.search.fuzziness));
    }
  }

  if (query.page !== undefined && (query.page !== 1 || includeDefaults)) {
    const key = compact ? 'p' : 'page';
    params.set(key, String(query.page));
  }

  if (query.limit !== undefined) {
    const key = compact ? 'l' : 'limit';
    params.set(key, String(query.limit));
  }

  if (query.cursor !== undefined && query.cursor !== '') {
    const key = compact ? 'c' : 'cursor';
    params.set(key, query.cursor);
  }

  if (query.select !== undefined && query.select.length > 0) {
    const key = compact ? 'sl' : 'select';
    params.set(key, query.select.map(String).join(','));
  }

  if (query.includeCount === true) {
    const key = compact ? 'ic' : 'includeCount';
    params.set(key, '1');
  }

  return params;
}

/** Deserialize URL search params to a search query. */
export function deserializeFromURLParams<T = Record<string, unknown>>(
  params: URLSearchParams | string,
): SearchQuery<T> {
  const searchParams = typeof params === 'string' ? new URLSearchParams(params) : params;
  const query: SearchQuery<T> = {};

  const filtersStr = searchParams.get('f') ?? searchParams.get('filters');
  if (filtersStr !== null && filtersStr !== '') {
    try {
      query.filters = deserializeFilter<T>(JSON.parse(filtersStr) as SerializedFilter);
    } catch {
      // Invalid JSON, skip
    }
  }

  const sortStr = searchParams.get('s') ?? searchParams.get('sort');
  if (sortStr !== null && sortStr !== '') {
    query.sort = deserializeSort<T>(sortStr);
  }

  const searchQuery = searchParams.get('q');
  if (searchQuery !== null && searchQuery !== '') {
    query.search = { query: searchQuery };

    const searchFields = searchParams.get('sf') ?? searchParams.get('searchFields');
    if (searchFields !== null && searchFields !== '') {
      query.search.fields = searchFields.split(',').filter(Boolean);
    }

    const fuzziness = searchParams.get('fz') ?? searchParams.get('fuzziness');
    if (fuzziness !== null && fuzziness !== '') {
      const parsed = parseFloat(fuzziness);
      if (!isNaN(parsed)) {
        query.search.fuzziness = parsed;
      }
    }
  }

  const page = searchParams.get('p') ?? searchParams.get('page');
  if (page !== null && page !== '') {
    const parsed = parseInt(page, 10);
    if (!isNaN(parsed) && parsed > 0) {
      query.page = parsed;
    }
  }

  const limit = searchParams.get('l') ?? searchParams.get('limit');
  if (limit !== null && limit !== '') {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      query.limit = parsed;
    }
  }

  const cursor = searchParams.get('c') ?? searchParams.get('cursor');
  if (cursor !== null && cursor !== '') {
    query.cursor = cursor;
  }

  const select = searchParams.get('sl') ?? searchParams.get('select');
  if (select !== null && select !== '') {
    query.select = select.split(',').filter(Boolean) as Array<keyof T | string>;
  }

  const includeCount = searchParams.get('ic') ?? searchParams.get('includeCount');
  if (includeCount === '1' || includeCount === 'true') {
    query.includeCount = true;
  }

  return query;
}

// ============================================================================
// JSON Serialization
// ============================================================================

/** Serialize a search query to JSON string. */
export function serializeToJSON<T = Record<string, unknown>>(
  query: SearchQuery<T>,
  options: SerializationOptions = {},
): string {
  const serialized = serializeQuery(query, options.compact ?? false);
  const json = JSON.stringify(serialized);

  if (options.base64 === true) {
    return btoa(json);
  }

  return json;
}

/** Deserialize a search query from JSON string. */
export function deserializeFromJSON<T = Record<string, unknown>>(
  json: string,
  options: { base64?: boolean } = {},
): SearchQuery<T> {
  let decoded = json;

  if (options.base64 === true) {
    decoded = atob(json);
  }

  const parsed = JSON.parse(decoded) as SerializedQuery;
  return deserializeQuery<T>(parsed);
}

// ============================================================================
// URL Helpers
// ============================================================================

/** Merge search params into existing URL. */
export function mergeSearchParamsIntoURL(url: string | URL, params: URLSearchParams): URL {
  const urlObj = typeof url === 'string' ? new URL(url) : new URL(url.href);

  params.forEach((value, key) => {
    urlObj.searchParams.set(key, value);
  });

  return urlObj;
}

/** Extract search query from URL. */
export function extractQueryFromURL<T = Record<string, unknown>>(
  url: string | URL,
): SearchQuery<T> {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return deserializeFromURLParams<T>(urlObj.searchParams);
}

/** Build URL with search query. */
export function buildURLWithQuery<T = Record<string, unknown>>(
  baseUrl: string,
  query: SearchQuery<T>,
  options: SerializationOptions = {},
): URL {
  const url = new URL(baseUrl);
  const params = serializeToURLParams(query, options);

  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return url;
}

// ============================================================================
// Hash-based State
// ============================================================================

/** Serialize query to URL hash (base64-encoded compact JSON). */
export function serializeToHash<T = Record<string, unknown>>(query: SearchQuery<T>): string {
  const serialized = serializeQuery(query, true);
  return btoa(JSON.stringify(serialized));
}

/** Deserialize query from URL hash. */
export function deserializeFromHash<T = Record<string, unknown>>(hash: string): SearchQuery<T> {
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
  const decoded = atob(cleaned);
  const parsed = JSON.parse(decoded) as SerializedQuery;
  return deserializeQuery<T>(parsed);
}

// ============================================================================
// Internal Serialization Functions
// ============================================================================

function serializeQuery<T>(query: SearchQuery<T>, _compact: boolean): SerializedQuery {
  const result: SerializedQuery = {};

  if (query.filters !== undefined) {
    result.f = serializeFilter(query.filters);
  }

  if (query.sort !== undefined && query.sort.length > 0) {
    result.s = serializeSort(query.sort);
  }

  if (query.search !== undefined) {
    result.q = query.search.query;
    if (query.search.fields !== undefined) {
      result.sf = query.search.fields.join(',');
    }
    if (query.search.fuzziness !== undefined) {
      result.fz = query.search.fuzziness;
    }
  }

  if (query.page !== undefined) {
    result.p = query.page;
  }

  if (query.limit !== undefined) {
    result.l = query.limit;
  }

  if (query.cursor !== undefined && query.cursor !== '') {
    result.c = query.cursor;
  }

  if (query.select !== undefined) {
    result.sl = query.select.map(String).join(',');
  }

  if (query.includeCount === true) {
    result.ic = true;
  }

  return result;
}

function deserializeQuery<T>(serialized: SerializedQuery): SearchQuery<T> {
  const query: SearchQuery<T> = {};

  if (serialized.f !== undefined) {
    query.filters = deserializeFilter<T>(serialized.f);
  }

  if (serialized.s !== undefined && serialized.s !== '') {
    query.sort = deserializeSort<T>(serialized.s);
  }

  if (serialized.q !== undefined && serialized.q !== '') {
    query.search = { query: serialized.q };
    if (serialized.sf !== undefined && serialized.sf !== '') {
      query.search.fields = serialized.sf.split(',');
    }
    if (serialized.fz !== undefined) {
      query.search.fuzziness = serialized.fz;
    }
  }

  if (serialized.p !== undefined) {
    query.page = serialized.p;
  }

  if (serialized.l !== undefined) {
    query.limit = serialized.l;
  }

  if (serialized.c !== undefined && serialized.c !== '') {
    query.cursor = serialized.c;
  }

  if (serialized.sl !== undefined && serialized.sl !== '') {
    query.select = serialized.sl.split(',') as Array<keyof T | string>;
  }

  if (serialized.ic === true) {
    query.includeCount = true;
  }

  return query;
}

function serializeFilter<T>(filter: FilterCondition<T> | CompoundFilter<T>): SerializedFilter {
  if ('conditions' in filter) {
    return {
      op: filter.operator,
      c: filter.conditions.map((c: FilterCondition<T> | CompoundFilter<T>) => serializeFilter(c)),
    };
  }

  const result: SerializedFilter = {
    f: String(filter.field),
    o: filter.operator,
    v: serializeValue(filter.value),
  };

  if (filter.caseSensitive !== undefined) {
    result.cs = filter.caseSensitive;
  }

  return result;
}

function deserializeFilter<T>(
  serialized: SerializedFilter,
): FilterCondition<T> | CompoundFilter<T> {
  if (serialized.op !== undefined && serialized.c !== undefined) {
    const result = {
      operator: serialized.op as 'and' | 'or' | 'not',
      conditions: serialized.c.map((c) => deserializeFilter<T>(c)),
    };
    return result as unknown as CompoundFilter<T>;
  }

  const result = {
    field: serialized.f as keyof T,
    operator: serialized.o as FilterOperator,
    value: deserializeValue(serialized.v),
    caseSensitive: serialized.cs,
  };
  return result as unknown as FilterCondition<T>;
}

function serializeSort<T>(sort: SortConfig<T>[]): string {
  return sort.map((s) => `${String(s.field)}:${s.order}`).join(',');
}

function deserializeSort<T>(sortStr: string): SortConfig<T>[] {
  return sortStr.split(',').map((s) => {
    const [field, order] = s.split(':');
    return {
      field: field as keyof T,
      order: order === 'desc' ? 'desc' : 'asc',
    } as unknown as SortConfig<T>;
  });
}

function serializeValue(value: FilterValue): unknown {
  if (value instanceof Date) {
    return { $d: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
    const rangeValue = value as { min: FilterValue; max: FilterValue };
    return {
      $r: {
        min: serializeValue(rangeValue.min),
        max: serializeValue(rangeValue.max),
      },
    };
  }

  return value;
}

function deserializeValue(value: unknown): FilterValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    if ('$d' in value && typeof (value as { $d: string }).$d === 'string') {
      return new Date((value as { $d: string }).$d);
    }

    if ('$r' in value) {
      const range = (value as { $r: { min: unknown; max: unknown } }).$r;
      return {
        min: deserializeValue(range.min) as string | number | boolean | Date | null,
        max: deserializeValue(range.max) as string | number | boolean | Date | null,
      };
    }

    if (Array.isArray(value)) {
      return value.map(deserializeValue) as Array<string | number | boolean | Date | null>;
    }
  }

  return value as FilterValue;
}
