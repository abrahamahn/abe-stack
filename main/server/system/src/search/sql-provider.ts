// main/server/system/src/search/sql-provider.ts
/**
 * SQL Search Provider
 *
 * Re-exported from @bslt/db where the canonical implementation lives.
 * The SQL provider is tightly coupled to database internals (RawDb, Repositories)
 * and remains implemented in @bslt/db. This module re-exports for @bslt/server-system
 * consumers.
 *
 * Canonical location: @bslt/server-system (re-exports from @bslt/db)
 */

export { createSqlSearchProvider, SqlSearchProvider } from '@bslt/db';
