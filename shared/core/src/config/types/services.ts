// shared/core/src/config/types/services.ts
/**
 * Service Configuration Contracts
 *
 * These types define external service integrations:
 * billing, email, push notifications, and search.
 */

// ============================================================================
// Billing Configuration
// ============================================================================

/** Supported payment providers */
export type BillingProvider = 'stripe' | 'paypal';

/**
 * Stripe provider configuration.
 * Required when billing.provider is 'stripe'.
 */
export interface StripeProviderConfig {
  /** Stripe secret key (sk_live_* or sk_test_*) */
  secretKey: string;
  /** Stripe publishable key (pk_live_* or pk_test_*) */
  publishableKey: string;
  /** Webhook signing secret */
  webhookSecret: string;
}

/**
 * PayPal provider configuration.
 * Required when billing.provider is 'paypal'.
 */
export interface PayPalProviderConfig {
  /** PayPal client ID */
  clientId: string;
  /** PayPal client secret */
  clientSecret: string;
  /** Webhook ID for signature verification */
  webhookId: string;
  /** Use sandbox environment */
  sandbox: boolean;
}

/**
 * Billing plan price ID mapping.
 * Maps plan tiers to provider-specific price IDs.
 */
export interface BillingPlansConfig {
  /** Free tier price ID (optional - may not require payment) */
  free?: string;
  /** Pro tier price ID */
  pro?: string;
  /** Enterprise tier price ID */
  enterprise?: string;
}

/**
 * Billing URL configuration.
 * Redirect URLs for checkout and portal flows.
 */
export interface BillingUrlsConfig {
  /** Return URL after managing billing portal */
  portalReturnUrl: string;
  /** Redirect after successful checkout */
  checkoutSuccessUrl: string;
  /** Redirect after cancelled checkout */
  checkoutCancelUrl: string;
}

/**
 * Billing and subscription configuration.
 * Supports Stripe and PayPal with plan-based pricing.
 */
export interface BillingConfig {
  /** Enable billing features */
  enabled: boolean;
  /** Active payment provider */
  provider: BillingProvider;
  /** Default currency code (ISO 4217) */
  currency: string;
  /** Stripe-specific settings */
  stripe: StripeProviderConfig;
  /** PayPal-specific settings */
  paypal: PayPalProviderConfig;
  /** Price IDs for each plan tier */
  plans: BillingPlansConfig;
  /** Redirect URLs for checkout flow */
  urls: BillingUrlsConfig;
}

// ============================================================================
// Email Configuration
// ============================================================================

/**
 * SMTP connection settings.
 * Compatible with most email providers (Gmail, SendGrid, Mailgun, etc.)
 */
export interface SmtpConfig {
  /** SMTP server hostname */
  host: string;
  /** SMTP server port (587 for STARTTLS, 465 for implicit TLS) */
  port: number;
  /** Use implicit TLS (port 465) */
  secure: boolean;
  /** SMTP authentication credentials */
  auth?: {
    user: string;
    pass: string;
  };
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Socket timeout in milliseconds */
  socketTimeout: number;
}

/**
 * Email service configuration.
 * Supports console logging (dev) or SMTP (production).
 */
export interface EmailConfig {
  /** Email provider: 'console' logs to terminal, 'smtp' sends real emails */
  provider: 'console' | 'smtp';
  /** SMTP settings (required when provider is 'smtp') */
  smtp: SmtpConfig;
  /** API key for transactional email services (SendGrid, Postmark, etc.) */
  apiKey?: string;
  /** Sender information */
  from: {
    /** Sender display name */
    name: string;
    /** Sender email address */
    address: string;
  };
  /** Reply-to email address */
  replyTo: string;
}

// ============================================================================
// Push Notifications Configuration
// ============================================================================

/**
 * OneSignal push notification configuration.
 * Used for mobile and web push notifications.
 */
export interface OneSignalConfig {
  /** OneSignal REST API key */
  restApiKey: string;
  /** OneSignal user authentication key */
  userAuthKey: string;
  /** OneSignal app ID */
  appId: string;
  /** Optional: Additional settings */
  settings?: {
    /** Whether to enable logging */
    enableLogging?: boolean;
  };
}

/**
 * Courier push notification configuration.
 * Used for multi-channel notifications via Courier platform.
 */
export interface CourierConfig {
  /** Courier API key */
  apiKey: string;
  /** Courier API URL */
  apiUrl?: string;
  /** Optional: Additional settings */
  settings?: {
    /** Whether to enable logging */
    enableLogging?: boolean;
  };
}

/**
 * Knock push notification configuration.
 * Used for multi-channel notifications via Knock platform.
 */
export interface KnockConfig {
  /** Knock secret key */
  secretKey: string;
  /** Knock API URL */
  apiUrl?: string;
  /** Optional: Additional settings */
  settings?: {
    /** Whether to enable logging */
    enableLogging?: boolean;
  };
}

/**
 * Firebase Cloud Messaging (FCM) configuration.
 * Used for mobile and web push notifications.
 */
export interface FcmConfig {
  /** Service account credentials JSON (stringified) */
  credentials: string;
  /** Firebase project ID */
  projectId: string;
}

/**
 * Amazon SNS configuration.
 * Used for high-volume push notifications.
 */
export interface SnsConfig {
  /** AWS Access Key ID */
  accessKeyId: string;
  /** AWS Secret Access Key */
  secretAccessKey: string;
  /** AWS Region */
  region: string;
  /** SNS Topic ARN (optional) */
  topicArn?: string;
}

/**
 * Braze configuration.
 * Used for marketing and engagement notifications.
 */
export interface BrazeConfig {
  /** Braze API key */
  apiKey: string;
  /** Braze API URL */
  apiUrl: string;
  /** Optional: Additional settings */
  settings?: {
    /** Whether to enable logging */
    enableLogging?: boolean;
  };
}

/**
 * Generic push notification configuration.
 * Used for custom notification implementations.
 */
export interface GenericNotificationConfig {
  /** Provider-specific configuration */
  [key: string]: unknown;
}

/**
 * Push notification provider type.
 */
export type NotificationProvider =
  | 'onesignal'
  | 'courier'
  | 'knock'
  | 'fcm'
  | 'sns'
  | 'braze'
  | 'generic';

/**
 * Union type for all possible notification configurations.
 */
export type NotificationProviderConfig =
  | { provider: 'onesignal'; config: OneSignalConfig }
  | { provider: 'courier'; config: CourierConfig }
  | { provider: 'knock'; config: KnockConfig }
  | { provider: 'fcm'; config: FcmConfig }
  | { provider: 'sns'; config: SnsConfig }
  | { provider: 'braze'; config: BrazeConfig }
  | { provider: 'generic'; config: GenericNotificationConfig };

/**
 * Push notifications configuration.
 * Supports multiple providers for flexibility.
 */
export interface NotificationConfig {
  /** Enable push notifications */
  enabled: boolean;
  /** Active push notification provider */
  provider: NotificationProvider;
  /** Provider-specific configuration */
  config:
    | OneSignalConfig
    | CourierConfig
    | KnockConfig
    | FcmConfig
    | SnsConfig
    | BrazeConfig
    | GenericNotificationConfig;
}

// ============================================================================
// Search Configuration
// ============================================================================

/**
 * Elasticsearch provider configuration.
 * For full-text search at scale.
 */
export interface ElasticsearchProviderConfig {
  /** Elasticsearch node URL */
  node: string;
  /** Index name for search operations */
  index: string;
  /** Basic auth credentials */
  auth?: {
    username: string;
    password: string;
  };
  /** API key authentication (alternative to basic auth) */
  apiKey?: string;
  /** Enable TLS/SSL */
  tls?: boolean;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
}

/**
 * SQL-based search provider configuration.
 * Uses database LIKE/ILIKE queries (simpler, no external deps).
 */
export interface SqlSearchProviderConfig {
  /** Default results per page */
  defaultPageSize: number;
  /** Maximum allowed page size */
  maxPageSize: number;
  /** Maximum nested query depth (prevent DoS) */
  maxQueryDepth?: number;
  /** Maximum number of conditions per query */
  maxConditions?: number;
  /** Enable query logging for debugging */
  logging?: boolean;
  /** Query timeout in milliseconds */
  timeout?: number;
}

/**
 * Column mapping for SQL queries.
 */
export interface SqlColumnMapping {
  /** Source field name (from query) */
  field: string;
  /** Target column name (in database) */
  column: string;
  /** Column type for proper escaping */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  /** Is this column sortable? */
  sortable?: boolean;
  /** Is this column filterable? */
  filterable?: boolean;
  /** Custom SQL expression for the column */
  expression?: string;
}

/**
 * Table configuration for SQL search.
 */
export interface SqlTableConfig {
  /** Table name */
  table: string;
  /** Primary key column(s) */
  primaryKey: string | string[];
  /** Column mappings */
  columns: SqlColumnMapping[];
  /** Columns to include in text search */
  searchColumns?: string[];
  /** Default sort configuration */
  defaultSort?: { column: string; order: 'asc' | 'desc' };
}
