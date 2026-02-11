// src/apps/web/src/features/settings/components/NotificationPreferencesForm.tsx
/**
 * NotificationPreferencesForm
 *
 * Component for managing notification preferences including
 * global enable/disable, per-type toggles, and quiet hours.
 */

import { useNotificationPreferences } from '@abe-stack/api';
import { Alert, Checkbox, EmptyState, Heading, Input, Skeleton, Switch, Text } from '@abe-stack/ui';
import { useMemo, useState } from 'react';

import type { NotificationClientConfig } from '@abe-stack/api';
import type { NotificationPreferences, NotificationType } from '@abe-stack/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferencesFormProps {
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const NOTIFICATION_TYPES: { key: NotificationType; label: string; description: string }[] = [
  { key: 'system', label: 'System', description: 'System updates and maintenance notices' },
  { key: 'security', label: 'Security', description: 'Login alerts and security warnings' },
  { key: 'transactional', label: 'Transactional', description: 'Order confirmations and receipts' },
  { key: 'social', label: 'Social', description: 'Mentions, comments, and invitations' },
  { key: 'marketing', label: 'Marketing', description: 'Product updates and promotions' },
];

const CHANNELS = ['push', 'email', 'in_app'] as const;

const CHANNEL_LABELS: Record<string, string> = {
  push: 'Push',
  email: 'Email',
  in_app: 'In-App',
  sms: 'SMS',
};

// ============================================================================
// Component
// ============================================================================

export function NotificationPreferencesForm({
  className,
}: NotificationPreferencesFormProps): ReactElement {
  const apiBaseUrl =
    typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

  const clientConfig: NotificationClientConfig = useMemo(
    () => ({
      baseUrl: apiBaseUrl,
      getToken: (): string | null => localStorage.getItem('accessToken'),
    }),
    [apiBaseUrl],
  );

  const { preferences, isLoading, isSaving, error, updatePreferences } = useNotificationPreferences(
    { clientConfig },
  );

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleGlobalToggle = (checked: boolean): void => {
    setSaveError(null);
    updatePreferences({ globalEnabled: checked }).catch((err: unknown) => {
      setSaveError(err instanceof Error ? err.message : 'Failed to update');
    });
  };

  const handleTypeToggle = (type: NotificationType, enabled: boolean): void => {
    setSaveError(null);
    updatePreferences({
      types: { [type]: { enabled } },
    }).catch((err: unknown) => {
      setSaveError(err instanceof Error ? err.message : 'Failed to update');
    });
  };

  const handleChannelToggle = (
    type: NotificationType,
    channel: string,
    prefs: NotificationPreferences,
  ): void => {
    setSaveError(null);
    const currentChannels = prefs.types[type].channels;
    const newChannels = currentChannels.includes(channel as 'push' | 'email' | 'sms' | 'in_app')
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel as 'push' | 'email' | 'sms' | 'in_app'];

    updatePreferences({
      types: { [type]: { channels: newChannels } },
    }).catch((err: unknown) => {
      setSaveError(err instanceof Error ? err.message : 'Failed to update');
    });
  };

  const handleQuietHoursToggle = (enabled: boolean): void => {
    setSaveError(null);
    updatePreferences({
      quietHours: { enabled },
    }).catch((err: unknown) => {
      setSaveError(err instanceof Error ? err.message : 'Failed to update');
    });
  };

  const handleQuietHoursChange = (field: 'startHour' | 'endHour', value: string): void => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0 || num > 23) return;
    setSaveError(null);
    updatePreferences({
      quietHours: { [field]: num },
    }).catch((err: unknown) => {
      setSaveError(err instanceof Error ? err.message : 'Failed to update');
    });
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex flex-col gap-4">
          <Skeleton width="10rem" height="1.25rem" />
          <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
        </div>
      </div>
    );
  }

  if (error !== null && preferences === null) {
    return (
      <div className={className}>
        <Alert tone="danger">{error.message}</Alert>
      </div>
    );
  }

  if (preferences === null) {
    return (
      <div className={className}>
        <EmptyState title="No preferences found" description="Notification preferences will appear once configured" />
      </div>
    );
  }

  return (
    <div className={className}>
      {(saveError !== null || error !== null) && (
        <Alert tone="danger" className="mb-4">
          {saveError ?? (error !== null ? error.message : 'An error occurred')}
        </Alert>
      )}

      {/* Global Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Text className="font-medium">Notifications</Text>
          <Text size="sm" tone="muted">
            Enable or disable all notifications globally.
          </Text>
        </div>
        <Switch
          checked={preferences.globalEnabled}
          onChange={handleGlobalToggle}
          disabled={isSaving}
        />
      </div>

      {/* Notification Types */}
      {preferences.globalEnabled && (
        <>
          <div className="border-t pt-4 mb-4">
            <Heading as="h4" size="sm" className="mb-3">
              Notification Types
            </Heading>
            <div className="space-y-4">
              {NOTIFICATION_TYPES.map(({ key, label, description }) => {
                const typePref = preferences.types[key];
                const isEnabled = typePref.enabled;
                const channels = typePref.channels;

                return (
                  <div key={key} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Text size="sm" className="font-medium">
                          {label}
                        </Text>
                        <Text size="sm" tone="muted">
                          {description}
                        </Text>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onChange={(checked: boolean) => {
                          handleTypeToggle(key, checked);
                        }}
                        disabled={isSaving}
                      />
                    </div>
                    {isEnabled && (
                      <div className="flex gap-4 mt-2 pl-1">
                        {CHANNELS.map((channel) => (
                          <Checkbox
                            key={channel}
                            checked={channels.includes(channel)}
                            onChange={() => {
                              handleChannelToggle(key, channel, preferences);
                            }}
                            disabled={isSaving}
                            label={CHANNEL_LABELS[channel] ?? channel}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Heading as="h4" size="sm">
                  Quiet Hours
                </Heading>
                <Text size="sm" tone="muted">
                  Pause notifications during specific hours.
                </Text>
              </div>
              <Switch
                checked={preferences.quietHours.enabled}
                onChange={handleQuietHoursToggle}
                disabled={isSaving}
              />
            </div>
            {preferences.quietHours.enabled && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Text as="label" size="sm" tone="muted">
                    From (hour)
                  </Text>
                  <Input
                    value={String(preferences.quietHours.startHour)}
                    onChange={(e: { target: { value: string } }) => {
                      handleQuietHoursChange('startHour', e.target.value);
                    }}
                    className="w-20"
                    disabled={isSaving}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Text as="label" size="sm" tone="muted">
                    To (hour)
                  </Text>
                  <Input
                    value={String(preferences.quietHours.endHour)}
                    onChange={(e: { target: { value: string } }) => {
                      handleQuietHoursChange('endHour', e.target.value);
                    }}
                    className="w-20"
                    disabled={isSaving}
                  />
                </div>
                <Text size="sm" tone="muted" className="self-end pb-2">
                  ({preferences.quietHours.timezone})
                </Text>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
