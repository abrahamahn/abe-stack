/**
 * @abe/core - Single package for all shared code
 *
 * This package consolidates:
 * - Server/Client Environment patterns (chet-stack inspired)
 * - Database (Drizzle ORM)
 * - API client
 * - Storage (local/S3)
 * - Contracts (ts-rest)
 * - Environment validation
 * - Utilities
 *
 * Import patterns:
 * - import { createServerEnvironment } from '@abe/core/server'
 * - import { EnvironmentProvider, useEnvironment } from '@abe/core/client'
 * - import { createDbClient } from '@abe/core/db'
 * - import { createApiClient } from '@abe/core/api'
 * - import { createStorage } from '@abe/core/storage'
 * - import { apiContract } from '@abe/core/contracts'
 * - import { loadServerEnv } from '@abe/core/env'
 */

// Re-export everything for convenience
export * from './env';
export * from './contracts';
export * from './utils';

// Server-side exports
export {
  createServerEnvironment,
  createServerConfigFromEnv,
  DEFAULT_SERVER_CONFIG,
  type ServerEnvironment,
  type ServerConfig,
  type StorageProvider as ServerStorageProvider,
  type PubsubServer,
  type QueueServer,
} from './server';

// Client-side exports
export {
  EnvironmentProvider,
  useEnvironment,
  useApi,
  useAuth,
  useConfig,
  DEFAULT_CLIENT_CONFIG,
  type ClientEnvironment,
  type ClientConfig,
  type AuthState,
  type ApiClient as ClientApiClient,
  type User,
  type PubsubClient,
  type RecordCache,
  type RecordStorage,
  type TransactionQueue,
  type SubscriptionCache,
  type UndoRedoStack,
} from './client';

// Database exports
export {
  createDbClient,
  buildConnectionString,
  resolveConnectionStringWithFallback,
  type DbClient,
} from './db';

// API exports
export {
  createApiClient,
  createReactQueryClient,
  type ApiClientConfig,
  type ApiClient,
  type CreateApiOptions,
  type ReactQueryClientInstance,
} from './api';

// Storage exports
export {
  createStorage,
  toStorageConfig,
  type StorageConfig,
  type StorageProvider,
  type LocalStorageConfig,
  type S3StorageConfig,
  type UploadParams,
} from './storage';
