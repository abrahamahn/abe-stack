// apps/server/src/config/index.ts
/**
 * Config Factory
 *
 * Exports only the local config factory. All package-specific config loaders
 * and types should be imported directly from their source packages:
 *
 *   - AppConfig type        → @abe-stack/core/config
 *   - loadAuthConfig        → @abe-stack/auth
 *   - loadDatabaseConfig    → @abe-stack/db
 *   - loadServerConfig      → @abe-stack/http
 *   - loadBillingConfig     → @abe-stack/billing
 *   - loadEmailConfig       → @abe-stack/email
 *   - loadStorageConfig     → @abe-stack/storage
 *   - loadCacheConfig       → @abe-stack/cache
 *   - loadNotificationsConfig → @abe-stack/notifications
 */
export { load, load as loadConfig } from './factory';
