// main/shared/src/config/search.defaults.ts
/**
 * Default search schemas for SQL-based search.
 *
 * Shared between server (config loader) and client (table rendering).
 */
import type { SqlTableConfig } from './env.search';

/** Default searchable table definitions. */
export const DEFAULT_SEARCH_SCHEMAS: Record<string, SqlTableConfig> = {
  users: {
    table: 'users',
    primaryKey: 'id',
    columns: [
      { field: 'name', column: 'name', type: 'string', filterable: true, sortable: true },
      { field: 'email', column: 'email', type: 'string', filterable: true, sortable: true },
    ],
  },
};
