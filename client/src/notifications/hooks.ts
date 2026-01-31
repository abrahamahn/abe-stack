// client/src/notifications/hooks.ts
/**
 * Push Notification React Hooks
 *
 * Provides convenient hooks for working with push notifications:
 * - usePushSubscription: Manage push subscription state
 * - useNotificationPreferences: Manage notification preferences
 * - usePushPermission: Track push permission status
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createNotificationClient,
  getDeviceId,
  getExistingSubscription,
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from './client';

import type { NotificationClientConfig } from './client';
import type {
  NotificationPreferences,
  PushSubscription as PushSubscriptionType,
  UpdatePreferencesRequest,
} from '@abe-stack/core';

// ============================================================================
// usePushSubscription
// ============================================================================

/**
 * Push subscription state
 */
export interface PushSubscriptionState {
  /** Whether the browser supports push notifications */
  isSupported: boolean;
  /** Whether currently loading subscription state */
  isLoading: boolean;
  /** Whether user is subscribed to push */
  isSubscribed: boolean;
  /** Current subscription data (if subscribed) */
  subscription: PushSubscriptionType | null;
  /** Server-side subscription ID */
  subscriptionId: string | null;
  /** Error if subscription operation failed */
  error: Error | null;
  /** Subscribe to push notifications */
  subscribe: () => Promise<void>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<void>;
  /** Refresh subscription state from server */
  refresh: () => Promise<void>;
}

/**
 * Options for usePushSubscription hook
 */
export interface UsePushSubscriptionOptions {
  /** API client configuration */
  clientConfig: NotificationClientConfig;
  /** Auto-check subscription status on mount */
  autoCheck?: boolean;
}

/**
 * Hook to manage push notification subscription
 *
 * @param options - Hook options
 * @returns Push subscription state and controls
 *
 * @example
 * ```tsx
 * function NotificationSettings() {
 *   const {
 *     isSupported,
 *     isSubscribed,
 *     isLoading,
 *     subscribe,
 *     unsubscribe,
 *     error,
 *   } = usePushSubscription({
 *     clientConfig: { baseUrl: '/api', getToken: () => token },
 *   });
 *
 *   if (!isSupported) {
 *     return <p>Push notifications not supported</p>;
 *   }
 *
 *   return (
 *     <div>
 *       <button
 *         onClick={isSubscribed ? unsubscribe : subscribe}
 *         disabled={isLoading}
 *       >
 *         {isSubscribed ? 'Disable' : 'Enable'} Push Notifications
 *       </button>
 *       {error && <p className="error">{error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePushSubscription(options: UsePushSubscriptionOptions): PushSubscriptionState {
  const { clientConfig, autoCheck = true } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionType | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const isSupported = useMemo(() => isPushSupported(), []);
  const client = useMemo(() => createNotificationClient(clientConfig), [clientConfig]);

  /**
   * Check current subscription status
   */
  const checkSubscription = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const existing = await getExistingSubscription();
      if (existing !== null) {
        const json = existing.toJSON();
        setSubscription({
          endpoint: json.endpoint ?? '',
          expirationTime: json.expirationTime ?? null,
          keys: {
            p256dh: json.keys?.['p256dh'] ?? '',
            auth: json.keys?.['auth'] ?? '',
          },
        });
        setIsSubscribed(true);
      } else {
        setSubscription(null);
        setIsSubscribed(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check subscription'));
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError(new Error('Push notifications not supported'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get VAPID key from server
      const { publicKey } = await client.getVapidKey();

      // Subscribe in browser
      const browserSub = await subscribeToPush(publicKey);
      const json = browserSub.toJSON();

      const subscriptionData: PushSubscriptionType = {
        endpoint: json.endpoint ?? '',
        expirationTime: json.expirationTime ?? null,
        keys: {
          p256dh: json.keys?.['p256dh'] ?? '',
          auth: json.keys?.['auth'] ?? '',
        },
      };

      // Register with server
      const response = await client.subscribe({
        subscription: subscriptionData,
        deviceId: getDeviceId(),
        userAgent: navigator.userAgent,
      });

      setSubscription(subscriptionData);
      setSubscriptionId(response.subscriptionId);
      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to subscribe'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, client]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Unsubscribe from browser
      await unsubscribeFromPush();

      // Unsubscribe from server
      if (subscriptionId !== null && subscriptionId !== '') {
        await client.unsubscribe({ subscriptionId });
      } else if (subscription !== null && subscription.endpoint !== '') {
        await client.unsubscribe({ endpoint: subscription.endpoint });
      }

      setSubscription(null);
      setSubscriptionId(null);
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to unsubscribe'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, subscriptionId, subscription?.endpoint]);

  // Auto-check on mount
  useEffect(() => {
    if (autoCheck) {
      void checkSubscription();
    }
  }, [autoCheck, checkSubscription]);

  return {
    isSupported,
    isLoading,
    isSubscribed,
    subscription,
    subscriptionId,
    error,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
  };
}

// ============================================================================
// useNotificationPreferences
// ============================================================================

/**
 * Notification preferences state
 */
export interface NotificationPreferencesState {
  /** Whether currently loading preferences */
  isLoading: boolean;
  /** Whether saving preferences */
  isSaving: boolean;
  /** Current preferences */
  preferences: NotificationPreferences | null;
  /** Error if operation failed */
  error: Error | null;
  /** Update preferences */
  updatePreferences: (updates: UpdatePreferencesRequest) => Promise<void>;
  /** Refresh preferences from server */
  refresh: () => Promise<void>;
}

/**
 * Options for useNotificationPreferences hook
 */
export interface UseNotificationPreferencesOptions {
  /** API client configuration */
  clientConfig: NotificationClientConfig;
  /** Auto-fetch preferences on mount */
  autoFetch?: boolean;
}

/**
 * Hook to manage notification preferences
 *
 * @param options - Hook options
 * @returns Preferences state and controls
 *
 * @example
 * ```tsx
 * function PreferencesForm() {
 *   const {
 *     preferences,
 *     isLoading,
 *     isSaving,
 *     updatePreferences,
 *     error,
 *   } = useNotificationPreferences({
 *     clientConfig: { baseUrl: '/api', getToken: () => token },
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <form>
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={preferences?.globalEnabled ?? false}
 *           onChange={(e) => updatePreferences({
 *             globalEnabled: e.target.checked,
 *           })}
 *           disabled={isSaving}
 *         />
 *         Enable Notifications
 *       </label>
 *       {error && <p className="error">{error.message}</p>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useNotificationPreferences(
  options: UseNotificationPreferencesOptions,
): NotificationPreferencesState {
  const { clientConfig, autoFetch = true } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createNotificationClient(clientConfig), [clientConfig]);

  /**
   * Fetch preferences from server
   */
  const fetchPreferences = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await client.getPreferences();
      setPreferences(response.preferences);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch preferences'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Update preferences
   */
  const updatePreferences = useCallback(
    async (updates: UpdatePreferencesRequest): Promise<void> => {
      try {
        setIsSaving(true);
        setError(null);

        const response = await client.updatePreferences(updates);
        setPreferences(response.preferences);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update preferences'));
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [client],
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      void fetchPreferences();
    }
  }, [autoFetch, fetchPreferences]);

  return {
    isLoading,
    isSaving,
    preferences,
    error,
    updatePreferences,
    refresh: fetchPreferences,
  };
}

// ============================================================================
// usePushPermission
// ============================================================================

/**
 * Push permission state
 */
export interface PushPermissionState {
  /** Whether push is supported */
  isSupported: boolean;
  /** Current permission status */
  permission: NotificationPermission;
  /** Whether permission is granted */
  isGranted: boolean;
  /** Whether permission is denied */
  isDenied: boolean;
  /** Request permission from user */
  requestPermission: () => Promise<NotificationPermission>;
}

/**
 * Hook to track push notification permission status
 *
 * @returns Permission state and request function
 *
 * @example
 * ```tsx
 * function PermissionBanner() {
 *   const { isSupported, isGranted, isDenied, requestPermission } = usePushPermission();
 *
 *   if (!isSupported || isGranted) return null;
 *
 *   if (isDenied) {
 *     return <p>Notifications blocked. Enable in browser settings.</p>;
 *   }
 *
 *   return (
 *     <button onClick={requestPermission}>
 *       Enable notifications
 *     </button>
 *   );
 * }
 * ```
 */
export function usePushPermission(): PushPermissionState {
  const [permission, setPermission] = useState<NotificationPermission>(() => getPushPermission());

  const isSupported = useMemo(() => isPushSupported(), []);

  const request = useCallback(async (): Promise<NotificationPermission> => {
    const result = await requestPushPermission();
    setPermission(result);
    return result;
  }, []);

  // Listen for permission changes
  useEffect(() => {
    if (!isSupported) return;

    // Check permission periodically (no native event for permission changes)
    const interval = setInterval(() => {
      const current = getPushPermission();
      if (current !== permission) {
        setPermission(current);
      }
    }, 1000);

    return (): void => {
      clearInterval(interval);
    };
  }, [isSupported, permission]);

  return {
    isSupported,
    permission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission: request,
  };
}

// ============================================================================
// useTestNotification
// ============================================================================

/**
 * Test notification state
 */
export interface TestNotificationState {
  /** Whether sending test notification */
  isSending: boolean;
  /** Last send result */
  lastResult: { success: boolean; message: string } | null;
  /** Error if failed */
  error: Error | null;
  /** Send test notification */
  sendTest: () => Promise<void>;
}

/**
 * Hook to send test notifications
 *
 * @param clientConfig - API client configuration
 * @returns Test notification state and send function
 *
 * @example
 * ```tsx
 * function TestButton() {
 *   const { isSending, lastResult, sendTest } = useTestNotification({
 *     baseUrl: '/api',
 *     getToken: () => token,
 *   });
 *
 *   return (
 *     <button onClick={sendTest} disabled={isSending}>
 *       {isSending ? 'Sending...' : 'Send Test'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTestNotification(clientConfig: NotificationClientConfig): TestNotificationState {
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createNotificationClient(clientConfig), [clientConfig]);

  const sendTest = useCallback(async (): Promise<void> => {
    try {
      setIsSending(true);
      setError(null);
      setLastResult(null);

      const response = await client.testNotification();
      setLastResult({
        success: response.result.successful > 0,
        message:
          response.result.successful > 0
            ? 'Test notification sent!'
            : 'No active subscriptions found',
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to send test'));
      setLastResult({ success: false, message: 'Failed to send test notification' });
    } finally {
      setIsSending(false);
    }
  }, [client]);

  return {
    isSending,
    lastResult,
    error,
    sendTest,
  };
}
