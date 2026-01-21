// apps/server/src/modules/notifications/service.ts
/**
 * Notification Service
 *
 * Business logic for push notification operations including
 * subscription management, sending, and preference handling.
 */

import { randomUUID } from 'crypto';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  ProviderNotConfiguredError,
  SubscriptionExistsError,
  VapidNotConfiguredError,
} from '@abe-stack/core';

import type {
  BatchSendResult,
  NotificationPayload,
  NotificationPreferences,
  NotificationType,
  PushSubscription,
  StoredPushSubscription,
  UpdatePreferencesRequest,
} from '@abe-stack/core';
import type { NotificationService, SendOptions } from '@infrastructure/notifications';

// ============================================================================
// In-Memory Storage (Replace with database in production)
// ============================================================================

// In-memory store for subscriptions (keyed by subscription ID)
const subscriptionStore = new Map<string, StoredPushSubscription>();

// Index by user ID for quick lookup
const userSubscriptionIndex = new Map<string, Set<string>>();

// Index by endpoint for deduplication
const endpointIndex = new Map<string, string>();

// In-memory store for preferences (keyed by user ID)
const preferencesStore = new Map<string, NotificationPreferences>();

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Subscribe a user to push notifications
 *
 * @param userId - User ID
 * @param subscription - Push subscription from browser
 * @param deviceId - Device identifier
 * @param userAgent - User agent string
 * @returns Subscription ID
 */
export function subscribe(
  userId: string,
  subscription: PushSubscription,
  deviceId: string,
  userAgent: string,
): string {
  // Check if endpoint already exists
  const existingId = endpointIndex.get(subscription.endpoint);
  if (existingId) {
    const existing = subscriptionStore.get(existingId);
    if (existing && existing.userId === userId) {
      // Update existing subscription
      existing.lastUsedAt = new Date();
      existing.isActive = true;
      return existingId;
    }
    throw new SubscriptionExistsError('Endpoint already registered to another user');
  }

  // Create new subscription
  const id = randomUUID();
  const storedSubscription: StoredPushSubscription = {
    ...subscription,
    id,
    userId,
    deviceId,
    userAgent,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    isActive: true,
  };

  // Store subscription
  subscriptionStore.set(id, storedSubscription);

  // Update user index
  const userSubs = userSubscriptionIndex.get(userId) ?? new Set();
  userSubs.add(id);
  userSubscriptionIndex.set(userId, userSubs);

  // Update endpoint index
  endpointIndex.set(subscription.endpoint, id);

  return id;
}

/**
 * Unsubscribe from push notifications
 *
 * @param subscriptionId - Subscription ID to remove
 * @param endpoint - Alternative: endpoint URL to remove
 * @returns true if subscription was found and removed
 */
export function unsubscribe(subscriptionId?: string, endpoint?: string): boolean {
  let id = subscriptionId;

  // Look up by endpoint if ID not provided
  if (!id && endpoint) {
    id = endpointIndex.get(endpoint);
  }

  if (!id) {
    return false;
  }

  const subscription = subscriptionStore.get(id);
  if (!subscription) {
    return false;
  }

  // Remove from stores
  subscriptionStore.delete(id);
  endpointIndex.delete(subscription.endpoint);

  // Update user index
  const userSubs = userSubscriptionIndex.get(subscription.userId);
  if (userSubs) {
    userSubs.delete(id);
    if (userSubs.size === 0) {
      userSubscriptionIndex.delete(subscription.userId);
    }
  }

  return true;
}

/**
 * Get all subscriptions for a user
 *
 * @param userId - User ID
 * @returns Array of subscriptions
 */
export function getUserSubscriptions(userId: string): StoredPushSubscription[] {
  const subIds = userSubscriptionIndex.get(userId);
  if (!subIds) {
    return [];
  }

  const subscriptions: StoredPushSubscription[] = [];
  for (const id of subIds) {
    const sub = subscriptionStore.get(id);
    if (sub && sub.isActive) {
      subscriptions.push(sub);
    }
  }

  return subscriptions;
}

/**
 * Get subscription by ID
 *
 * @param subscriptionId - Subscription ID
 * @returns Subscription or undefined
 */
export function getSubscriptionById(subscriptionId: string): StoredPushSubscription | undefined {
  return subscriptionStore.get(subscriptionId);
}

/**
 * Mark subscriptions as inactive (expired)
 *
 * @param subscriptionIds - IDs to mark as inactive
 */
export function markSubscriptionsExpired(subscriptionIds: string[]): void {
  for (const id of subscriptionIds) {
    const sub = subscriptionStore.get(id);
    if (sub) {
      sub.isActive = false;
    }
  }
}

// ============================================================================
// Notification Sending
// ============================================================================

/**
 * Send notification to a user
 *
 * @param notificationService - Notification service instance
 * @param userId - Target user ID
 * @param payload - Notification payload
 * @param options - Send options
 * @returns Batch send result
 */
export async function sendToUser(
  notificationService: NotificationService,
  userId: string,
  payload: NotificationPayload,
  options?: SendOptions,
): Promise<BatchSendResult> {
  const provider = notificationService.getWebPushProvider();
  if (!provider) {
    throw new ProviderNotConfiguredError('web-push');
  }

  const subscriptions = getUserSubscriptions(userId);
  if (subscriptions.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      expiredSubscriptions: [],
    };
  }

  const subscriptionsWithId = subscriptions.map((s) => ({
    id: s.id,
    subscription: {
      endpoint: s.endpoint,
      expirationTime: s.expirationTime,
      keys: s.keys,
    },
  }));

  const result = await provider.sendBatch(subscriptionsWithId, payload, options);

  // Clean up expired subscriptions
  if (result.expiredSubscriptions.length > 0) {
    markSubscriptionsExpired(result.expiredSubscriptions);
  }

  return result;
}

/**
 * Send notification to multiple users
 *
 * @param notificationService - Notification service instance
 * @param userIds - Target user IDs
 * @param payload - Notification payload
 * @param options - Send options
 * @returns Aggregated batch send result
 */
export async function sendToUsers(
  notificationService: NotificationService,
  userIds: string[],
  payload: NotificationPayload,
  options?: SendOptions,
): Promise<BatchSendResult> {
  const provider = notificationService.getWebPushProvider();
  if (!provider) {
    throw new ProviderNotConfiguredError('web-push');
  }

  // Collect all subscriptions
  const allSubscriptions: Array<{ id: string; subscription: PushSubscription }> = [];
  for (const userId of userIds) {
    const subs = getUserSubscriptions(userId);
    for (const s of subs) {
      allSubscriptions.push({
        id: s.id,
        subscription: {
          endpoint: s.endpoint,
          expirationTime: s.expirationTime,
          keys: s.keys,
        },
      });
    }
  }

  if (allSubscriptions.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      expiredSubscriptions: [],
    };
  }

  const result = await provider.sendBatch(allSubscriptions, payload, options);

  // Clean up expired subscriptions
  if (result.expiredSubscriptions.length > 0) {
    markSubscriptionsExpired(result.expiredSubscriptions);
  }

  return result;
}

/**
 * Broadcast notification to all subscribed users
 *
 * @param notificationService - Notification service instance
 * @param payload - Notification payload
 * @param options - Send options
 * @returns Batch send result
 */
export async function broadcast(
  notificationService: NotificationService,
  payload: NotificationPayload,
  options?: SendOptions,
): Promise<BatchSendResult> {
  const provider = notificationService.getWebPushProvider();
  if (!provider) {
    throw new ProviderNotConfiguredError('web-push');
  }

  // Collect all active subscriptions
  const allSubscriptions: Array<{ id: string; subscription: PushSubscription }> = [];
  for (const sub of subscriptionStore.values()) {
    if (sub.isActive) {
      allSubscriptions.push({
        id: sub.id,
        subscription: {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime,
          keys: sub.keys,
        },
      });
    }
  }

  if (allSubscriptions.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      expiredSubscriptions: [],
    };
  }

  const result = await provider.sendBatch(allSubscriptions, payload, options);

  // Clean up expired subscriptions
  if (result.expiredSubscriptions.length > 0) {
    markSubscriptionsExpired(result.expiredSubscriptions);
  }

  return result;
}

// ============================================================================
// Preference Management
// ============================================================================

/**
 * Get user notification preferences
 *
 * @param userId - User ID
 * @returns Notification preferences (creates defaults if not found)
 */
export function getPreferences(userId: string): NotificationPreferences {
  const existing = preferencesStore.get(userId);
  if (existing) {
    return existing;
  }

  // Create default preferences (deep copy to avoid shared reference issues)
  const defaults: NotificationPreferences = {
    userId,
    globalEnabled: DEFAULT_NOTIFICATION_PREFERENCES.globalEnabled,
    quietHours: { ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours },
    types: {
      system: { ...DEFAULT_NOTIFICATION_PREFERENCES.types.system },
      security: { ...DEFAULT_NOTIFICATION_PREFERENCES.types.security },
      marketing: { ...DEFAULT_NOTIFICATION_PREFERENCES.types.marketing },
      social: { ...DEFAULT_NOTIFICATION_PREFERENCES.types.social },
      transactional: { ...DEFAULT_NOTIFICATION_PREFERENCES.types.transactional },
    },
    updatedAt: new Date(),
  };

  preferencesStore.set(userId, defaults);
  return defaults;
}

/**
 * Update user notification preferences
 *
 * @param userId - User ID
 * @param updates - Partial preference updates
 * @returns Updated preferences
 */
export function updatePreferences(
  userId: string,
  updates: UpdatePreferencesRequest,
): NotificationPreferences {
  const current = getPreferences(userId);

  // Apply updates
  if (updates.globalEnabled !== undefined) {
    current.globalEnabled = updates.globalEnabled;
  }

  if (updates.quietHours) {
    if (updates.quietHours.enabled !== undefined) {
      current.quietHours.enabled = updates.quietHours.enabled;
    }
    if (updates.quietHours.startHour !== undefined) {
      current.quietHours.startHour = updates.quietHours.startHour;
    }
    if (updates.quietHours.endHour !== undefined) {
      current.quietHours.endHour = updates.quietHours.endHour;
    }
    if (updates.quietHours.timezone !== undefined) {
      current.quietHours.timezone = updates.quietHours.timezone;
    }
  }

  if (updates.types) {
    for (const [type, typeUpdate] of Object.entries(updates.types)) {
      const notifType = type as NotificationType;
      if (current.types[notifType]) {
        if (typeUpdate?.enabled !== undefined) {
          current.types[notifType].enabled = typeUpdate.enabled;
        }
        if (typeUpdate?.channels !== undefined) {
          current.types[notifType].channels = typeUpdate.channels;
        }
      }
    }
  }

  current.updatedAt = new Date();
  preferencesStore.set(userId, current);

  return current;
}

/**
 * Check if user should receive notification of given type
 *
 * @param userId - User ID
 * @param type - Notification type
 * @returns true if notification should be sent
 */
export function shouldSendNotification(userId: string, type: NotificationType): boolean {
  const prefs = getPreferences(userId);

  // Check global enabled
  if (!prefs.globalEnabled) {
    return false;
  }

  // Check type-specific enabled
  const typePrefs = prefs.types[type];
  if (!typePrefs || !typePrefs.enabled) {
    return false;
  }

  // Check if push channel is enabled for this type
  if (!typePrefs.channels.includes('push')) {
    return false;
  }

  // Check quiet hours
  if (prefs.quietHours.enabled) {
    const now = new Date();
    const hour = now.getHours(); // Note: Should use timezone conversion in production

    const { startHour, endHour } = prefs.quietHours;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startHour > endHour) {
      if (hour >= startHour || hour < endHour) {
        return false;
      }
    } else {
      if (hour >= startHour && hour < endHour) {
        return false;
      }
    }
  }

  return true;
}

// ============================================================================
// VAPID Key Access
// ============================================================================

/**
 * Get VAPID public key for client subscription
 *
 * @param notificationService - Notification service instance
 * @returns VAPID public key
 */
export function getVapidPublicKey(notificationService: NotificationService): string {
  const publicKey = notificationService.getVapidPublicKey();
  if (!publicKey) {
    throw new VapidNotConfiguredError();
  }
  return publicKey;
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Clear all stored data (for testing)
 */
export function clearAllData(): void {
  subscriptionStore.clear();
  userSubscriptionIndex.clear();
  endpointIndex.clear();
  preferencesStore.clear();
}

/**
 * Get subscription count (for testing/monitoring)
 */
export function getSubscriptionCount(): number {
  return subscriptionStore.size;
}

/**
 * Get active subscription count (for testing/monitoring)
 */
export function getActiveSubscriptionCount(): number {
  let count = 0;
  for (const sub of subscriptionStore.values()) {
    if (sub.isActive) {
      count++;
    }
  }
  return count;
}
