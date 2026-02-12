// src/apps/web/src/features/workspace/api/workspaceApi.ts
/**
 * Workspace API Client
 *
 * API functions for tenant/workspace management operations.
 */

import { createApiError, NetworkError } from '@abe-stack/api';
import { addAuthHeader, API_PREFIX, trimTrailingSlashes } from '@abe-stack/shared';

import type {
  CreateInvitation,
  CreateTenantInput,
  Invitation,
  Membership,
  Tenant,
  UpdateMembershipRole,
  UpdateTenantInput,
} from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface WorkspaceApi {
  // Tenants
  createTenant: (data: CreateTenantInput) => Promise<Tenant>;
  listTenants: () => Promise<{ tenants: Tenant[] }>;
  getTenant: (id: string) => Promise<Tenant>;
  updateTenant: (id: string, data: UpdateTenantInput) => Promise<Tenant>;
  deleteTenant: (id: string) => Promise<{ message: string }>;

  // Members
  listMembers: (tenantId: string) => Promise<{ members: Membership[] }>;
  addMember: (tenantId: string, data: { userId: string; role: string }) => Promise<Membership>;
  updateMemberRole: (
    tenantId: string,
    userId: string,
    data: UpdateMembershipRole,
  ) => Promise<Membership>;
  removeMember: (tenantId: string, userId: string) => Promise<{ message: string }>;

  // Invitations
  createInvitation: (tenantId: string, data: CreateInvitation) => Promise<Invitation>;
  listInvitations: (tenantId: string) => Promise<{ invitations: Invitation[] }>;
  revokeInvitation: (tenantId: string, invitationId: string) => Promise<{ message: string }>;
  resendInvitation: (tenantId: string, invitationId: string) => Promise<{ message: string }>;
  acceptInvitation: (token: string) => Promise<{ message: string; tenantId: string }>;
}

// ============================================================================
// Implementation
// ============================================================================

export function createWorkspaceApi(config: WorkspaceApiConfig): WorkspaceApi {
  const baseUrl = trimTrailingSlashes(config.baseUrl);
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    addAuthHeader(headers, config.getToken?.());

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error: unknown) {
      throw new NetworkError(
        `Failed to fetch ${options?.method ?? 'GET'} ${path}`,
        error instanceof Error ? error : undefined,
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data as { message?: string; code?: string });
    }

    return data as T;
  };

  return {
    // Tenants
    async createTenant(data: CreateTenantInput): Promise<Tenant> {
      return request<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async listTenants(): Promise<{ tenants: Tenant[] }> {
      return request<{ tenants: Tenant[] }>('/tenants/list', {
        method: 'GET',
      });
    },

    async getTenant(id: string): Promise<Tenant> {
      return request<Tenant>(`/tenants/${id}`, {
        method: 'GET',
      });
    },

    async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
      return request<Tenant>(`/tenants/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteTenant(id: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/tenants/${id}/delete`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    // Members
    async listMembers(tenantId: string): Promise<{ members: Membership[] }> {
      return request<{ members: Membership[] }>(`/tenants/${tenantId}/members`, {
        method: 'GET',
      });
    },

    async addMember(tenantId: string, data: { userId: string; role: string }): Promise<Membership> {
      return request<Membership>(`/tenants/${tenantId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateMemberRole(
      tenantId: string,
      userId: string,
      data: UpdateMembershipRole,
    ): Promise<Membership> {
      return request<Membership>(`/tenants/${tenantId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async removeMember(tenantId: string, userId: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/tenants/${tenantId}/members/${userId}`, {
        method: 'DELETE',
      });
    },

    // Invitations
    async createInvitation(tenantId: string, data: CreateInvitation): Promise<Invitation> {
      return request<Invitation>(`/tenants/${tenantId}/invitations`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async listInvitations(tenantId: string): Promise<{ invitations: Invitation[] }> {
      return request<{ invitations: Invitation[] }>(`/tenants/${tenantId}/invitations/list`, {
        method: 'GET',
      });
    },

    async revokeInvitation(tenantId: string, invitationId: string): Promise<{ message: string }> {
      return request<{ message: string }>(
        `/tenants/${tenantId}/invitations/${invitationId}/revoke`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
    },

    async resendInvitation(tenantId: string, invitationId: string): Promise<{ message: string }> {
      return request<{ message: string }>(
        `/tenants/${tenantId}/invitations/${invitationId}/resend`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
    },

    async acceptInvitation(token: string): Promise<{ message: string; tenantId: string }> {
      return request<{ message: string; tenantId: string }>('/tenants/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },
  };
}
