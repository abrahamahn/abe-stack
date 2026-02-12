// src/apps/web/src/features/workspace/hooks/useInvitations.ts
/**
 * Invitations Hooks
 *
 * Hooks for listing, creating, revoking, and resending workspace invitations.
 */

import { useMutation, useQuery, useQueryCache } from '@abe-stack/react';
import { tokenStore } from '@abe-stack/shared';

import { createWorkspaceApi } from '../api';

import type { CreateInvitation, Invitation } from '@abe-stack/shared';

// ============================================================================
// API Instance
// ============================================================================

let workspaceApi: ReturnType<typeof createWorkspaceApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getWorkspaceApi(): ReturnType<typeof createWorkspaceApi> {
  workspaceApi ??= createWorkspaceApi({
    baseUrl: apiBaseUrl,
    getToken: (): string | null => tokenStore.get(),
  });
  return workspaceApi;
}

// ============================================================================
// Types
// ============================================================================

export interface UseInvitationsResult {
  data: Invitation[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseCreateInvitationResult {
  invite: (data: CreateInvitation) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseRevokeInvitationResult {
  revoke: (invitationId: string) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseResendInvitationResult {
  resend: (invitationId: string) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseAcceptInvitationResult {
  accept: (token: string) => void;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: { message: string; tenantId: string } | null;
  reset: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

export function useInvitations(tenantId: string | null): UseInvitationsResult {
  const queryCache = useQueryCache();

  const query = useQuery<{ invitations: Invitation[] }>({
    queryKey: ['workspaces', tenantId, 'invitations'],
    queryFn: async (): Promise<{ invitations: Invitation[] }> => {
      if (tenantId === null) throw new Error('No tenant ID');
      const api = getWorkspaceApi();
      return api.listInvitations(tenantId);
    },
    enabled: tenantId !== null,
    staleTime: 30 * 1000,
  });

  const refetch = (): void => {
    if (tenantId !== null) {
      queryCache.invalidateQuery(['workspaces', tenantId, 'invitations']);
    }
  };

  return {
    data: query.data?.invitations ?? [],
    isLoading: query.status === 'pending',
    isError: query.status === 'error',
    error: query.error ?? null,
    refetch,
  };
}

export function useCreateInvitation(
  tenantId: string | null,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void },
): UseCreateInvitationResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<Invitation, Error, CreateInvitation>({
    mutationFn: async (data): Promise<Invitation> => {
      if (tenantId === null) throw new Error('No tenant ID');
      const api = getWorkspaceApi();
      return api.createInvitation(tenantId, data);
    },
    onSuccess: () => {
      if (tenantId !== null) {
        queryCache.invalidateQuery(['workspaces', tenantId, 'invitations']);
      }
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    invite: mutation.mutate,
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useRevokeInvitation(
  tenantId: string | null,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void },
): UseRevokeInvitationResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<{ message: string }, Error, string>({
    mutationFn: async (invitationId): Promise<{ message: string }> => {
      if (tenantId === null) throw new Error('No tenant ID');
      const api = getWorkspaceApi();
      return api.revokeInvitation(tenantId, invitationId);
    },
    onSuccess: () => {
      if (tenantId !== null) {
        queryCache.invalidateQuery(['workspaces', tenantId, 'invitations']);
      }
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    revoke: mutation.mutate,
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useResendInvitation(
  tenantId: string | null,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void },
): UseResendInvitationResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<{ message: string }, Error, string>({
    mutationFn: async (invitationId): Promise<{ message: string }> => {
      if (tenantId === null) throw new Error('No tenant ID');
      const api = getWorkspaceApi();
      return api.resendInvitation(tenantId, invitationId);
    },
    onSuccess: () => {
      if (tenantId !== null) {
        queryCache.invalidateQuery(['workspaces', tenantId, 'invitations']);
      }
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    resend: mutation.mutate,
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useAcceptInvitation(options?: {
  onSuccess?: (data: { message: string; tenantId: string }) => void;
  onError?: (error: Error) => void;
}): UseAcceptInvitationResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<{ message: string; tenantId: string }, Error, string>({
    mutationFn: async (token): Promise<{ message: string; tenantId: string }> => {
      const api = getWorkspaceApi();
      return api.acceptInvitation(token);
    },
    onSuccess: (data) => {
      queryCache.invalidateQuery(['workspaces']);
      options?.onSuccess?.(data);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    accept: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    error: mutation.error,
    data: mutation.data ?? null,
    reset: mutation.reset,
  };
}
