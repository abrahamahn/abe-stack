// main/apps/web/src/features/admin/hooks/useImpersonation.ts
/**
 * Impersonation Hook
 *
 * Manages admin impersonation state and operations.
 * Allows admins to view the app as a specific user for debugging.
 */

import { getApiClient } from '@abe-stack/api';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useAuth } from '@auth/hooks';
import { useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseImpersonationResult {
  /** Whether the current session is an impersonation session */
  isImpersonating: boolean;
  /** Email of the user being impersonated (null if not impersonating) */
  targetEmail: string | null;
  /** End the current impersonation session */
  endImpersonation: () => Promise<void>;
  /** Start impersonating a specific user */
  startImpersonation: (userId: string) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing admin impersonation sessions.
 *
 * Detects impersonation by checking if the JWT has an `impersonatorId` field.
 * Provides methods to start and end impersonation sessions.
 *
 * @returns Impersonation state and operations
 * @complexity O(1)
 */
export function useImpersonation(): UseImpersonationResult {
  const { config } = useClientEnvironment();
  const { user, refreshToken } = useAuth();

  // Check if current session is an impersonation session
  // This would require decoding the JWT token to check for impersonatorId
  // For now, we'll use a simple placeholder - in production, the backend
  // should include this in the user object or auth state
  const isImpersonating = useMemo(() => {
    // TODO: Backend should expose impersonation status in the user object
    // For now, return false as we don't have access to the raw JWT
    return false;
  }, []);

  const targetEmail = useMemo(() => {
    if (!isImpersonating || user === null) {
      return null;
    }
    return user.email;
  }, [isImpersonating, user]);

  const endImpersonation = useCallback(async (): Promise<void> => {
    try {
      const api = getApiClient({
        baseUrl: config.apiUrl,
      });
      const targetUserId = user?.id;
      if (targetUserId === undefined || targetUserId === '') {
        throw new Error('Missing target user ID');
      }
      await api.endImpersonation(targetUserId);

      // Refresh auth state to get the admin's real token back
      await refreshToken();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to end impersonation: ${message}`);
    }
  }, [config.apiUrl, refreshToken, user?.id]);

  const startImpersonation = useCallback(
    async (userId: string): Promise<void> => {
      try {
        const api = getApiClient({
          baseUrl: config.apiUrl,
        });
        const data = await api.startImpersonation(userId);

        // Store the impersonation token
        // This assumes the tokenStore is accessible - in production, we'd need
        // to trigger this through the auth service
        if (typeof data.token === 'string') {
          // Refresh auth state with the new impersonation token
          await refreshToken();
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to start impersonation: ${message}`);
      }
    },
    [config.apiUrl, refreshToken],
  );

  return {
    isImpersonating,
    targetEmail,
    endImpersonation,
    startImpersonation,
  };
}
