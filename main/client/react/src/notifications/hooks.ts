// main/client/react/src/notifications/hooks.ts
/**
 * Push Notification React Hooks
 *
 * Provides convenient hooks for working with push notifications:
 * - usePushSubscription: Manage push subscription state
 * - useNotificationPreferences: Manage notification preferences
 * - usePushPermission: Track push permission status
 * - useTestNotification: Send test notifications
 */

import {
  createNotificationClient,
  getDeviceId,
  getExistingSubscription,
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@bslt/api';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type { NotificationClientConfig } from '@bslt/api';
import type {
  NotificationPreferences,
  PushSubscription as PushSubscriptionType,
  UpdatePreferencesRequest,
} from '@bslt/shared';

/** Polling interval for checking push permission changes (ms) */
const PERMISSION_POLL_INTERVAL_MS = 1000;

// ============================================================================
// Query Keys
// ============================================================================

const notificationQueryKeys = {
  preferences: () => ['notifications', 'preferences'] as const,
};

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
 * Browser subscription state is managed with useState since it's a local browser
 * API, not an HTTP query. Subscribe/unsubscribe use useMutation for the HTTP calls.
 */
export function usePushSubscription(options: UsePushSubscriptionOptions): PushSubscriptionState {
  const { clientConfig, autoCheck = true } = options;

  const client = useMemo(() => createNotificationClient(clientConfig), [clientConfig]);
  const isSupported = useMemo(() => isPushSupported(), []);

  // Browser subscription state (not cacheable via useQuery since it's a browser API)
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionType | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(true);
  const [checkError, setCheckError] = useState<Error | null>(null);

  // Check subscription on mount (browser API, not HTTP)
  const checkSubscription = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setCheckLoading(false);
      return;
    }

    try {
      setCheckLoading(true);
      setCheckError(null);

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
      setCheckError(err instanceof Error ? err : new Error('Failed to check subscription'));
    } finally {
      setCheckLoading(false);
    }
  }, [isSupported]);

  // Auto-check on mount
  useEffect(() => {
    if (autoCheck) {
      void checkSubscription();
    }
  }, [autoCheck, checkSubscription]);

  const subscribeMutation = useMutation<{
    subscriptionData: PushSubscriptionType;
    subscriptionId: string;
  }>({
    mutationFn: async () => {
      if (!isSupported) {
        throw new Error('Push notifications not supported');
      }

      const { publicKey } = await client.getVapidKey();
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

      const response = await client.subscribe({
        subscription: subscriptionData,
        deviceId: getDeviceId(),
        userAgent: navigator.userAgent,
      });

      return { subscriptionData, subscriptionId: response.subscriptionId };
    },
    onSuccess: (result) => {
      setSubscription(result.subscriptionData);
      setSubscriptionId(result.subscriptionId);
      setIsSubscribed(true);
    },
  });

  const unsubscribeMutation = useMutation<undefined>({
    mutationFn: async () => {
      await unsubscribeFromPush();

      if (subscriptionId !== null && subscriptionId !== '') {
        await client.unsubscribe({ subscriptionId });
      } else if (subscription !== null && subscription.endpoint !== '') {
        await client.unsubscribe({ endpoint: subscription.endpoint });
      }
    },
    onSuccess: () => {
      setSubscription(null);
      setSubscriptionId(null);
      setIsSubscribed(false);
    },
  });

  const handleSubscribe = useCallback(async (): Promise<void> => {
    await subscribeMutation.mutateAsync(undefined);
  }, [subscribeMutation.mutateAsync]);

  const handleUnsubscribe = useCallback(async (): Promise<void> => {
    await unsubscribeMutation.mutateAsync(undefined);
  }, [unsubscribeMutation.mutateAsync]);

  return {
    isSupported,
    isLoading: checkLoading || subscribeMutation.isPending || unsubscribeMutation.isPending,
    isSubscribed,
    subscription,
    subscriptionId,
    error: checkError ?? subscribeMutation.error ?? unsubscribeMutation.error ?? null,
    subscribe: handleSubscribe,
    unsubscribe: handleUnsubscribe,
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
 */
export function useNotificationPreferences(
  options: UseNotificationPreferencesOptions,
): NotificationPreferencesState {
  const { clientConfig, autoFetch = true } = options;

  const client = useMemo(() => createNotificationClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: notificationQueryKeys.preferences(),
    queryFn: () => client.getPreferences(),
    enabled: autoFetch,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: UpdatePreferencesRequest) => client.updatePreferences(updates),
    invalidateOnSuccess: [notificationQueryKeys.preferences()],
  });

  const handleUpdate = useCallback(
    async (updates: UpdatePreferencesRequest): Promise<void> => {
      await updateMutation.mutateAsync(updates);
    },
    [updateMutation.mutateAsync],
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    await query.refetch();
  }, [query.refetch]);

  return {
    isLoading: query.isLoading,
    isSaving: updateMutation.isPending,
    preferences: query.data?.preferences ?? null,
    error: query.error ?? updateMutation.error ?? null,
    updatePreferences: handleUpdate,
    refresh: handleRefresh,
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
 * Browser-only hook, no HTTP calls. Uses useState for browser permission state.
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
    }, PERMISSION_POLL_INTERVAL_MS);

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
 */
export function useTestNotification(clientConfig: NotificationClientConfig): TestNotificationState {
  const client = useMemo(() => createNotificationClient(clientConfig), [clientConfig]);

  const mutation = useMutation({
    mutationFn: () => client.testNotification(),
  });

  const lastResult = mutation.isSuccess
    ? {
        success: (mutation.data?.result.successful ?? 0) > 0,
        message:
          (mutation.data?.result.successful ?? 0) > 0
            ? 'Test notification sent!'
            : 'No active subscriptions found',
      }
    : mutation.isError
      ? { success: false, message: 'Failed to send test notification' }
      : null;

  const handleSendTest = useCallback(async (): Promise<void> => {
    await mutation.mutateAsync(undefined);
  }, [mutation.mutateAsync]);

  return {
    isSending: mutation.isPending,
    lastResult,
    error: mutation.error ?? null,
    sendTest: handleSendTest,
  };
}
