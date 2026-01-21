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
> implements ServerSearchProvider<TRecord>
{
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await this.db
        .select()
        .from(this.table as any)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(limit + 1)
        .offset(offset);

      const hasNext = results.length > limit;
      const data = (hasNext ? results.slice(0, limit) : results) as TRecord[];

      // Get total count if requested
      let total: number | undefined;
      if (query.includeCount) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(this.table as any)
          .where(whereClause);
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
       
      const results = await this.db
        .select()
        .from(this.table as any)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(limit + 1);

      const hasNext = results.length > limit;
      const data = (hasNext ? results.slice(0, limit) : results) as TRecord[];

      // Generate cursors
      const lastItem = data[data.length - 1];
      const nextCursor =
        hasNext && lastItem
          ? this.createCursor(lastItem, query.sort ?? [])
          : null;

      // Get total count if requested
      let total: number | undefined;
      if (query.includeCount) {
        const baseWhere = this.buildWhereClause(query);
         
        const countResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(this.table as any)
          .where(baseWhere);
        total = Number(countResult[0]?.count ?? 0);
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

                 
                const bucketResults = await this.db
                  .select({
                    value: column,
                    count: sql<number>`count(*)`,
                  })
                  .from(this.table as any)
                  .where(whereClause)
                  .groupBy(column)
                  .orderBy(desc(sql`count(*)`))
                  .limit(facetLimit);

                return {
                  field: facetConfig.field,
                  buckets: bucketResults.map((row) => ({
                    value: row.value as string | number | boolean | Date | null,
                    count: Number(row.count),
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

       
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.table as any)
        .where(whereClause);

      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw this.wrapError(error, 'count');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.db.select({ one: sql`1` }).from(this.table as any).limit(1);
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

    return this.translateFilter(query.filters);
  }

  private translateFilter(
    filter: FilterCondition<TRecord> | CompoundFilter<TRecord>,
  ): SQL | undefined {
    if (isFilterCondition(filter)) {
      return this.translateCondition(filter);
    }

    if (isCompoundFilter(filter)) {
      return this.translateCompound(filter);
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

     
    switch (condition.operator) {
      case FILTER_OPERATORS.EQ:
        return eq(column, value as any);

      case FILTER_OPERATORS.NEQ:
        return ne(column, value as any);

      case FILTER_OPERATORS.GT:
        return gt(column, value as any);

      case FILTER_OPERATORS.GTE:
        return gte(column, value as any);

      case FILTER_OPERATORS.LT:
        return lt(column, value as any);

      case FILTER_OPERATORS.LTE:
        return lte(column, value as any);

      case FILTER_OPERATORS.CONTAINS:
        return ilike(column, `%${value}%`);

      case FILTER_OPERATORS.STARTS_WITH:
        return ilike(column, `${value}%`);

      case FILTER_OPERATORS.ENDS_WITH:
        return ilike(column, `%${value}`);

      case FILTER_OPERATORS.LIKE:
        return condition.caseSensitive ? like(column, value as string) : ilike(column, value as string);

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
        if (
          typeof value === 'object' &&
          value !== null &&
          'min' in value &&
          'max' in value
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return between(column, value.min as any, value.max as any);
        }
        throw new InvalidFilterError(
          'BETWEEN operator requires {min, max} value',
          fieldName,
          condition.operator,
        );

      default:
        throw new InvalidFilterError(
          `Unsupported operator: ${condition.operator}`,
          fieldName,
          condition.operator,
        );
    }
  }

  private translateCompound(compound: CompoundFilter<TRecord>): SQL | undefined {
    const conditions = compound.conditions
      .map((c) => this.translateFilter(c))
      .filter((c): c is SQL => c !== undefined);

    if (conditions.length === 0) {
      return undefined;
    }

    switch (compound.operator) {
      case LOGICAL_OPERATORS.AND:
        return and(...conditions);

      case LOGICAL_OPERATORS.OR:
        return or(...conditions);

      case LOGICAL_OPERATORS.NOT:
        // NOT is applied to the combined AND of conditions
        const combined = and(...conditions);
        return combined ? sql`NOT (${combined})` : undefined;

      default:
        throw new InvalidFilterError(`Unknown logical operator: ${compound.operator}`);
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

      if (!decoded || decoded.value === undefined) {
        throw new InvalidCursorError('Invalid cursor format');
      }

      // For simple single-field cursor
      const firstSort = sort[0];
      const sortField = firstSort ? String(firstSort.field) : 'id';
      const sortOrder = firstSort?.order ?? 'asc';
      const cursorValue = decoded.value;

      if (cursorValue === undefined) {
        throw new InvalidCursorError('Cursor value not found for sort field');
      }

      const column = this.getColumn(sortField);
      if (!column) {
        throw new InvalidCursorError(`Unknown sort field in cursor: ${sortField}`);
      }

      // Forward pagination: get items after cursor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return sortOrder === 'desc' ? lt(column, cursorValue as any) : gt(column, cursorValue as any);
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

  private getColumn(field: string): PgColumn | undefined {
    // Check column mappings first
    const mapping = this.tableConfig.columns.find((c) => c.field === field);
    const columnName = mapping?.column ?? field;

    // Get from table
    const columns = this.table as unknown as { [key: string]: PgColumn };
    return columns[columnName];
  }

  private wrapError(error: unknown, operation: string): SearchProviderError {
    if (error instanceof SearchProviderError) {
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
