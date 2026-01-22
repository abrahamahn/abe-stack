// apps/server/src/infrastructure/search/sql-provider.ts
/**
 * SQL Search Provider
 *
 * Drizzle ORM-based search provider for SQL databases.
 * Translates search queries to SQL with proper escaping and parameterization.
 */

import {
  encodeCursor,
  decodeCursor,
  FILTER_OPERATORS,
  LOGICAL_OPERATORS,
  isFilterCondition,
  isCompoundFilter,
  InvalidFilterError,
  InvalidCursorError,
  SearchProviderError,
  QueryTooComplexError,
  SearchError,
  type CompoundFilter,
  type CursorSearchResult,
  type FacetedSearchQuery,
  type FacetedSearchResult,
  type FilterCondition,
  type FilterOperator,
  type SearchCapabilities,
  type SearchQuery,
  type SearchResult,
  type SortConfig,
} from '@abe-stack/core';
import {
  and,
  asc,
  between,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import type {
  SearchContext,
  ServerSearchProvider,
  SqlSearchProviderConfig,
  SqlTableConfig,
} from './types';
import type { DbClient } from '@database';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

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
  FILTER_OPERATORS.STARTS_WITH,
  FILTER_OPERATORS.ENDS_WITH,
  FILTER_OPERATORS.LIKE,
  FILTER_OPERATORS.ILIKE,
  FILTER_OPERATORS.IN,
  FILTER_OPERATORS.NOT_IN,
  FILTER_OPERATORS.IS_NULL,
  FILTER_OPERATORS.IS_NOT_NULL,
  FILTER_OPERATORS.BETWEEN,
];

// ============================================================================
// SQL Search Provider
// ============================================================================

/**
 * SQL-based search provider using Drizzle ORM.
 */
export class SqlSearchProvider<
  TTable extends PgTableWithColumns<{
    name: string;
    schema: string | undefined;
    columns: Record<string, PgColumn>;
    dialect: 'pg';
  }>,
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> implements ServerSearchProvider<TRecord> {
  readonly name: string;
  private readonly config: Required<Omit<SqlSearchProviderConfig, 'name'>>;
  private readonly tableConfig: SqlTableConfig;

  constructor(
    private readonly db: DbClient,
    private readonly table: TTable,
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

  /**
   * Get table with compatible type for Drizzle's from() method.
   * Uses double assertion to work around Drizzle ORM v0.35+ type constraints.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get fromTable(): any {
    return this.table;
  }

  // ============================================================================
  // Public API
  // ============================================================================

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

  async search(
    query: SearchQuery<TRecord>,
    _context?: SearchContext,
  ): Promise<SearchResult<TRecord>> {
    const startTime = performance.now();

    try {
      const page = query.page ?? 1;
      const limit = Math.min(query.limit ?? this.config.defaultPageSize, this.config.maxPageSize);
      const offset = (page - 1) * limit;

      // Build the query
      const whereClause = this.buildWhereClause(query);
      const orderByClause = this.buildOrderByClause(query.sort);

      // Execute query with one extra row to determine hasNext
      const qb = this.db.select().from(this.fromTable);
      const qbWithWhere = whereClause ? qb.where(whereClause) : qb;
      const qbWithOrder =
        orderByClause.length > 0 ? qbWithWhere.orderBy(...orderByClause) : qbWithWhere;

      const results = await qbWithOrder.limit(limit + 1).offset(offset);

      const hasNext = results.length > limit;
      const data = (hasNext ? results.slice(0, limit) : results) as TRecord[];

      // Get total count if requested
      let total: number | undefined;
      if (query.includeCount) {
        const countQb = this.db.select({ count: sql<number>`count(*)` }).from(this.fromTable);
        const countQbWithWhere = whereClause ? countQb.where(whereClause) : countQb;
        const countResult = await countQbWithWhere;
        const countValue = countResult[0]?.count;
        total = typeof countValue === 'number' ? countValue : 0;
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

  async searchWithCursor(
    query: SearchQuery<TRecord>,
    _context?: SearchContext,
  ): Promise<CursorSearchResult<TRecord>> {
    const startTime = performance.now();

    try {
      const limit = Math.min(query.limit ?? this.config.defaultPageSize, this.config.maxPageSize);

      // Build base where clause
      let whereClause = this.buildWhereClause(query);

      // Apply cursor if provided
      if (query.cursor) {
        const cursorWhere = this.buildCursorCondition(query.cursor, query.sort ?? []);
        whereClause = whereClause ? and(whereClause, cursorWhere) : cursorWhere;
      }

      const orderByClause = this.buildOrderByClause(query.sort);

      // Execute query with extra rows for cursor detection
      const qb = this.db.select().from(this.fromTable);
      const qbWithWhere = whereClause ? qb.where(whereClause) : qb;
      const results = await qbWithWhere.orderBy(...orderByClause).limit(limit + 1);

      const hasNext = results.length > limit;
      const data = (hasNext ? results.slice(0, limit) : results) as TRecord[];

      // Generate cursors
      const lastItem = data[data.length - 1];
      const nextCursor = hasNext && lastItem ? this.createCursor(lastItem, query.sort ?? []) : null;

      // Get total count if requested
      let total: number | undefined;
      if (query.includeCount) {
        const baseWhere = this.buildWhereClause(query);
        const countQb = this.db.select({ count: sql<number>`count(*)` }).from(this.fromTable);
        const countQbWithWhere = baseWhere ? countQb.where(baseWhere) : countQb;
        const countResult = await countQbWithWhere;
        const countValue = countResult[0]?.count;
        total = typeof countValue === 'number' ? countValue : 0;
      }

      const executionTime = performance.now() - startTime;

      return {
        data: data.map((item) => ({ item })),
        nextCursor,
        prevCursor: null, // Would need to implement backward pagination
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
        query.facets && query.facets.length > 0
          ? await Promise.all(
              query.facets.map(async (facetConfig) => {
                const column = this.getColumn(facetConfig.field);
                if (!column) {
                  return {
                    field: facetConfig.field,
                    buckets: [],
                  };
                }

                const whereClause = this.buildWhereClause(query);
                const facetLimit = facetConfig.size ?? 10;

                const bucketQb = this.db
                  .select({
                    value: column,
                    count: sql<number>`count(*)`,
                  })
                  .from(this.fromTable);

                const bucketQbWithWhere = whereClause ? bucketQb.where(whereClause) : bucketQb;

                const bucketResults = await bucketQbWithWhere
                  .groupBy(column)
                  .orderBy(desc(sql`count(*)`))
                  .limit(facetLimit);

                return {
                  field: facetConfig.field,
                  buckets: bucketResults.map((row) => ({
                    value: row.value as string | number | boolean | Date | null,
                    count: typeof row.count === 'number' ? row.count : 0,
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

  async count(query: SearchQuery<TRecord>, _context?: SearchContext): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(query);

      const qb = this.db.select({ count: sql<number>`count(*)` }).from(this.fromTable);
      const qbWithWhere = whereClause ? qb.where(whereClause) : qb;
      const result = await qbWithWhere;

      const countValue = result[0]?.count;
      return typeof countValue === 'number' ? countValue : 0;
    } catch (error) {
      throw this.wrapError(error, 'count');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.db
        .select({ one: sql`1` })
        .from(this.fromTable)
        .limit(1);
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    // No cleanup needed for Drizzle - connection managed externally
  }

  // ============================================================================
  // Private Methods - Where Clause Building
  // ============================================================================

  private buildWhereClause(query: SearchQuery<TRecord>): SQL | undefined {
    if (!query.filters) {
      return undefined;
    }

    // Initialize complexity tracking context
    const context = { conditionCount: 0 };
    return this.translateFilter(query.filters, 0, context);
  }

  private translateFilter(
    filter: FilterCondition<TRecord> | CompoundFilter<TRecord>,
    depth: number = 0,
    context: { conditionCount: number } = { conditionCount: 0 },
  ): SQL | undefined {
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

  private translateCondition(condition: FilterCondition<TRecord>): SQL | undefined {
    const fieldName = String(condition.field);
    const column = this.getColumn(fieldName);
    if (!column) {
      throw new InvalidFilterError(`Unknown field: ${fieldName}`, fieldName);
    }

    const value = condition.value;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    switch (condition.operator) {
      case FILTER_OPERATORS.EQ:
        return eq(column, value);

      case FILTER_OPERATORS.NEQ:
        return ne(column, value);

      case FILTER_OPERATORS.GT:
        return gt(column, value);

      case FILTER_OPERATORS.GTE:
        return gte(column, value);

      case FILTER_OPERATORS.LT:
        return lt(column, value);

      case FILTER_OPERATORS.LTE:
        return lte(column, value);

      case FILTER_OPERATORS.CONTAINS:
        return ilike(column, `%${this.escapeLikePattern(stringValue)}%`);

      case FILTER_OPERATORS.STARTS_WITH:
        return ilike(column, `${this.escapeLikePattern(stringValue)}%`);

      case FILTER_OPERATORS.ENDS_WITH:
        return ilike(column, `%${this.escapeLikePattern(stringValue)}`);

      case FILTER_OPERATORS.LIKE:
        return condition.caseSensitive
          ? like(column, value as string)
          : ilike(column, value as string);

      case FILTER_OPERATORS.ILIKE:
        return ilike(column, value as string);

      case FILTER_OPERATORS.IN:
        if (!Array.isArray(value) || value.length === 0) {
          return sql`false`;
        }
        return inArray(column, value);

      case FILTER_OPERATORS.NOT_IN:
        if (!Array.isArray(value) || value.length === 0) {
          return undefined;
        }
        return notInArray(column, value);

      case FILTER_OPERATORS.IS_NULL:
        return isNull(column);

      case FILTER_OPERATORS.IS_NOT_NULL:
        return isNotNull(column);

      case FILTER_OPERATORS.BETWEEN:
        if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
          return between(column, value.min, value.max);
        }
        throw new InvalidFilterError(
          'BETWEEN operator requires {min, max} value',
          fieldName,
          condition.operator,
        );

      default:
        throw new InvalidFilterError(
          `Unsupported operator: ${condition.operator as string}`,
          fieldName,
          condition.operator,
        );
    }
  }

  private translateCompound(
    compound: CompoundFilter<TRecord>,
    depth: number = 0,
    context: { conditionCount: number } = { conditionCount: 0 },
  ): SQL | undefined {
    const conditions = compound.conditions
      .map((c) => this.translateFilter(c, depth + 1, context))
      .filter((c): c is SQL => c !== undefined);

    if (conditions.length === 0) {
      return undefined;
    }

    switch (compound.operator) {
      case LOGICAL_OPERATORS.AND:
        return and(...conditions);

      case LOGICAL_OPERATORS.OR:
        return or(...conditions);

      case LOGICAL_OPERATORS.NOT: {
        // NOT is applied to the combined AND of conditions
        const combined = and(...conditions);
        return combined ? sql`NOT (${combined})` : undefined;
      }

      default:
        throw new InvalidFilterError(`Unknown logical operator: ${String(compound.operator)}`);
    }
  }

  // ============================================================================
  // Private Methods - Order By Building
  // ============================================================================

  private buildOrderByClause(sort?: SortConfig<TRecord>[]): SQL[] {
    if (!sort || sort.length === 0) {
      // Default sort by primary key
      const pkKey = Array.isArray(this.tableConfig.primaryKey)
        ? this.tableConfig.primaryKey[0]
        : this.tableConfig.primaryKey;
      const pkColumn = pkKey ? this.getColumn(pkKey) : undefined;
      return pkColumn ? [asc(pkColumn)] : [];
    }

    return sort
      .map((s) => {
        const column = this.getColumn(String(s.field));
        if (!column) return null;
        return s.order === 'desc' ? desc(column) : asc(column);
      })
      .filter((s): s is SQL => s !== null);
  }

  // ============================================================================
  // Private Methods - Cursor Handling
  // ============================================================================

  private buildCursorCondition(cursor: string, sort: SortConfig<TRecord>[]): SQL | undefined {
    try {
      const decoded = decodeCursor(cursor);

      if (!decoded) {
        throw new InvalidCursorError('Invalid cursor format');
      }

      // For simple single-field cursor
      const firstSort = sort[0];
      const sortField = firstSort ? String(firstSort.field) : 'id';
      const sortOrder = firstSort?.order ?? 'asc';
      const cursorValue = decoded.value;

      const column = this.getColumn(sortField);
      if (!column) {
        throw new InvalidCursorError(`Unknown sort field in cursor: ${sortField}`);
      }

      // Forward pagination: get items after cursor
      return sortOrder === 'desc' ? lt(column, cursorValue) : gt(column, cursorValue);
    } catch (error) {
      if (error instanceof InvalidCursorError) {
        throw error;
      }
      throw new InvalidCursorError('Failed to decode cursor');
    }
  }

  private createCursor(record: TRecord, sort: SortConfig<TRecord>[]): string {
    const firstSort = sort[0];
    const sortField = firstSort ? String(firstSort.field) : 'id';
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
   */
  private escapeLikePattern(value: string): string {
    // Escape backslash first, then % and _ metacharacters
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  private getColumn(field: string): PgColumn | undefined {
    // Check column mappings first
    const mapping = this.tableConfig.columns.find((c) => c.field === field);
    const columnName = mapping?.column ?? field;

    // Get from table
    const columns = this.table as unknown as { [key: string]: PgColumn };
    return columns[columnName];
  }

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
 */
export function createSqlSearchProvider<
  TTable extends PgTableWithColumns<{
    name: string;
    schema: string | undefined;
    columns: Record<string, PgColumn>;
    dialect: 'pg';
  }>,
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>(
  db: DbClient,
  table: TTable,
  tableConfig: Partial<SqlTableConfig> & { table: string },
  config?: SqlSearchProviderConfig,
): SqlSearchProvider<TTable, TRecord> {
  return new SqlSearchProvider(db, table, tableConfig, config);
}
