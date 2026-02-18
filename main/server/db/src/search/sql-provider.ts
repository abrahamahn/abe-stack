// main/server/db/src/search/sql-provider.ts
/**
 * SQL Search Provider
 *
 * Raw SQL-based search provider for PostgreSQL databases.
 * Translates search queries to SQL with proper escaping and parameterization.
 *
 * @module
 */

import {
  decodeCursor,
  encodeCursor,
  FILTER_OPERATORS,
  InvalidCursorError,
  InvalidFilterError,
  isCompoundFilter,
  isFilterCondition,
  LOGICAL_OPERATORS,
  QueryTooComplexError,
  SearchError,
  SearchProviderError,
  type CompoundFilter,
  type CursorSearchResult,
  type FacetConfig,
  type FacetedSearchQuery,
  type FacetedSearchResult,
  type FilterCondition,
  type FilterOperator,
  type SearchCapabilities,
  type SearchQuery,
  type SearchResult,
  type SortConfig,
} from '@bslt/shared';

import type { RawDb, Repositories } from '../index';
import type {
  SearchContext,
  ServerSearchProvider,
  SqlSearchProviderConfig,
  SqlTableConfig,
} from './types';

// ============================================================================
// Types
// ============================================================================

/** Internal type for SQL fragment with parameters */
interface SqlFragment {
  text: string;
  values: unknown[];
}

/** Row type for count queries */
type CountRow = Record<string, unknown> & { count: string | number };

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<SqlSearchProviderConfig, 'name'>> = {
  maxQueryDepth: 5,
  maxConditions: 50,
  defaultPageSize: 50,
  maxPageSize: 1000,
  timeout: 30000,
  logging: false,
};

const SUPPORTED_OPERATORS: FilterOperator[] = [
  FILTER_OPERATORS.EQ,
  FILTER_OPERATORS.NEQ,
  FILTER_OPERATORS.GT,
  FILTER_OPERATORS.GTE,
  FILTER_OPERATORS.LT,
  FILTER_OPERATORS.LTE,
  FILTER_OPERATORS.CONTAINS,
  FILTER_OPERATORS.StartsWith,
  FILTER_OPERATORS.EndsWith,
  FILTER_OPERATORS.LIKE,
  FILTER_OPERATORS.ILIKE,
  FILTER_OPERATORS.IN,
  FILTER_OPERATORS.NotIn,
  FILTER_OPERATORS.IsNull,
  FILTER_OPERATORS.IsNotNull,
  FILTER_OPERATORS.BETWEEN,
];

// ============================================================================
// SQL Search Provider
// ============================================================================

/**
 * SQL-based search provider using raw parameterized SQL.
 *
 * Translates search queries to SQL with proper escaping and parameterization.
 * Supports offset pagination, cursor pagination, faceted search, and compound filters.
 *
 * @example
 * ```typescript
 * const provider = new SqlSearchProvider(db, repos, {
 *   table: 'users',
 *   primaryKey: 'id',
 *   columns: [
 *     { field: 'name', column: 'name', type: 'string' },
 *     { field: 'email', column: 'email', type: 'string' },
 *   ],
 * });
 *
 * const results = await provider.search({
 *   filters: { field: 'name', operator: 'eq', value: 'John' },
 *   limit: 10,
 * });
 * ```
 */
export class SqlSearchProvider<TRecord extends Record<string, unknown> = Record<string, unknown>>
  implements ServerSearchProvider<TRecord>
{
  readonly name: string;
  private readonly config: Required<Omit<SqlSearchProviderConfig, 'name'>>;
  private readonly tableConfig: SqlTableConfig;
  private paramIndex: number = 0;

  /**
   * Create a new SQL search provider.
   *
   * @param db - Raw database client for executing queries.
   * @param _repos - Repository container (reserved for future use).
   * @param tableConfig - Table and column configuration.
   * @param config - Optional provider configuration overrides.
   */
  constructor(
    private readonly db: RawDb,
    _repos: Repositories,
    tableConfig: Partial<SqlTableConfig> & { table: string },
    config?: SqlSearchProviderConfig,
  ) {
    this.name = config?.name ?? 'sql';
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tableConfig = {
      ...tableConfig,
      primaryKey: tableConfig.primaryKey ?? 'id',
      columns: tableConfig.columns ?? [],
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get provider capabilities.
   *
   * @returns Search capabilities supported by this SQL provider.
   */
  getCapabilities(): SearchCapabilities {
    return {
      fullTextSearch: false,
      fuzzyMatching: false,
      highlighting: false,
      nestedFields: false,
      arrayOperations: true,
      cursorPagination: true,
      maxPageSize: this.config.maxPageSize,
      supportedOperators: SUPPORTED_OPERATORS,
    };
  }

  /**
   * Execute a search query with offset pagination.
   *
   * @param query - Search query with filters, pagination, sorting.
   * @param _context - Optional execution context (unused).
   * @returns Paginated search results.
   * @throws {SearchProviderError} When the SQL query execution fails.
   */
  async search(
    query: SearchQuery<TRecord>,
    _context?: SearchContext,
  ): Promise<SearchResult<TRecord>> {
    const startTime = performance.now();

    try {
      const page = query.page ?? 1;
      const limit = Math.min(query.limit ?? this.config.defaultPageSize, this.config.maxPageSize);
      const offset = (page - 1) * limit;

      // Reset param index for this query
      this.paramIndex = 0;

      // Build WHERE clause
      const whereFragment = this.buildWhereClause(query);
      const orderByClause = this.buildOrderByClause(query.sort);

      // Build the query
      const whereClause = whereFragment != null ? `WHERE ${whereFragment.text}` : '';
      const orderBy = orderByClause !== '' ? `ORDER BY ${orderByClause}` : '';

      const sqlText = `SELECT * FROM ${this.tableConfig.table} ${whereClause} ${orderBy} LIMIT $${this.nextParam()} OFFSET $${this.nextParam()}`;
      const values = [...(whereFragment?.values ?? []), limit + 1, offset];

      const results = await this.db.raw<TRecord>(sqlText, values);

      const hasNext = results.length > limit;
      const data = hasNext ? results.slice(0, limit) : results;

      // Get total count if requested
      let total: number | undefined;
      if (query.includeCount === true) {
        // Reset param index for count query
        this.paramIndex = 0;
        const countWhereFragment = this.buildWhereClause(query);
        const countWhereClause =
          countWhereFragment != null ? `WHERE ${countWhereFragment.text}` : '';
        const countSql = `SELECT COUNT(*) as count FROM ${this.tableConfig.table} ${countWhereClause}`;
        const countResult = await this.db.raw<CountRow>(countSql, countWhereFragment?.values ?? []);
        const countValue = countResult[0]?.count;
        total = typeof countValue === 'number' ? countValue : parseInt(String(countValue), 10);
      }

      const executionTime = performance.now() - startTime;

      return {
        data: data.map((item) => ({ item })),
        page,
        limit,
        hasNext,
        hasPrev: page > 1,
        total,
        totalPages: total !== undefined ? Math.ceil(total / limit) : undefined,
        executionTime,
      };
    } catch (error) {
      throw this.wrapError(error, 'search');
    }
  }

  /**
   * Execute a search query with cursor pagination.
   *
   * @param query - Search query with cursor-based pagination.
   * @param _context - Optional execution context (unused).
   * @returns Cursor-paginated search results.
   * @throws {InvalidCursorError} When the cursor cannot be decoded.
   * @throws {SearchProviderError} When the SQL query execution fails.
   */
  async searchWithCursor(
    query: SearchQuery<TRecord>,
    _context?: SearchContext,
  ): Promise<CursorSearchResult<TRecord>> {
    const startTime = performance.now();

    try {
      const limit = Math.min(query.limit ?? this.config.defaultPageSize, this.config.maxPageSize);

      // Reset param index for this query
      this.paramIndex = 0;

      // Build base WHERE clause
      let whereFragment = this.buildWhereClause(query);

      // Apply cursor if provided
      if (query.cursor != null && query.cursor !== '') {
        const cursorFragment = this.buildCursorCondition(query.cursor, query.sort ?? []);
        if (cursorFragment != null) {
          if (whereFragment != null) {
            whereFragment = {
              text: `(${whereFragment.text}) AND (${cursorFragment.text})`,
              values: [...whereFragment.values, ...cursorFragment.values],
            };
          } else {
            whereFragment = cursorFragment;
          }
        }
      }

      const orderByClause = this.buildOrderByClause(query.sort);
      const whereClause = whereFragment != null ? `WHERE ${whereFragment.text}` : '';
      const orderBy = orderByClause !== '' ? `ORDER BY ${orderByClause}` : '';

      const sqlText = `SELECT * FROM ${this.tableConfig.table} ${whereClause} ${orderBy} LIMIT $${this.nextParam()}`;
      const values = [...(whereFragment?.values ?? []), limit + 1];

      const results = await this.db.raw<TRecord>(sqlText, values);

      const hasNext = results.length > limit;
      const data = hasNext ? results.slice(0, limit) : results;

      // Generate cursors
      const lastItem = data[data.length - 1];
      const nextCursor =
        hasNext && lastItem != null ? this.createCursor(lastItem, query.sort ?? []) : null;

      // Get total count if requested
      let total: number | undefined;
      if (query.includeCount === true) {
        // Reset param index for count query
        this.paramIndex = 0;
        const baseWhereFragment = this.buildWhereClause(query);
        const countWhereClause = baseWhereFragment != null ? `WHERE ${baseWhereFragment.text}` : '';
        const countSql = `SELECT COUNT(*) as count FROM ${this.tableConfig.table} ${countWhereClause}`;
        const countResult = await this.db.raw<CountRow>(countSql, baseWhereFragment?.values ?? []);
        const countValue = countResult[0]?.count;
        total = typeof countValue === 'number' ? countValue : parseInt(String(countValue), 10);
      }

      const executionTime = performance.now() - startTime;

      return {
        data: data.map((item) => ({ item })),
        nextCursor,
        prevCursor: null,
        hasNext,
        hasPrev: query.cursor !== undefined,
        limit,
        total,
        executionTime,
      };
    } catch (error) {
      throw this.wrapError(error, 'searchWithCursor');
    }
  }

  /**
   * Execute a faceted search query.
   *
   * @param query - Search query with facet configuration.
   * @param context - Optional execution context.
   * @returns Faceted search results with bucket counts.
   * @throws {SearchProviderError} When any query execution fails.
   */
  async searchFaceted(
    query: FacetedSearchQuery<TRecord>,
    context?: SearchContext,
  ): Promise<FacetedSearchResult<TRecord>> {
    const startTime = performance.now();

    try {
      // Get regular search results
      const searchResult = await this.search(query, context);

      // Build facets if requested
      const facets =
        query.facets != null && query.facets.length > 0
          ? await Promise.all(
              query.facets.map(async (facetConfig: FacetConfig) => {
                const columnName = this.resolveColumnName(facetConfig.field);
                if (columnName == null || columnName === '') {
                  return {
                    field: facetConfig.field,
                    buckets: [],
                  };
                }

                // Reset param index for each facet query
                this.paramIndex = 0;
                const whereFragment = this.buildWhereClause(query);
                const facetLimit = facetConfig.size ?? 10;

                const whereClause = whereFragment != null ? `WHERE ${whereFragment.text}` : '';
                const facetSql = `SELECT ${columnName} as value, COUNT(*) as count FROM ${this.tableConfig.table} ${whereClause} GROUP BY ${columnName} ORDER BY count DESC LIMIT $${this.nextParam()}`;
                const values = [...(whereFragment?.values ?? []), facetLimit];

                type FacetRow = Record<string, unknown> & {
                  value: string | number | boolean | Date | null;
                  count: string | number;
                };
                const bucketResults = await this.db.raw<FacetRow>(facetSql, values);

                return {
                  field: facetConfig.field,
                  buckets: bucketResults.map((row) => ({
                    value: row.value,
                    count:
                      typeof row.count === 'number'
                        ? row.count
                        : parseInt(
                            typeof row.count === 'string' ? row.count : String(row.count),
                            10,
                          ),
                  })),
                };
              }),
            )
          : undefined;

      const executionTime = performance.now() - startTime;

      return {
        ...searchResult,
        facets,
        executionTime,
      };
    } catch (error) {
      throw this.wrapError(error, 'searchFaceted');
    }
  }

  /**
   * Count matching results without fetching data.
   *
   * @param query - Search query to count matches for.
   * @param _context - Optional execution context (unused).
   * @returns Number of matching records.
   * @throws {SearchProviderError} When the count query fails.
   */
  async count(query: SearchQuery<TRecord>, _context?: SearchContext): Promise<number> {
    try {
      // Reset param index for this query
      this.paramIndex = 0;
      const whereFragment = this.buildWhereClause(query);
      const whereClause = whereFragment != null ? `WHERE ${whereFragment.text}` : '';

      const countSql = `SELECT COUNT(*) as count FROM ${this.tableConfig.table} ${whereClause}`;
      const countResult = await this.db.raw<CountRow>(countSql, whereFragment?.values ?? []);
      const countValue = countResult[0]?.count;
      return typeof countValue === 'number' ? countValue : parseInt(String(countValue), 10);
    } catch (error) {
      throw this.wrapError(error, 'count');
    }
  }

  /**
   * Check if the provider is healthy/available.
   *
   * @returns `true` if the underlying table is queryable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.raw(`SELECT 1 FROM ${this.tableConfig.table} LIMIT 1`, []);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the provider and release resources.
   * No-op since the database connection is managed externally.
   */
  async close(): Promise<void> {
    // No cleanup needed - connection managed externally
  }

  // ============================================================================
  // Private Methods - Parameter Management
  // ============================================================================

  /**
   * Get the next parameter index for parameterized queries.
   *
   * @returns Next sequential parameter number.
   * @complexity O(1)
   */
  private nextParam(): string {
    return String(++this.paramIndex);
  }

  // ============================================================================
  // Private Methods - Where Clause Building
  // ============================================================================

  /**
   * Build a WHERE clause from query filters.
   *
   * @param query - Search query containing filter configuration.
   * @returns SQL fragment with parameterized values, or undefined if no filters.
   */
  private buildWhereClause(query: SearchQuery<TRecord>): SqlFragment | undefined {
    if (query.filters == null) {
      return undefined;
    }

    // Initialize complexity tracking context
    const context = { conditionCount: 0 };
    return this.translateFilter(query.filters, 0, context);
  }

  /**
   * Translate a filter condition or compound filter to SQL.
   *
   * @param filter - Filter condition or compound filter to translate.
   * @param depth - Current nesting depth for complexity checking.
   * @param context - Mutable context tracking total condition count.
   * @returns SQL fragment, or undefined if filter produces no SQL.
   * @throws {QueryTooComplexError} When depth or condition count exceeds limits.
   */
  private translateFilter(
    filter: FilterCondition<TRecord> | CompoundFilter<TRecord>,
    depth: number = 0,
    context: { conditionCount: number } = { conditionCount: 0 },
  ): SqlFragment | undefined {
    // Check query depth limit
    if (depth > this.config.maxQueryDepth) {
      throw new QueryTooComplexError(
        `Filter nesting exceeds maximum depth of ${String(this.config.maxQueryDepth)}`,
        this.config.maxQueryDepth,
        this.config.maxConditions,
      );
    }

    if (isFilterCondition(filter)) {
      // Check condition count limit
      context.conditionCount++;
      if (context.conditionCount > this.config.maxConditions) {
        throw new QueryTooComplexError(
          `Filter exceeds maximum of ${String(this.config.maxConditions)} conditions`,
          this.config.maxQueryDepth,
          this.config.maxConditions,
        );
      }
      return this.translateCondition(filter);
    }

    if (isCompoundFilter(filter)) {
      return this.translateCompound(filter, depth, context);
    }

    return undefined;
  }

  /**
   * Translate a single filter condition to SQL.
   *
   * @param condition - Filter condition with field, operator, and value.
   * @returns SQL fragment for the condition.
   * @throws {InvalidFilterError} When the field or operator is unsupported.
   */
  private translateCondition(condition: FilterCondition<TRecord>): SqlFragment | undefined {
    const fieldName = String(condition.field);
    const columnName = this.resolveColumnName(fieldName);
    if (columnName == null || columnName === '') {
      throw new InvalidFilterError(`Unknown field: ${fieldName}`, fieldName);
    }

    const value = condition.value;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    switch (condition.operator) {
      case FILTER_OPERATORS.EQ:
        return { text: `${columnName} = $${this.nextParam()}`, values: [value] };

      case FILTER_OPERATORS.NEQ:
        return { text: `${columnName} <> $${this.nextParam()}`, values: [value] };

      case FILTER_OPERATORS.GT:
        return { text: `${columnName} > $${this.nextParam()}`, values: [value] };

      case FILTER_OPERATORS.GTE:
        return { text: `${columnName} >= $${this.nextParam()}`, values: [value] };

      case FILTER_OPERATORS.LT:
        return { text: `${columnName} < $${this.nextParam()}`, values: [value] };

      case FILTER_OPERATORS.LTE:
        return { text: `${columnName} <= $${this.nextParam()}`, values: [value] };

      case FILTER_OPERATORS.CONTAINS:
        return {
          text: `${columnName} ILIKE $${this.nextParam()}`,
          values: [`%${this.escapeLikePattern(stringValue)}%`],
        };

      case FILTER_OPERATORS.StartsWith:
        return {
          text: `${columnName} ILIKE $${this.nextParam()}`,
          values: [`${this.escapeLikePattern(stringValue)}%`],
        };

      case FILTER_OPERATORS.EndsWith:
        return {
          text: `${columnName} ILIKE $${this.nextParam()}`,
          values: [`%${this.escapeLikePattern(stringValue)}`],
        };

      case FILTER_OPERATORS.LIKE:
        return {
          text:
            condition.caseSensitive === true
              ? `${columnName} LIKE $${this.nextParam()}`
              : `${columnName} ILIKE $${this.nextParam()}`,
          values: [value],
        };

      case FILTER_OPERATORS.ILIKE:
        return { text: `${columnName} ILIKE $${this.nextParam()}`, values: [value] };

      case FILTER_OPERATORS.IN: {
        if (!Array.isArray(value) || value.length === 0) {
          return { text: 'false', values: [] };
        }
        const placeholders = value.map(() => `$${this.nextParam()}`).join(', ');
        return { text: `${columnName} IN (${placeholders})`, values: value };
      }

      case FILTER_OPERATORS.NotIn: {
        if (!Array.isArray(value) || value.length === 0) {
          return undefined;
        }
        const placeholders = value.map(() => `$${this.nextParam()}`).join(', ');
        return { text: `${columnName} NOT IN (${placeholders})`, values: value };
      }

      case FILTER_OPERATORS.IsNull:
        return { text: `${columnName} IS NULL`, values: [] };

      case FILTER_OPERATORS.IsNotNull:
        return { text: `${columnName} IS NOT NULL`, values: [] };

      case FILTER_OPERATORS.BETWEEN:
        if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
          return {
            text: `${columnName} BETWEEN $${this.nextParam()} AND $${this.nextParam()}`,
            values: [value.min, value.max],
          };
        }
        throw new InvalidFilterError(
          'BETWEEN operator requires {min, max} value',
          fieldName,
          condition.operator,
        );

      case FILTER_OPERATORS.ArrayContains:
      case FILTER_OPERATORS.ArrayContainsAny:
      case FILTER_OPERATORS.FullText:
      default:
        throw new InvalidFilterError(
          `Unsupported operator: ${condition.operator as string}`,
          fieldName,
          condition.operator,
        );
    }
  }

  /**
   * Translate a compound filter (AND/OR/NOT) to SQL.
   *
   * @param compound - Compound filter with operator and conditions.
   * @param depth - Current nesting depth.
   * @param context - Mutable context tracking total condition count.
   * @returns SQL fragment combining all child conditions.
   * @throws {InvalidFilterError} When the logical operator is unknown.
   */
  private translateCompound(
    compound: CompoundFilter<TRecord>,
    depth: number = 0,
    context: { conditionCount: number } = { conditionCount: 0 },
  ): SqlFragment | undefined {
    const fragments = compound.conditions
      .map((condition: FilterCondition<TRecord> | CompoundFilter<TRecord>) =>
        this.translateFilter(condition, depth + 1, context),
      )
      .filter(
        (fragment: SqlFragment | undefined): fragment is SqlFragment => fragment !== undefined,
      );

    if (fragments.length === 0) {
      return undefined;
    }

    const combinedText = fragments
      .map((fragment: SqlFragment) => `(${fragment.text})`)
      .join(compound.operator === LOGICAL_OPERATORS.AND ? ' AND ' : ' OR ');
    const combinedValues = fragments.flatMap((fragment: SqlFragment) => fragment.values);

    switch (compound.operator) {
      case LOGICAL_OPERATORS.AND:
        return { text: combinedText, values: combinedValues };

      case LOGICAL_OPERATORS.OR:
        return { text: combinedText, values: combinedValues };

      case LOGICAL_OPERATORS.NOT:
        return { text: `NOT (${combinedText})`, values: combinedValues };

      default:
        throw new InvalidFilterError(`Unknown logical operator: ${String(compound.operator)}`);
    }
  }

  // ============================================================================
  // Private Methods - Order By Building
  // ============================================================================

  /**
   * Build an ORDER BY clause from sort configuration.
   *
   * @param sort - Array of sort configurations.
   * @returns SQL ORDER BY clause text (without the ORDER BY keyword).
   */
  private buildOrderByClause(sort?: SortConfig<TRecord>[]): string {
    if (sort == null || sort.length === 0) {
      // Default sort by primary key
      const pkKey = Array.isArray(this.tableConfig.primaryKey)
        ? this.tableConfig.primaryKey[0]
        : this.tableConfig.primaryKey;
      const pkColumn = pkKey != null && pkKey !== '' ? this.resolveColumnName(pkKey) : undefined;
      return pkColumn != null && pkColumn !== '' ? `${pkColumn} ASC` : '';
    }

    return sort
      .map((s) => {
        const columnName = this.resolveColumnName(String(s.field));
        if (columnName == null || columnName === '') return null;
        return `${columnName} ${s.order === 'desc' ? 'DESC' : 'ASC'}`;
      })
      .filter((s): s is string => s !== null)
      .join(', ');
  }

  // ============================================================================
  // Private Methods - Cursor Handling
  // ============================================================================

  /**
   * Build a cursor condition for keyset pagination.
   *
   * @param cursor - Encoded cursor string.
   * @param sort - Sort configuration used for cursor ordering.
   * @returns SQL fragment for cursor-based filtering.
   * @throws {InvalidCursorError} When the cursor format is invalid.
   */
  private buildCursorCondition(
    cursor: string,
    sort: SortConfig<TRecord>[],
  ): SqlFragment | undefined {
    try {
      const decoded = decodeCursor(cursor);

      if (decoded == null) {
        throw new InvalidCursorError('Invalid cursor format');
      }

      // For simple single-field cursor
      const firstSort = sort[0];
      const sortField = firstSort != null ? String(firstSort.field) : 'id';
      const sortOrder = firstSort?.order ?? 'asc';
      const cursorValue = decoded.value;

      const columnName = this.resolveColumnName(sortField);
      if (columnName == null || columnName === '') {
        throw new InvalidCursorError(`Unknown sort field in cursor: ${sortField}`);
      }

      // Forward pagination: get items after cursor
      const operator = sortOrder === 'desc' ? '<' : '>';
      return {
        text: `${columnName} ${operator} $${this.nextParam()}`,
        values: [cursorValue],
      };
    } catch (error) {
      if (error instanceof InvalidCursorError) {
        throw error;
      }
      throw new InvalidCursorError('Failed to decode cursor');
    }
  }

  /**
   * Create an encoded cursor from a record and sort configuration.
   *
   * @param record - Record to create cursor from.
   * @param sort - Sort configuration for cursor field selection.
   * @returns Base64-encoded cursor string.
   */
  private createCursor(record: TRecord, sort: SortConfig<TRecord>[]): string {
    const firstSort = sort[0];
    const sortField = firstSort != null ? String(firstSort.field) : 'id';
    const sortValue = record[sortField];
    const tieBreaker = String(record['id'] ?? record[sortField]);

    return encodeCursor({
      value: sortValue as string | number | Date,
      tieBreaker,
      sortOrder: firstSort?.order ?? 'asc',
    });
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  /**
   * Escape SQL LIKE metacharacters in user input.
   * Prevents users from injecting wildcards like % or _ into search patterns.
   *
   * @param value - Raw user input string.
   * @returns Escaped string safe for use in LIKE/ILIKE patterns.
   * @complexity O(n) where n is the string length.
   */
  private escapeLikePattern(value: string): string {
    // Escape backslash first, then % and _ metacharacters
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  /**
   * Resolve a field name to its actual column name.
   * Checks column mappings first, then validates against allowed columns.
   *
   * @param field - Field name from the query.
   * @returns Resolved column name, or undefined if not found.
   * @complexity O(n) where n is the number of column mappings.
   */
  private resolveColumnName(field: string): string | undefined {
    // Check column mappings first
    const mapping = this.tableConfig.columns.find((c) => c.field === field);
    if (mapping != null) {
      return mapping.column;
    }

    // If no explicit mapping, check if field is in columns list
    const isKnownColumn = this.tableConfig.columns.some(
      (c) => c.column === field || c.field === field,
    );

    // If columns list is empty, assume field is valid (backwards compatibility)
    if (this.tableConfig.columns.length === 0 || isKnownColumn) {
      return field;
    }

    return undefined;
  }

  /**
   * Wrap an unknown error into a SearchError subclass.
   *
   * @param error - Original error.
   * @param operation - Name of the operation that failed.
   * @returns SearchError wrapping the original error.
   */
  private wrapError(error: unknown, operation: string): SearchError {
    // Preserve all SearchError subclasses (QueryTooComplexError, InvalidFilterError, etc.)
    if (error instanceof SearchError) {
      return error;
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error during search operation';

    return new SearchProviderError(
      `SQL search ${operation} failed: ${message}`,
      this.name,
      error instanceof Error ? error : undefined,
    );
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a SQL search provider.
 *
 * @param db - Raw database client.
 * @param repos - Repository container.
 * @param tableConfig - Table and column configuration.
 * @param config - Optional provider configuration.
 * @returns Configured SQL search provider instance.
 */
export function createSqlSearchProvider<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>(
  db: RawDb,
  repos: Repositories,
  tableConfig: Partial<SqlTableConfig> & { table: string },
  config?: SqlSearchProviderConfig,
): SqlSearchProvider<TRecord> {
  return new SqlSearchProvider(db, repos, tableConfig, config);
}
