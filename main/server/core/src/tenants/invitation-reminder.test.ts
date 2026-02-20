// main/server/core/src/tenants/invitation-reminder.test.ts
/**
 * Tests for InvitationReminderService
 */

import { MS_PER_DAY } from '@bslt/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitationReminderService } from './invitation-reminder';

import type { EmailSender, PendingInvitation } from './invitation-reminder';

// ============================================================================
// Mocks
// ============================================================================

function createMockRepos() {
  return {
    tenants: {
      findById: vi.fn(),
    },
    users: {
      findById: vi.fn(),
    },
    invitations: {
      findPendingExpiringBefore: vi.fn(),
      updateReminderSentAt: vi.fn(),
    },
  };
}

function createMockEmailSender(): EmailSender {
  return {
    sendInvitationReminder: vi.fn().mockResolvedValue(undefined),
  };
}

function createPendingInvitation(overrides: Partial<PendingInvitation> = {}): PendingInvitation {
  const now = new Date();
  return {
    id: 'inv-1',
    tenantId: 'tenant-1',
    email: 'user@example.com',
    role: 'member',
    expiresAt: new Date(now.getTime() + 2 * MS_PER_DAY),
    invitedById: 'user-inviter',
    createdAt: new Date(now.getTime() - 5 * MS_PER_DAY),
    reminderSentAt: null,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('InvitationReminderService', () => {
  let repos: ReturnType<typeof createMockRepos>;
  let emailSender: EmailSender;
  let service: InvitationReminderService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    emailSender = createMockEmailSender();
    service = new InvitationReminderService(repos as never, emailSender);
  });

  describe('processReminders', () => {
    it('should send reminder emails for eligible invitations', async () => {
      const invitation = createPendingInvitation();

      repos.invitations.findPendingExpiringBefore.mockResolvedValue([invitation]);
      repos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test Workspace' });
      repos.users.findById.mockResolvedValue({
        id: 'user-inviter',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
      repos.invitations.updateReminderSentAt.mockResolvedValue(undefined);

      const result = await service.processReminders();

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(emailSender.sendInvitationReminder).toHaveBeenCalledWith({
        to: 'user@example.com',
        invitationId: 'inv-1',
        tenantName: 'Test Workspace',
        role: 'member',
        expiresAt: invitation.expiresAt,
        invitedByName: 'John Doe',
      });
      expect(repos.invitations.updateReminderSentAt).toHaveBeenCalledWith(
        'inv-1',
        expect.any(Date),
      );
    });

    it('should skip invitations that already had a reminder sent', async () => {
      const invitation = createPendingInvitation({
        reminderSentAt: new Date(),
      });

      repos.invitations.findPendingExpiringBefore.mockResolvedValue([invitation]);

      const result = await service.processReminders();

      expect(result.sent).toBe(0);
      expect(emailSender.sendInvitationReminder).not.toHaveBeenCalled();
    });

    it('should skip invitations when tenant is not found', async () => {
      const invitation = createPendingInvitation();

      repos.invitations.findPendingExpiringBefore.mockResolvedValue([invitation]);
      repos.tenants.findById.mockResolvedValue(null);

      const result = await service.processReminders();

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(emailSender.sendInvitationReminder).not.toHaveBeenCalled();
    });

    it('should handle email send failures gracefully', async () => {
      const invitation = createPendingInvitation();

      repos.invitations.findPendingExpiringBefore.mockResolvedValue([invitation]);
      repos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test Workspace' });
      repos.users.findById.mockResolvedValue(null);
      vi.mocked(emailSender.sendInvitationReminder).mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      const result = await service.processReminders();

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        invitationId: 'inv-1',
        error: 'SMTP connection failed',
      });
    });

    it('should respect batch size limit', async () => {
      const invitations = Array.from({ length: 5 }, (_, i) =>
        createPendingInvitation({ id: `inv-${i}` }),
      );

      repos.invitations.findPendingExpiringBefore.mockResolvedValue(invitations);
      repos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test Workspace' });
      repos.users.findById.mockResolvedValue(null);
      repos.invitations.updateReminderSentAt.mockResolvedValue(undefined);

      const limitedService = new InvitationReminderService(repos as never, emailSender, {
        batchSize: 2,
      });

      const result = await limitedService.processReminders();

      expect(result.sent).toBe(2);
      expect(result.skipped).toBe(3);
      expect(emailSender.sendInvitationReminder).toHaveBeenCalledTimes(2);
    });

    it('should return zero results when disabled', async () => {
      const disabledService = new InvitationReminderService(repos as never, emailSender, {
        enabled: false,
      });

      const result = await disabledService.processReminders();

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(repos.invitations.findPendingExpiringBefore).not.toHaveBeenCalled();
    });

    it('should use fallback inviter name when user has no name', async () => {
      const invitation = createPendingInvitation();

      repos.invitations.findPendingExpiringBefore.mockResolvedValue([invitation]);
      repos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test Workspace' });
      repos.users.findById.mockResolvedValue(null);
      repos.invitations.updateReminderSentAt.mockResolvedValue(undefined);

      const result = await service.processReminders();

      expect(result.sent).toBe(1);
      expect(emailSender.sendInvitationReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedByName: 'A team member',
        }),
      );
    });

    it('should use email as inviter name when user has no first/last name', async () => {
      const invitation = createPendingInvitation();

      repos.invitations.findPendingExpiringBefore.mockResolvedValue([invitation]);
      repos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test Workspace' });
      repos.users.findById.mockResolvedValue({
        id: 'user-inviter',
        firstName: null,
        lastName: null,
        email: 'inviter@example.com',
      });
      repos.invitations.updateReminderSentAt.mockResolvedValue(undefined);

      await service.processReminders();

      expect(emailSender.sendInvitationReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedByName: 'inviter@example.com',
        }),
      );
    });
  });

  describe('configuration', () => {
    it('should return default configuration', () => {
      const config = service.getConfig();

      expect(config.reminderDaysBeforeExpiry).toBe(3);
      expect(config.enabled).toBe(true);
      expect(config.batchSize).toBe(100);
    });

    it('should allow runtime configuration updates', () => {
      service.updateConfig({ reminderDaysBeforeExpiry: 5 });

      const config = service.getConfig();
      expect(config.reminderDaysBeforeExpiry).toBe(5);
      expect(config.enabled).toBe(true);
    });

    it('should accept custom initial configuration', () => {
      const customService = new InvitationReminderService(repos as never, emailSender, {
        reminderDaysBeforeExpiry: 7,
        batchSize: 50,
      });

      const config = customService.getConfig();
      expect(config.reminderDaysBeforeExpiry).toBe(7);
      expect(config.batchSize).toBe(50);
      expect(config.enabled).toBe(true);
    });
  });
});
