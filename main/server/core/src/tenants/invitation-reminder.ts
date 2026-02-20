// main/server/core/src/tenants/invitation-reminder.ts
/**
 * Invitation Reminder Service
 *
 * Sends configurable reminder emails for pending workspace invitations
 * N days before they expire. Designed to be run as a scheduled/cron job.
 *
 * @module invitation-reminder
 */

import { MS_PER_DAY } from '@bslt/shared';

import type { Repositories } from '../../../db/src';

// ============================================================================
// Types
// ============================================================================

export interface InvitationReminderConfig {
  /** Number of days before expiry to send a reminder (default: 3) */
  reminderDaysBeforeExpiry: number;
  /** Whether reminders are enabled (default: true) */
  enabled: boolean;
  /** Maximum reminders to send per run to avoid flooding (default: 100) */
  batchSize: number;
}

export interface PendingInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  expiresAt: Date;
  invitedById: string;
  createdAt: Date;
  reminderSentAt: Date | null;
}

export interface ReminderResult {
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ invitationId: string; error: string }>;
}

export interface EmailSender {
  sendInvitationReminder(params: {
    to: string;
    invitationId: string;
    tenantName: string;
    role: string;
    expiresAt: Date;
    invitedByName: string;
  }): Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: InvitationReminderConfig = {
  reminderDaysBeforeExpiry: 3,
  enabled: true,
  batchSize: 100,
};

// ============================================================================
// Service
// ============================================================================

export class InvitationReminderService {
  private readonly repos: Repositories;
  private readonly emailSender: EmailSender;
  private readonly config: InvitationReminderConfig;

  constructor(
    repos: Repositories,
    emailSender: EmailSender,
    config?: Partial<InvitationReminderConfig>,
  ) {
    this.repos = repos;
    this.emailSender = emailSender;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process pending invitations and send reminder emails for those
   * expiring within the configured window.
   *
   * An invitation is eligible for a reminder if:
   * 1. Its status is 'pending'
   * 2. It expires within `reminderDaysBeforeExpiry` days from now
   * 3. It hasn't already had a reminder sent (reminderSentAt is null)
   * 4. It hasn't already expired
   */
  async processReminders(): Promise<ReminderResult> {
    if (!this.config.enabled) {
      return { sent: 0, failed: 0, skipped: 0, errors: [] };
    }

    const now = new Date();
    const reminderWindowStart = now;
    const reminderWindowEnd = new Date(
      now.getTime() + this.config.reminderDaysBeforeExpiry * MS_PER_DAY,
    );

    // Find pending invitations expiring within the reminder window
    // that haven't had a reminder sent yet
    const pendingInvitations = await this.findEligibleInvitations(
      reminderWindowStart,
      reminderWindowEnd,
    );

    const result: ReminderResult = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    // Process in batches
    const batch = pendingInvitations.slice(0, this.config.batchSize);

    for (const invitation of batch) {
      try {
        // Look up tenant and inviter info for the email
        const tenant = await this.repos.tenants.findById(invitation.tenantId);
        if (tenant === null) {
          result.skipped += 1;
          continue;
        }

        const inviter = await this.repos.users.findById(invitation.invitedById);
        const inviterName =
          inviter !== null
            ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email
            : 'A team member';

        await this.emailSender.sendInvitationReminder({
          to: invitation.email,
          invitationId: invitation.id,
          tenantName: tenant.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          invitedByName: inviterName,
        });

        // Mark as reminder sent
        await this.markReminderSent(invitation.id);
        result.sent += 1;
      } catch (err) {
        result.failed += 1;
        result.errors.push({
          invitationId: invitation.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Count skipped invitations beyond batch size
    if (pendingInvitations.length > this.config.batchSize) {
      result.skipped += pendingInvitations.length - this.config.batchSize;
    }

    return result;
  }

  /**
   * Find invitations eligible for a reminder email.
   */
  private async findEligibleInvitations(
    _windowStart: Date,
    windowEnd: Date,
  ): Promise<PendingInvitation[]> {
    // Query pending invitations that:
    // - have status 'pending'
    // - expire before windowEnd (within the reminder window)
    // - have not expired yet (expiresAt > now)
    // - have not had a reminder sent (reminderSentAt IS NULL)
    const invitations = (await this.repos.invitations.findPendingExpiringBefore(
      windowEnd,
    )) as PendingInvitation[];

    return invitations.filter((inv) => inv.reminderSentAt === null);
  }

  /**
   * Mark an invitation as having had its reminder sent.
   */
  private async markReminderSent(invitationId: string): Promise<void> {
    await this.repos.invitations.updateReminderSentAt(invitationId, new Date());
  }

  /**
   * Get the current configuration.
   */
  getConfig(): InvitationReminderConfig {
    return { ...this.config };
  }

  /**
   * Update the reminder configuration at runtime.
   */
  updateConfig(updates: Partial<InvitationReminderConfig>): void {
    Object.assign(this.config, updates);
  }
}
