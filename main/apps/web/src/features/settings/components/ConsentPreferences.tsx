// main/apps/web/src/features/settings/components/ConsentPreferences.tsx
/**
 * Consent Preferences Component
 *
 * Form section for managing user consent preferences.
 * Displays toggle switches for different consent categories with descriptions.
 */

import { Alert, Button, Card, Heading, Switch, Text } from '@bslt/ui';
import { CardAsyncState } from '@bslt/ui/components/CardAsyncState';
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

  const [formValues, setFormValues] = useState<UpdateConsentInput>({});

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
      setFormValues({});
      await refetch();
    } catch {
      // Error is already stored in the hook
    }
  };

  const hasChanges = Object.keys(formValues).length > 0;
  const error = fetchError ?? updateError;

  if (isLoading) {
    return (
      <CardAsyncState
        isLoading={true}
        cardClassName="p-4"
        loadingContent={<Text>Loading consent preferences...</Text>}
      />
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-6">
        <div>
          <Heading as="h4" size="sm" className="mb-1">
            Consent Preferences
          </Heading>
          <Text tone="muted" size="sm">
            Manage your data privacy and communication preferences.
          </Text>
        </div>

        {error !== null && (
          <Alert tone="danger" data-testid="consent-error">
            {error.message}
          </Alert>
        )}

        <div className="flex flex-col gap-4">
          {CONSENT_CATEGORIES.map((category) => (
            <div
              key={category.key}
              className="flex items-start justify-between gap-4 pb-4 border-b"
            >
              <div className="flex-1">
                <label htmlFor={`consent-${category.key}`}>
                  <Text className="font-medium mb-1">{category.label}</Text>
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

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => {
              void handleSave();
            }}
            disabled={!hasChanges || isUpdating}
            data-testid="consent-save-button"
          >
            {isUpdating ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
