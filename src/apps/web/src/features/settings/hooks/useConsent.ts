// src/apps/web/src/features/settings/hooks/useConsent.ts
/**
 * Consent Hooks
 *
 * Hooks for fetching and updating user consent preferences.
 */

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
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me/consent', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch consent preferences');
      }

      const data = (await response.json()) as { preferences: ConsentPreferences };
      setPreferences(data.preferences);
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateConsent = useCallback(
    async (input: UpdateConsentInput): Promise<UpdateConsentResponse> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch('/api/users/me/consent', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { message?: string };
          throw new Error(errorData.message ?? 'Failed to update consent preferences');
        }

        const data = (await response.json()) as UpdateConsentResponse;
        return data;
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  return {
    updateConsent,
    isUpdating,
    error,
  };
}
