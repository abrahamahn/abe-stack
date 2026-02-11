// src/apps/web/src/features/settings/components/ConsentPreferences.tsx
/**
 * Consent Preferences Component
 *
 * Form section for managing user consent preferences.
 * Displays toggle switches for different consent categories with descriptions.
 */

import { Button, Card, Heading, Switch, Text } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { useConsent, useUpdateConsent } from '../hooks/useConsent';

import type { UpdateConsentInput } from '../hooks/useConsent';

// ============================================================================
// Types
// ============================================================================

interface ConsentCategory {
  key: 'analytics' | 'marketing_email' | 'third_party_sharing' | 'profiling';
  label: string;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  {
    key: 'analytics',
    label: 'Analytics tracking',
    description: 'Help us improve by sharing usage data',
  },
  {
    key: 'marketing_email',
    label: 'Marketing communications',
    description: 'Receive product updates and offers',
  },
  {
    key: 'third_party_sharing',
    label: 'Third-party sharing',
    description: 'Allow sharing data with trusted partners',
  },
  {
    key: 'profiling',
    label: 'Profiling',
    description: 'Enable personalized experience',
  },
] as const;

// ============================================================================
// Component
// ============================================================================

export const ConsentPreferences = (): ReactElement => {
  const { preferences, isLoading, error: fetchError, refetch } = useConsent();
  const { updateConsent, isUpdating, error: updateError } = useUpdateConsent();

  // Local state for form values
  const [formValues, setFormValues] = useState<UpdateConsentInput>({});

  // Compute current values (preferences from server or form state)
  const getCurrentValue = (key: ConsentCategory['key']): boolean => {
    if (formValues[key] !== undefined) {
      return formValues[key] ?? false;
    }
    return preferences?.[key] ?? false;
  };

  const handleToggle = (key: ConsentCategory['key'], value: boolean): void => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (): Promise<void> => {
    try {
      await updateConsent(formValues);
      // Clear form state after successful save
      setFormValues({});
      // Refetch to get the latest state
      await refetch();
    } catch {
      // Error is already stored in the hook
    }
  };

  const hasChanges = Object.keys(formValues).length > 0;
  const error = fetchError ?? updateError;

  if (isLoading) {
    return (
      <Card className="p-4">
        <Text>Loading consent preferences...</Text>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}>
        <div>
          <Heading as="h3" size="md" style={{ marginBottom: 'var(--ui-gap-xs)' }}>
            Consent Preferences
          </Heading>
          <Text tone="muted">Manage your data privacy and communication preferences.</Text>
        </div>

        {error !== null && (
          <div
            style={{
              padding: 'var(--ui-gap-md)',
              backgroundColor: 'var(--ui-alert-danger-bg)',
              border: '1px solid var(--ui-alert-danger-border)',
              borderRadius: 'var(--ui-radius-md)',
            }}
          >
            <Text style={{ color: 'var(--ui-alert-danger-text)' }}>{error.message}</Text>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}>
          {CONSENT_CATEGORIES.map((category) => (
            <div
              key={category.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--ui-gap-md)',
                paddingBottom: 'var(--ui-gap-md)',
                borderBottom: '1px solid var(--ui-color-border)',
              }}
            >
              <div style={{ flex: 1 }}>
                <label htmlFor={`consent-${category.key}`}>
                  <Text
                    style={{
                      display: 'block',
                      fontWeight: 'var(--ui-font-weight-medium)',
                      marginBottom: 'var(--ui-gap-xs)',
                    }}
                  >
                    {category.label}
                  </Text>
                </label>
                <Text tone="muted" size="sm">
                  {category.description}
                </Text>
              </div>
              <Switch
                id={`consent-${category.key}`}
                checked={getCurrentValue(category.key)}
                onChange={(checked) => {
                  handleToggle(category.key, checked);
                }}
                disabled={isUpdating}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: 'var(--ui-gap-md)',
            borderTop: '1px solid var(--ui-color-border)',
          }}
        >
          <Button
            onClick={() => {
              void handleSave();
            }}
            disabled={!hasChanges || isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
