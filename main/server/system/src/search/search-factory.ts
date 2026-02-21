// main/server/system/src/search/search-factory.ts
/**
 * Search Provider Factory
 *
 * Re-exported from @bslt/db where the canonical implementation lives.
 * The factory creates SQL and Elasticsearch providers, both of which
 * depend on @bslt/db internals.
 *
 * Canonical location: @bslt/server-system (re-exports from @bslt/db)
 */

export {
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
} from '@bslt/db';

export type { ProviderOptions, SqlSearchProviderOptions } from '@bslt/db';
