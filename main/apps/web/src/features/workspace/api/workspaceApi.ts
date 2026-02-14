// main/apps/web/src/features/workspace/api/workspaceApi.ts
/**
 * Workspace API Client
 *
 * API functions for tenant/workspace management operations.
 */

import { createWorkspaceClient } from '@abe-stack/api';

import type { BaseClientConfig } from '@abe-stack/api';
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

export type WorkspaceApiConfig = BaseClientConfig;

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
  acceptInvitation: (invitationId: string) => Promise<{ message: string; tenantId: string }>;
}

// ============================================================================
// Implementation
// ============================================================================

export function createWorkspaceApi(config: WorkspaceApiConfig): WorkspaceApi {
  const client = createWorkspaceClient(config);

  return {
    async createTenant(data: CreateTenantInput): Promise<Tenant> {
      return client.createTenant(data);
    },

    async listTenants(): Promise<{ tenants: Tenant[] }> {
      return client.listTenants();
    },

    async getTenant(id: string): Promise<Tenant> {
      return client.getTenant(id);
    },

    async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
      return client.updateTenant(id, data);
    },

    async deleteTenant(id: string): Promise<{ message: string }> {
      return client.deleteTenant(id);
    },

    async listMembers(tenantId: string): Promise<{ members: Membership[] }> {
      return client.listMembers(tenantId);
    },

    async addMember(tenantId: string, data: { userId: string; role: string }): Promise<Membership> {
      return client.addMember(tenantId, data);
    },

    async updateMemberRole(
      tenantId: string,
      userId: string,
      data: UpdateMembershipRole,
    ): Promise<Membership> {
      return client.updateMemberRole(tenantId, userId, data);
    },

    async removeMember(tenantId: string, userId: string): Promise<{ message: string }> {
      return client.removeMember(tenantId, userId);
    },

    async createInvitation(tenantId: string, data: CreateInvitation): Promise<Invitation> {
      return client.createInvitation(tenantId, data);
    },

    async listInvitations(tenantId: string): Promise<{ invitations: Invitation[] }> {
      return client.listInvitations(tenantId);
    },

    async revokeInvitation(tenantId: string, invitationId: string): Promise<{ message: string }> {
      return client.revokeInvitation(tenantId, invitationId);
    },

    async resendInvitation(tenantId: string, invitationId: string): Promise<{ message: string }> {
      return client.resendInvitation(tenantId, invitationId);
    },

    async acceptInvitation(invitationId: string): Promise<{ message: string; tenantId: string }> {
      return client.acceptInvitation(invitationId);
    },
  };
}
