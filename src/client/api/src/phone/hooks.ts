// src/client/api/src/phone/hooks.ts
/**
 * Phone/SMS Management React Hooks
 *
 * Wraps the phone client in React state management.
 */

import { useCallback, useMemo, useState } from 'react';

import { createPhoneClient } from './client';

import type { PhoneClientConfig } from './client';

// ============================================================================
// Types
// ============================================================================

export interface UsePhoneOptions {
  clientConfig: PhoneClientConfig;
}

export interface PhoneState {
  isLoading: boolean;
  error: Error | null;
  setPhone: (phone: string) => Promise<void>;
  verifyPhone: (code: string) => Promise<void>;
  removePhone: () => Promise<void>;
}

// ============================================================================
// Hooks
// ============================================================================

export function usePhone(options: UsePhoneOptions): PhoneState {
  const { clientConfig } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createPhoneClient(clientConfig), [clientConfig]);

  const setPhone = useCallback(
    async (phone: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.setPhone(phone);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const verifyPhone = useCallback(
    async (code: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.verifyPhone(code);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const removePhone = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await client.removePhone();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  return { isLoading, error, setPhone, verifyPhone, removePhone };
}
