// src/apps/web/src/features/auth/hooks/useWebauthn.ts
/**
 * WebAuthn/Passkey hooks for registration, login, and management.
 */

import { getApiClient } from '@abe-stack/api';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { useCallback, useEffect, useState } from 'react';

import type { PasskeyListItem } from '@abe-stack/shared';

// ============================================================================
// usePasskeys — List, rename, delete passkeys
// ============================================================================

export interface PasskeysState {
  passkeys: PasskeyListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function usePasskeys(): PasskeysState {
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const api = getApiClient();
      const data = await api.listPasskeys();
      setPasskeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load passkeys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const rename = useCallback(
    async (id: string, name: string) => {
      const api = getApiClient();
      await api.renamePasskey(id, name);
      await refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      const api = getApiClient();
      await api.deletePasskey(id);
      await refetch();
    },
    [refetch],
  );

  return { passkeys, isLoading, error, refetch, rename, remove };
}

// ============================================================================
// useRegisterPasskey — Register a new passkey
// ============================================================================

export interface RegisterPasskeyState {
  register: (name?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useRegisterPasskey(onSuccess?: () => void): RegisterPasskeyState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (name?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const api = getApiClient();
        const { options } = await api.webauthnRegisterOptions();
        const optionsJSON = options as unknown as Parameters<typeof startRegistration>[0]['optionsJSON'];
        const credential = await startRegistration({
          optionsJSON,
        });
        const payload =
          name !== undefined
            ? { credential: credential as unknown as Record<string, unknown>, name }
            : { credential: credential as unknown as Record<string, unknown> };
        await api.webauthnRegisterVerify(payload);
        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess],
  );

  return { register, isLoading, error };
}

// ============================================================================
// useLoginWithPasskey — Authenticate with a passkey
// ============================================================================

export interface LoginWithPasskeyState {
  login: (email?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useLoginWithPasskey(onSuccess?: () => void): LoginWithPasskeyState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const api = getApiClient();
        const { options } = await api.webauthnLoginOptions(email);
        const sessionKey = options['sessionKey'] as string;
        const optionsJSON = options as unknown as Parameters<typeof startAuthentication>[0]['optionsJSON'];
        const credential = await startAuthentication({
          optionsJSON,
        });
        await api.webauthnLoginVerify({
          credential: credential as unknown as Record<string, unknown>,
          sessionKey,
        });
        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess],
  );

  return { login, isLoading, error };
}
