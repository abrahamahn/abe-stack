/**
 * Client-side exports for @abe/core/client
 */

export {
  EnvironmentProvider,
  useEnvironment,
  useApi,
  useAuth,
  useConfig,
} from './EnvironmentProvider';

export {
  DEFAULT_CLIENT_CONFIG,
  type ClientEnvironment,
  type ClientConfig,
  type AuthState,
  type ApiClient,
  type User,
  type PubsubClient,
  type RecordCache,
  type RecordStorage,
  type TransactionQueue,
  type SubscriptionCache,
  type UndoRedoStack,
} from './ClientEnvironment';
