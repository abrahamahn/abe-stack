// main/client/api/src/workspace/client.ts
/**
 * Workspace API Client
 *
 * Type-safe client for tenant/workspace management operations.
 */

import { createCsrfRequestClient } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  CreateInvitation,
  CreateTenantInput,
  Invitation,
  Membership,
  Tenant,
  UpdateMembershipRole,
  UpdateTenantInput,
} from '@abe-stack/shared';

export type WorkspaceClientConfig = BaseClientConfig;

export interface WorkspaceClient {
  createTenant: (data: CreateTenantInput) => Promise<Tenant>;
  listTenants: () => Promise<{ tenants: Tenant[] }>;
  getTenant: (id: string) => Promise<Tenant>;
  updateTenant: (id: string, data: UpdateTenantInput) => Promise<Tenant>;
  deleteTenant: (id: string) => Promise<{ message: string }>;
  listMembers: (tenantId: string) => Promise<{ members: Membership[] }>;
  addMember: (tenantId: string, data: { userId: string; role: string }) => Promise<Membership>;
  updateMemberRole: (
    tenantId: string,
    userId: string,
    data: UpdateMembershipRole,
  ) => Promise<Membership>;
  removeMember: (tenantId: string, userId: string) => Promise<{ message: string }>;
  createInvitation: (tenantId: string, data: CreateInvitation) => Promise<Invitation>;
  listInvitations: (tenantId: string) => Promise<{ invitations: Invitation[] }>;
  revokeInvitation: (tenantId: string, invitationId: string) => Promise<{ message: string }>;
  resendInvitation: (tenantId: string, invitationId: string) => Promise<{ message: string }>;
  acceptInvitation: (invitationId: string) => Promise<{ message: string; tenantId: string }>;
}

export function createWorkspaceClient(config: WorkspaceClientConfig): WorkspaceClient {
  const { request } = createCsrfRequestClient(config);

  return {
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

    async listMembers(tenantId: string): Promise<{ members: Membership[] }> {
      return request<{ members: Membership[] }>(`/tenants/${tenantId}/members`, {
        method: 'GET',
      });
    },

    async addMember(tenantId: string, data: { userId: string; role: string }): Promise<Membership> {
      return request<Membership>(`/tenants/${tenantId}/members/add`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateMemberRole(
      tenantId: string,
      userId: string,
      data: UpdateMembershipRole,
    ): Promise<Membership> {
      return request<Membership>(`/tenants/${tenantId}/members/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async removeMember(tenantId: string, userId: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/tenants/${tenantId}/members/${userId}/remove`, {
        method: 'POST',
      });
    },

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

    async acceptInvitation(invitationId: string): Promise<{ message: string; tenantId: string }> {
      return request<{ message: string; tenantId: string }>(`/invitations/${invitationId}/accept`, {
        method: 'POST',
      });
    },
  };
}

