// main/server/engine/src/system/types.ts
import type { RawDb, Repositories, SessionContext } from '@bslt/db';
import type {
  BillingService,
  DetailedHealthResponse as DetailedHealth,
  EmailService,
  ErrorTracker,
  HealthCheckCache,
  HealthCheckDatabase,
  HealthCheckPubSub,
  HealthCheckQueue,
  Logger,
  NotificationService,
  StorageClient,
} from '@bslt/shared';
import type { AppConfig } from '../config';
import type { AuthEmailTemplates } from '../mailer/types';
import type { QueueStore, WriteService } from '../queue';
import type { ServerSearchProvider } from '../search';
import type { SmsProvider } from '../sms';

/**
 * Context required by the system health-check functions.
 * Subset of the full AppContext to allow decoupling from Fastify/HTTP layer.
 *
 * @property config - Application configuration snapshot
 * @property db     - Database handle that satisfies both health-check and raw-query interfaces
 * @property cache  - Cache handle for connectivity checks
 * @property queue  - Queue handle for connectivity checks (can be QueueStore)
 * @property pubsub - Pub/sub handle for connectivity checks
 * @property log    - Structured logger instance
 * @property repos  - Data access repositories
 * @property write  - Write service for transactional operations
 * @property search - Search provider
 * @property emailTemplates - Email templates for auth
 * @property queueStore - Queue storage backend
 * @property errorTracker - Error tracking service
 */
export interface SystemContext {
  config: AppConfig;
  db: HealthCheckDatabase & RawDb;
  cache: HealthCheckCache;
  queue: HealthCheckQueue;
  pubsub: HealthCheckPubSub;
  log: Logger;
  repos: Repositories;
  write: WriteService;
  search: ServerSearchProvider;
  emailTemplates: AuthEmailTemplates;
  queueStore: QueueStore;
  errorTracker: ErrorTracker;

  // Additional scoped services
  email?: EmailService;
  storage?: StorageClient;
  notifications?: NotificationService;
  billing?: BillingService;
  sms?: SmsProvider;

  /**
   * Helper to check system health
   */
  health(): Promise<DetailedHealth>;

  /**
   * Create a contextualized system context for Row-Level Security
   */
  contextualize(session: SessionContext): SystemContext;
}
