// apps/server/src/config/types.ts
/**
 * Application Configuration Types
 */

import type { AuthConfig } from './auth.config';
import type { DatabaseConfig } from './database.config';
import type { EmailConfig } from './email.config';
import type { ServerConfig } from './server.config';
import type { StorageConfig } from './storage.config';

/**
 * Complete application configuration
 * This is the single object that contains ALL settings
 */
export interface AppConfig {
  env: 'development' | 'production' | 'test';
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  email: EmailConfig;
  storage: StorageConfig;
}
