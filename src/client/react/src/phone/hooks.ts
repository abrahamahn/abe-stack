// src/client/react/src/phone/hooks.ts
/**
 * Phone/SMS Management React Hooks
 *
 * Uses useMutation for write-only phone operations.
 */

import { createPhoneClient } from '@abe-stack/api';
import { useMemo } from 'react';

import { useMutation } from '../query/useMutation';

import type { PhoneClientConfig } from '@abe-stack/api';

// ============================================================================
// Types
// ============================================================================

export interface UsePhoneOptions {
  clientConfig: PhoneClientConfig;
}

export interface PhoneState {
  isLoading: boolean;
  error: Error | null;
  setPhone: (phone: string) => Promise<{ message: string }>;
  verifyPhone: (code: string) => Promise<{ verified: true }>;
  removePhone: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function usePhone(options: UsePhoneOptions): PhoneState {
  const client = useMemo(() => createPhoneClient(options.clientConfig), [options.clientConfig]);

  const setPhoneMutation = useMutation({
    mutationFn: (phone: string) => client.setPhone(phone),
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: (code: string) => client.verifyPhone(code),
  });

  const removePhoneMutation = useMutation<{ message: string }>({
    mutationFn: () => client.removePhone(),
  });

  return {
    isLoading:
      setPhoneMutation.isPending || verifyPhoneMutation.isPending || removePhoneMutation.isPending,
    error: setPhoneMutation.error ?? verifyPhoneMutation.error ?? removePhoneMutation.error ?? null,
    setPhone: setPhoneMutation.mutateAsync,
    verifyPhone: verifyPhoneMutation.mutateAsync,
    removePhone: async (): Promise<void> => {
      await removePhoneMutation.mutateAsync(undefined);
    },
  };
}
