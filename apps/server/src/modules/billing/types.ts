// modules/billing/src/types.ts
/**
 * Billing Module Types
 *
 * Narrow dependency interfaces for the billing package.
 * These interfaces decouple the billing logic from concrete server
 * implementations, keeping the package framework-agnostic.
 *
 * Uses shared context contracts from `@abe-stack/shared` to eliminate
 * duplicate Logger and request interfaces across packages.
 */

import type {
    BillingEventRepository,
    CustomerMappingRepository,
    InvoiceRepository,
    PaymentMethodRepository,
    PlanRepository,
    SubscriptionRepository,
} from '@abe-stack/db';
import type { BaseContext, BillingConfig, BillingService, Logger, RequestContext } from '@abe-stack/shared';

// ============================================================================
// Logger Interface (Transition Alias)
// ============================================================================

/**
 * Logger interface for billing operations.
 *
 * Extends the shared `Logger` contract with a required `child` method.
 * The contracts `Logger` marks `child` as optional; billing requires it
 * for structured logging with billing context bindings.
 *
 * @complexity O(1) per log call
 */
export interface BillingLogger extends Logger {
  /**
   * Create a child logger with additional bindings
   *
   * @param bindings - Key-value pairs to attach to all child log entries
   * @returns A new logger instance with the bindings
   */
  child(bindings: Record<string, unknown>): BillingLogger;
}

// ============================================================================
// Module Dependencies
// ============================================================================

/**
 * Dependencies required by the billing module.
 * Injected at module initialization time.
 *
 * @param db - Database client for raw SQL operations
 * @param logger - Logger instance for structured logging
 */
export interface BillingModuleDeps {
  readonly db: unknown;
  readonly logger: BillingLogger;
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/**
 * Repositories required for billing service operations.
 * Groups the database repositories needed for subscription management,
 * payment processing, and plan queries.
 *
 * @param plans - Repository for plan CRUD and queries
 * @param subscriptions - Repository for subscription lifecycle management
 * @param customerMappings - Repository for provider-to-user customer ID mappings
 * @param invoices - Repository for invoice records
 * @param paymentMethods - Repository for stored payment methods
 */
export interface BillingRepositories {
  readonly plans: PlanRepository;
  readonly subscriptions: SubscriptionRepository;
  readonly customerMappings: CustomerMappingRepository;
  readonly invoices: InvoiceRepository;
  readonly paymentMethods: PaymentMethodRepository;
}

/**
 * Repositories required for webhook event processing.
 * Extends the billing repositories with billing event tracking
 * for idempotent webhook processing.
 *
 * @param billingEvents - Repository for recording processed webhook events
 * @param subscriptions - Repository for subscription lifecycle management
 * @param invoices - Repository for invoice records
 * @param plans - Repository for plan lookups
 * @param customerMappings - Repository for provider-to-user customer ID mappings
 */
export interface WebhookRepositories {
  readonly billingEvents: BillingEventRepository;
  readonly subscriptions: SubscriptionRepository;
  readonly invoices: InvoiceRepository;
  readonly plans: PlanRepository;
  readonly customerMappings: CustomerMappingRepository;
}

// ============================================================================
// Checkout Types
// ============================================================================

// ============================================================================
// Checkout Types
// ============================================================================

export type { CheckoutSessionParams, CheckoutSessionResult } from '@abe-stack/shared';


// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Result from processing a webhook event.
 *
 * @param success - Whether the webhook was processed successfully
 * @param message - Human-readable processing result message
 * @param eventId - Provider-specific event identifier (when available)
 */
export interface WebhookResult {
  readonly success: boolean;
  readonly message: string;
  readonly eventId?: string;
}

// ============================================================================
// Handler Context Types
// ============================================================================

/**
 * Application context for billing handlers.
 *
 * Extends `BaseContext` with billing-specific configuration and repositories.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 *
 * @param config - Application configuration containing billing settings
 * @param repos - Database repositories
 * @param log - Logger instance
 */
export interface BillingAppContext extends BaseContext {
  readonly config: {
    readonly billing: BillingConfig;
  };
  readonly repos: BillingRepositories & {
    readonly billingEvents: BillingEventRepository;
  };
  readonly log: BillingLogger;
}

/**
 * Request interface for billing handlers.
 *
 * Extends `RequestContext` from contracts with an optional `ip` field
 * used for billing fraud detection logging.
 *
 * @param cookies - Request cookies keyed by name
 * @param headers - Request headers
 * @param ip - Client IP address
 * @param user - Authenticated user info (populated by auth middleware)
 */
export interface BillingRequest extends RequestContext {
  readonly ip?: string | undefined;
}

// ============================================================================
// Route Types
// ============================================================================

/**
 * Route handler result returned by billing handlers.
 * Provides a status code and body independent of any HTTP framework.
 *
 * @param status - HTTP status code
 * @param body - Response body
 */
export interface BillingRouteResult<T = unknown> {
  readonly status: number;
  readonly body: T;
}

/**
 * HTTP methods supported by billing routes.
 */
export type BillingHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Validation schema interface for request body parsing.
 * Compatible with Zod-like schemas.
 *
 * @param data - The raw input data to validate
 * @returns A discriminated union indicating success with parsed data or failure with error
 */
export interface BillingValidationSchema<T = unknown> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: Error };
}

/**
 * Base route definition for billing routes.
 * Used in route maps to define HTTP method, handler, and optional auth requirements.
 *
 * @param method - HTTP method for this route
 * @param schema - Optional validation schema for request body
 * @param handler - Route handler function
 * @param auth - Required authentication level (undefined = public)
 */
export interface BillingBaseRouteDefinition {
  readonly method: BillingHttpMethod;
  readonly schema?: BillingValidationSchema;
  readonly handler: (
    ctx: BillingAppContext,
    body: unknown,
    request: BillingRequest,
  ) => Promise<BillingRouteResult>;
  readonly auth?: 'user' | 'admin';
}

/**
 * Route map type for billing routes.
 * Maps route paths to their definitions.
 */
export type BillingRouteMap = Record<string, BillingBaseRouteDefinition>;

/**
 * Provider-specific billing configuration for handlers.
 * Contains the billing config needed to create provider instances.
 */
export interface BillingHandlerConfig {
  readonly billing: BillingConfig;
}

/**
 * Dependencies for billing handler operations that need a provider.
 *
 * @param repos - Billing repositories
 * @param provider - Billing service provider instance
 */
export interface BillingHandlerDeps {
  readonly repos: BillingRepositories;
  readonly provider: BillingService;
}
