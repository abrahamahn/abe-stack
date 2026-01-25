// packages/core/src/index.ts
/**
 * @abe-stack/core
 *
 * Backend utilities, infrastructure, and domain logic for ABE Stack.
 */

// ============================================================================
// Configuration
// ============================================================================
export * from './config';

// ============================================================================
// Infrastructure
// ============================================================================
export * from './infrastructure/async';
export {
    CacheCapacityError,
    CacheConnectionError,
    CacheDeserializationError,
    CacheError,
    CacheInvalidKeyError,
    CacheMemoryLimitError,
    CacheNotInitializedError,
    CacheProviderNotFoundError,
    CacheSerializationError,
    CacheTimeoutError,
    isCacheConnectionError,
    isCacheError,
    isCacheTimeoutError,
    toCacheError
} from './infrastructure/cache';
export type {
    BaseCacheConfig,
    CacheDeleteOptions,
    CacheEntry,
    CacheEntryMetadata,
    CacheGetOptions,
    CacheProvider,
    CacheSetOptions,
    CacheStats,
    MemoryCacheConfig
} from './infrastructure/cache';
export * from './infrastructure/crypto';
export * from './infrastructure/errors';
export * from './infrastructure/http';
export { LOG_LEVELS, createConsoleLogger } from './infrastructure/logger/console';
export type { ConsoleLoggerConfig, LogData } from './infrastructure/logger/console';
export * from './infrastructure/pubsub';
export * from './infrastructure/search';

// ============================================================================
// Modules (Domain Logic)
// ============================================================================
export * from './modules/auth';
export {
    // Providers (avoid duplicates)
    BillingProviderError,
    // Aliases
    BillingProviderNotConfiguredError, BillingSubscriptionExistsError, BillingSubscriptionNotFoundError, CannotDeactivatePlanWithActiveSubscriptionsError, CannotDowngradeInTrialError, CannotRemoveDefaultPaymentMethodError, CheckoutSessionError,
    // Customers
    CustomerNotFoundError,
    // Invoices
    InvoiceNotFoundError,
    // Payment methods
    PaymentMethodNotFoundError, PaymentMethodValidationError, PlanHasActiveSubscriptionsError, PlanNotActiveError,
    // Plans
    PlanNotFoundError,
    // Subscriptions (avoid duplicates with infrastructure)
    SubscriptionAlreadyCanceledError, SubscriptionNotActiveError, SubscriptionNotCancelingError, WebhookEventAlreadyProcessedError, WebhookSignatureError,
    // Type guards
    isBillingProviderError, isPlanError, isSubscriptionError
} from './modules/billing';
export * from './modules/notifications';
export { PushSubscriptionExistsError } from './modules/notifications';

// ============================================================================
// Resolve ambiguities
export type { BillingProvider } from './config';
export { SORT_ORDER } from './infrastructure/search';
export type { SortOrder } from './infrastructure/search';

// Contract Re-exports (for convenience)
// ============================================================================
export * from '@abe-stack/contracts';

// Realtime Aliases (server expectations)
export type {
    ListInsertOperation as RealtimeListInsertOperation,
    ListRemoveOperation as RealtimeListRemoveOperation, Operation as RealtimeOperation, SetNowOperation as RealtimeSetNowOperation, SetOperation as RealtimeSetOperation
} from '@abe-stack/contracts';

// ============================================================================
// Shared Utilities
// ============================================================================
export * from './shared';
export * from './shared/constants';
export * from './shared/pagination';
export { addAuthHeader } from './shared/token';

