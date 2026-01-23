// apps/server/src/config/types.ts
/**
 * Application Configuration Types
 */

import type { AuthConfig } from '@config/auth.config';
import type { BillingConfig } from '@config/billing.config';
import type { DatabaseConfig } from '@config/database.config';
import type { EmailConfig } from '@config/email.config';
import type { ServerConfig } from '@config/server.config';
import type { StorageConfig } from '@config/storage.config';

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
  billing?: BillingConfig;
}
