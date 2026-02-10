// src/apps/web/src/features/workspace/hooks/useWorkspaceMutations.ts
/**
 * Workspace Mutation Hooks
 *
 * Hooks for creating, updating, and deleting workspaces.
 */

import { useMutation, useQueryCache } from '@abe-stack/client-engine';

import { createWorkspaceApi } from '../api';

import type { CreateTenantInput, Tenant, UpdateTenantInput } from '@abe-stack/shared';

// ============================================================================
// API Instance
// ============================================================================

let workspaceApi: ReturnType<typeof createWorkspaceApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getWorkspaceApi(): ReturnType<typeof createWorkspaceApi> {
  workspaceApi ??= createWorkspaceApi({
    baseUrl: apiBaseUrl,
    getToken: (): string | null => localStorage.getItem('accessToken'),
  });
  return workspaceApi;
}

// ============================================================================
// Types
// ============================================================================

export interface UseCreateWorkspaceOptions {
  onSuccess?: (tenant: Tenant) => void;
  onError?: (error: Error) => void;
}

export interface UseCreateWorkspaceResult {
  create: (data: CreateTenantInput) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseUpdateWorkspaceOptions {
  onSuccess?: (tenant: Tenant) => void;
  onError?: (error: Error) => void;
}

export interface UseUpdateWorkspaceResult {
  update: (id: string, data: UpdateTenantInput) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseDeleteWorkspaceOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseDeleteWorkspaceResult {
  remove: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

export function useCreateWorkspace(options?: UseCreateWorkspaceOptions): UseCreateWorkspaceResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<Tenant, Error, CreateTenantInput>({
    mutationFn: async (data): Promise<Tenant> => {
      const api = getWorkspaceApi();
      return api.createTenant(data);
    },
    onSuccess: (tenant) => {
      queryCache.invalidateQuery(['workspaces']);
      options?.onSuccess?.(tenant);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    create: mutation.mutate,
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useUpdateWorkspace(options?: UseUpdateWorkspaceOptions): UseUpdateWorkspaceResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<Tenant, Error, { id: string; data: UpdateTenantInput }>({
    mutationFn: async ({ id, data }): Promise<Tenant> => {
      const api = getWorkspaceApi();
      return api.updateTenant(id, data);
    },
    onSuccess: (tenant) => {
      queryCache.invalidateQuery(['workspaces']);
      queryCache.invalidateQuery(['workspaces', tenant.id]);
      options?.onSuccess?.(tenant);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    update: (id: string, data: UpdateTenantInput): void => {
      mutation.mutate({ id, data });
    },
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useDeleteWorkspace(options?: UseDeleteWorkspaceOptions): UseDeleteWorkspaceResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<{ message: string }, Error, string>({
    mutationFn: async (id): Promise<{ message: string }> => {
      const api = getWorkspaceApi();
      return api.deleteTenant(id);
    },
    onSuccess: () => {
      queryCache.invalidateQuery(['workspaces']);
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    remove: mutation.mutate,
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}
