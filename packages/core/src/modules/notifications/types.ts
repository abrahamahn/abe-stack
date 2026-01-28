// packages/core/src/modules/notifications/types.ts
/**
 * Push Notification Types
 *
 * Core types for the push notification system including notification channels,
 * types, preferences, and subscription management.
 */

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Types of notifications that can be sent
 */
export type NotificationType =
  | 'system' // System-wide announcements
  | 'security' // Security alerts (login, password change, etc.)
  | 'marketing' // Marketing and promotional content
  | 'social' // Social interactions (mentions, follows, etc.)
  | 'transactional'; // Transaction-related (orders, payments, etc.)

/**
 * Available notification delivery channels
 */
export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Push Subscription Types
// ============================================================================

/**
 * Web Push subscription keys (ECDH P-256)
 */
export interface PushSubscriptionKeys {
  /** Public key for encrypting push messages (base64url encoded) */
  p256dh: string;
  /** Authentication secret for push messages (base64url encoded) */
  auth: string;
}

/**
 * Web Push subscription data from the browser
 */
export interface PushSubscription {
  /** Unique endpoint URL for sending push messages */
  endpoint: string;
  /** Subscription expiration time (null if no expiration) */
  expirationTime: number | null;
  /** Encryption keys */
  keys: PushSubscriptionKeys;
}

/**
 * Stored push subscription with metadata
 */
export interface StoredPushSubscription extends PushSubscription {
  /** Unique subscription ID */
  id: string;
  /** User who owns this subscription */
  userId: string;
  /** Device/browser identifier for this subscription */
  deviceId: string;
  /** User agent string for device identification */
  userAgent: string;
  /** When the subscription was created */
  createdAt: Date;
  /** When the subscription was last used */
  lastUsedAt: Date;
  /** Whether the subscription is still active */
  isActive: boolean;
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * User preferences for a specific notification type
 */
export interface NotificationTypePreference {
  /** Whether this notification type is enabled */
  enabled: boolean;
  /** Which channels are enabled for this type */
  channels: NotificationChannel[];
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  /** User ID */
  userId: string;
  /** Global notification enabled flag */
  globalEnabled: boolean;
  /** Quiet hours configuration */
  quietHours: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number; // 0-23
    timezone: string; // IANA timezone
  };
  /** Per-type preferences */
  types: Record<NotificationType, NotificationTypePreference>;
  /** When preferences were last updated */
  updatedAt: Date;
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  globalEnabled: true,
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: 'UTC',
  },
  types: {
    system: { enabled: true, channels: ['push', 'email', 'in_app'] },
    security: { enabled: true, channels: ['push', 'email', 'in_app'] },
    marketing: { enabled: false, channels: ['email'] },
    social: { enabled: true, channels: ['push', 'in_app'] },
    transactional: { enabled: true, channels: ['push', 'email', 'in_app'] },
  },
  updatedAt: new Date(),
};

// ============================================================================
// Notification Payload Types
// ============================================================================

/**
 * Push notification action button
 */
export interface NotificationAction {
  /** Unique action identifier */
  action: string;
  /** Button text */
  title: string;
  /** Optional icon URL */
  icon?: string | undefined;
}

/**
 * Push notification payload
 */
export interface NotificationPayload {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Icon URL */
  icon?: string;
  /** Badge URL (for app badge) */
  badge?: string;
  /** Image URL for rich notifications */
  image?: string;
  /** Notification tag for grouping */
  tag?: string;
  /** Custom data payload */
  data?: Record<string, unknown>;
  /** Action buttons */
  actions?: NotificationAction[];
  /** Whether to require interaction to dismiss */
  requireInteraction?: boolean;
  /** Whether to renotify if using same tag */
  renotify?: boolean;
  /** Whether notification should be silent */
  silent?: boolean;
  /** Vibration pattern */
  vibrate?: number[];
  /** Notification timestamp */
  timestamp?: number;
  /** URL to open when notification is clicked */
  url?: string;
}

/**
 * Full notification message for sending
 */
export interface NotificationMessage {
  /** Unique message ID */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** Priority level */
  priority: NotificationPriority;
  /** Payload for push notification */
  payload: NotificationPayload;
  /** Target user IDs (empty for broadcast) */
  userIds: string[];
  /** Optional topic for pub/sub */
  topic?: string;
  /** Time-to-live in seconds */
  ttl?: number;
  /** When the message was created */
  createdAt: Date;
}

// ============================================================================
// Send Result Types
// ============================================================================

/**
 * Result of sending a single notification
 */
export interface SendResult {
  /** Whether the send was successful */
  success: boolean;
  /** Subscription ID */
  subscriptionId: string;
  /** Error message if failed */
  error?: string;
  /** HTTP status code from push service */
  statusCode?: number;
}

/**
 * Aggregated result of sending notifications to multiple subscriptions
 */
export interface BatchSendResult {
  /** Total number of notifications attempted */
  total: number;
  /** Number of successful sends */
  successful: number;
  /** Number of failed sends */
  failed: number;
  /** Individual results */
  results: SendResult[];
  /** Subscriptions that should be removed (expired/invalid) */
  expiredSubscriptions: string[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to subscribe to push notifications
 */
export interface SubscribeRequest {
  /** Push subscription from browser */
  subscription: PushSubscription;
  /** Device identifier */
  deviceId: string;
  /** User agent string */
  userAgent: string;
}

/**
 * Response after subscribing
 */
export interface SubscribeResponse {
  /** Subscription ID */
  subscriptionId: string;
  /** Success message */
  message: string;
}

/**
 * Request to unsubscribe from push notifications
 */
export interface UnsubscribeRequest {
  /** Subscription ID or endpoint to unsubscribe */
  subscriptionId?: string | undefined;
  /** Endpoint URL (alternative to subscriptionId) */
  endpoint?: string | undefined;
}

/**
 * Response after unsubscribing
 */
export interface UnsubscribeResponse {
  /** Whether unsubscribe was successful */
  success: boolean;
  /** Message */
  message: string;
}

/**
 * Request to update notification preferences
 */
export interface UpdatePreferencesRequest {
  /** Global enabled flag */
  globalEnabled?: boolean;
  /** Quiet hours settings */
  quietHours?: {
    enabled?: boolean;
    startHour?: number;
    endHour?: number;
    timezone?: string;
  };
  /** Per-type preferences */
  types?: Partial<Record<NotificationType, Partial<NotificationTypePreference>>>;
}

/**
 * Response with current preferences
 */
export interface PreferencesResponse {
  /** Current notification preferences */
  preferences: NotificationPreferences;
}

/**
 * Request to send a notification (admin only)
 */
export interface SendNotificationRequest {
  /** Notification type */
  type: NotificationType;
  /** Priority level */
  priority?: NotificationPriority;
  /** Notification payload */
  payload: NotificationPayload;
  /** Target user IDs (empty for broadcast) */
  userIds?: string[];
  /** Topic for pub/sub targeting */
  topic?: string;
  /** Time-to-live in seconds */
  ttl?: number;
}

/**
 * Response after sending notification
 */
export interface SendNotificationResponse {
  /** Message ID */
  messageId: string;
  /** Send results */
  result: BatchSendResult;
}

/**
 * VAPID public key response
 */
export interface VapidKeyResponse {
  /** Public VAPID key for client subscription */
  publicKey: string;
}
