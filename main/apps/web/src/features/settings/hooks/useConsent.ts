// main/apps/web/src/features/settings/hooks/useConsent.ts
/**
 * Consent Hooks
 *
 * Hooks for fetching and updating user consent preferences.
 */

import { useClientEnvironment } from '@app/ClientEnvironment';
import { getApiClient } from '@bslt/api';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ConsentPreferences {
  readonly analytics: boolean | null;
  readonly marketing_email: boolean | null;
  readonly third_party_sharing: boolean | null;
  readonly profiling: boolean | null;
}

export interface UpdateConsentInput {
  readonly analytics?: boolean;
  readonly marketing_email?: boolean;
  readonly third_party_sharing?: boolean;
  readonly profiling?: boolean;
}

export interface UpdateConsentResponse {
  readonly preferences: ConsentPreferences;
  readonly updated: number;
}

export interface UseConsentResult {
  /** Current consent preferences */
  preferences: ConsentPreferences | null;
  /** Whether preferences are being loaded */
  isLoading: boolean;
  /** Error from fetching preferences */
  error: Error | null;
  /** Refresh the consent preferences */
  refetch: () => Promise<void>;
}

export interface UseUpdateConsentResult {
  /** Update consent preferences */
  updateConsent: (input: UpdateConsentInput) => Promise<UpdateConsentResponse>;
  /** Whether an update is in progress */
  isUpdating: boolean;
  /** Error from the most recent update */
  error: Error | null;
}

// ============================================================================
// useConsent Hook
// ============================================================================

/**
 * Fetch current user's consent preferences.
 *
 * @returns Query result with preferences, loading state, and error
 * @complexity O(1)
 */
export function useConsent(): UseConsentResult {
  const { config } = useClientEnvironment();
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const api = getApiClient({
        baseUrl: config.apiUrl,
      });
      const data = await api.getConsent();
      setPreferences(data.preferences as unknown as ConsentPreferences);
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [config.apiUrl]);

  // Initial fetch on mount
  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    refetch: fetchPreferences,
  };
}

// ============================================================================
// useUpdateConsent Hook
// ============================================================================

/**
 * Update user's consent preferences.
 *
 * @returns Mutation function, loading state, and error
 * @complexity O(1)
 */
export function useUpdateConsent(): UseUpdateConsentResult {
  const { config } = useClientEnvironment();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateConsent = useCallback(
    async (input: UpdateConsentInput): Promise<UpdateConsentResponse> => {
      setIsUpdating(true);
      setError(null);

      try {
        const api = getApiClient({
          baseUrl: config.apiUrl,
        });
        const data = (await api.updateConsent(input)) as unknown as UpdateConsentResponse;
        return data;
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsUpdating(false);
      }
    },
    [config.apiUrl],
  );

  return {
    updateConsent,
    isUpdating,
    error,
  };
}
