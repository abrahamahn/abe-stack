import { EntityType } from "@/server/database/models/shared/EntityTypes";
import { UserRepository } from "@/server/database/repositories/auth";
import { BaseService } from "@/server/services/shared";
import { ResourceNotFoundError } from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

import {
  ContentModerationService,
  ModerationReason,
  ModerationStatus,
  ModerationDecision,
} from "./ContentModerationService";

/**
 * Enum defining different types of moderation actions
 */
export enum ModerationActionType {
  CONTENT_REMOVE = "content_remove",
  CONTENT_HIDE = "content_hide",
  CONTENT_WARN = "content_warn",
  USER_WARN = "user_warn",
  USER_SUSPEND = "user_suspend",
  USER_BAN = "user_ban",
  ACCOUNT_RESTRICT = "account_restrict",
  APPEAL_APPROVED = "appeal_approved",
  APPEAL_REJECTED = "appeal_rejected",
}

/**
 * Enum defining appeal statuses
 */
export enum AppealStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

/**
 * Interface representing a moderation action
 */
export interface ModerationAction {
  id: string;
  actionType: ModerationActionType;
  contentId?: string;
  contentType?: EntityType;
  userId: string;
  moderatorId: string;
  reason: ModerationReason;
  comment?: string;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

/**
 * Interface representing an appeal
 */
export interface Appeal {
  id: string;
  actionId: string;
  userId: string;
  reason: string;
  evidence?: string;
  status: AppealStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  reviewComment?: string;
}

/**
 * Service for applying and managing moderation actions
 * Features:
 * 1. Content restriction application
 * 2. User penalty enforcement
 * 3. Appeal handling
 * 4. Moderation action history
 * 5. Moderation effectiveness metrics
 */
export class ModerationActionService extends BaseService {
  constructor(
    private userRepository: UserRepository,
    private contentModerationService: ContentModerationService,
    private metricsService: MetricsService
  ) {
    super("ModerationActionService");
  }

  /**
   * Apply a moderation action to content or user
   * @param actionType Type of action to apply
   * @param userId ID of the user to take action against
   * @param moderatorId ID of the moderator taking the action
   * @param reason Reason for the action
   * @param options Additional options for the action
   */
  async applyAction(
    actionType: ModerationActionType,
    userId: string,
    moderatorId: string,
    reason: ModerationReason,
    options: {
      contentId?: string;
      contentType?: EntityType;
      comment?: string;
      duration?: number; // Duration in seconds
    } = {}
  ): Promise<ModerationAction> {
    const startTime = Date.now();

    try {
      // Verify that both user and moderator exist
      const [user, moderator] = await Promise.all([
        this.userRepository.findById(userId),
        this.userRepository.findById(moderatorId),
      ]);

      if (!user) {
        throw new ResourceNotFoundError("User not found", "user");
      }

      if (!moderator) {
        throw new ResourceNotFoundError("Moderator not found", "user");
      }

      // Check if content exists if we're taking action on content
      if (options.contentId && options.contentType) {
        // In a real implementation, we would verify the content exists
        // and that it belongs to the specified user
      }

      // Calculate expiration date if duration is provided
      let expiresAt: Date | undefined;
      if (options.duration) {
        expiresAt = new Date(Date.now() + options.duration * 1000);
      }

      // Create the action record
      const action: ModerationAction = {
        id: `action_${Date.now()}`, // In real implementation would use UUID
        actionType,
        contentId: options.contentId,
        contentType: options.contentType,
        userId,
        moderatorId,
        reason,
        comment: options.comment,
        createdAt: new Date(),
        expiresAt,
        active: true,
      };

      // Execute the action based on type
      await this.executeAction(action);

      // In a real implementation, this would save the action to database

      // Record metrics
      this.metricsService.recordLatency(
        "apply_moderation_action",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter(
        `moderation_action_${actionType.toLowerCase()}`
      );
      this.metricsService.incrementCounter(
        `moderation_reason_${reason.toLowerCase()}`
      );

      return action;
    } catch (error) {
      this.logger.error("Error applying moderation action:", {
        error: error instanceof Error ? error.message : String(error),
        actionType,
        userId,
        moderatorId,
      });
      this.metricsService.incrementCounter("moderation_action_error");
      throw error;
    }
  }

  /**
   * Submit an appeal for a moderation action
   * @param actionId ID of the action being appealed
   * @param userId ID of the user submitting the appeal
   * @param reason Reason for the appeal
   * @param evidence Optional evidence supporting the appeal
   */
  async submitAppeal(
    actionId: string,
    userId: string,
    reason: string,
    evidence?: string
  ): Promise<Appeal> {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundError("User not found", "user");
      }

      // Check if the action exists and belongs to the user
      const action = await this.getAction(actionId);
      if (!action) {
        throw new ResourceNotFoundError(
          "Moderation action not found",
          "moderation_action"
        );
      }

      if (action.userId !== userId) {
        throw new Error(
          "User cannot appeal an action that does not affect them"
        );
      }

      // Check if the action is still active
      if (!action.active) {
        throw new Error("Cannot appeal an inactive moderation action");
      }

      // Check if there's already an appeal for this action
      const existingAppeal = await this.getAppealByActionId(actionId);
      if (existingAppeal && existingAppeal.status === AppealStatus.PENDING) {
        throw new Error("An appeal for this action is already pending");
      }

      // Create the appeal
      const appeal: Appeal = {
        id: `appeal_${Date.now()}`, // In real implementation would use UUID
        actionId,
        userId,
        reason,
        evidence,
        status: AppealStatus.PENDING,
        createdAt: new Date(),
      };

      // In a real implementation, this would save the appeal to database

      this.logger.info(
        `Appeal submitted for action ${actionId} by user ${userId}`
      );
      this.metricsService.incrementCounter("moderation_appeal_submitted");

      return appeal;
    } catch (error) {
      this.logger.error("Error submitting appeal:", {
        error: error instanceof Error ? error.message : String(error),
        actionId,
        userId,
      });
      this.metricsService.incrementCounter("moderation_appeal_error");
      throw error;
    }
  }

  /**
   * Review an appeal and make a decision
   * @param appealId ID of the appeal to review
   * @param reviewerId ID of the moderator reviewing the appeal
   * @param approved Whether the appeal is approved
   * @param comment Optional comment explaining the decision
   */
  async reviewAppeal(
    appealId: string,
    reviewerId: string,
    approved: boolean,
    comment?: string
  ): Promise<Appeal> {
    try {
      // Verify reviewer exists
      const reviewer = await this.userRepository.findById(reviewerId);
      if (!reviewer) {
        throw new ResourceNotFoundError("Reviewer not found", "user");
      }

      // Get the appeal
      const appeal = await this.getAppeal(appealId);
      if (!appeal) {
        throw new ResourceNotFoundError("Appeal not found", "appeal");
      }

      // Check if appeal is already reviewed
      if (appeal.status !== AppealStatus.PENDING) {
        throw new Error("Appeal has already been reviewed");
      }

      // Get the original action
      const action = await this.getAction(appeal.actionId);
      if (!action) {
        throw new ResourceNotFoundError(
          "Original moderation action not found",
          "moderation_action"
        );
      }

      // Update appeal status
      const updatedAppeal: Appeal = {
        ...appeal,
        status: approved ? AppealStatus.APPROVED : AppealStatus.REJECTED,
        reviewedAt: new Date(),
        reviewerId,
        reviewComment: comment,
      };

      // If appeal is approved, revert the original action
      if (approved) {
        await this.revertAction(action);
        this.metricsService.incrementCounter("moderation_appeal_approved");

        // Create a new action to represent the appeal approval
        await this.applyAction(
          ModerationActionType.APPEAL_APPROVED,
          appeal.userId,
          reviewerId,
          action.reason,
          {
            contentId: action.contentId,
            contentType: action.contentType,
            comment: `Appeal approved: ${comment || "No comment provided"}`,
          }
        );
      } else {
        this.metricsService.incrementCounter("moderation_appeal_rejected");

        // Create a new action to represent the appeal rejection
        await this.applyAction(
          ModerationActionType.APPEAL_REJECTED,
          appeal.userId,
          reviewerId,
          action.reason,
          {
            contentId: action.contentId,
            contentType: action.contentType,
            comment: `Appeal rejected: ${comment || "No comment provided"}`,
          }
        );
      }

      // In a real implementation, this would update the appeal in the database

      this.logger.info(
        `Appeal ${appealId} ${approved ? "approved" : "rejected"} by moderator ${reviewerId}`
      );
      return updatedAppeal;
    } catch (error) {
      this.logger.error("Error reviewing appeal:", {
        error: error instanceof Error ? error.message : String(error),
        appealId,
        reviewerId,
      });
      this.metricsService.incrementCounter("moderation_appeal_review_error");
      throw error;
    }
  }

  /**
   * Get all moderation actions for a user
   * @param userId ID of the user
   * @param includeInactive Whether to include inactive actions
   */
  async getUserActions(
    userId: string,
    includeInactive: boolean = false
  ): Promise<ModerationAction[]> {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundError("User not found", "user");
      }

      // In a real implementation, this would query the actions repository
      // Simulated implementation
      return this.simulateGetUserActions(userId, includeInactive);
    } catch (error) {
      this.logger.error("Error getting user actions:", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        includeInactive,
      });
      throw error;
    }
  }

  /**
   * Get user's repeat offender status
   * @param userId ID of the user
   */
  async getUserOffenderStatus(userId: string): Promise<{
    isRepeatOffender: boolean;
    violationCount: number;
    severityScore: number;
    recentActions: ModerationAction[];
  }> {
    try {
      // Get user's recent actions (last 90 days)
      const ninetDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const actions = await this.simulateGetUserActions(userId, false);

      const recentActions = actions.filter(
        (action) => action.createdAt >= ninetDaysAgo
      );

      // Calculate severity score based on action types
      const actionTypeScores: Record<ModerationActionType, number> = {
        [ModerationActionType.CONTENT_WARN]: 1,
        [ModerationActionType.CONTENT_HIDE]: 2,
        [ModerationActionType.CONTENT_REMOVE]: 3,
        [ModerationActionType.USER_WARN]: 3,
        [ModerationActionType.ACCOUNT_RESTRICT]: 5,
        [ModerationActionType.USER_SUSPEND]: 7,
        [ModerationActionType.USER_BAN]: 10,
        [ModerationActionType.APPEAL_APPROVED]: -3,
        [ModerationActionType.APPEAL_REJECTED]: 1,
      };

      const severityScore = recentActions.reduce(
        (score, action) => score + (actionTypeScores[action.actionType] || 0),
        0
      );

      // Determine if user is a repeat offender
      const isRepeatOffender =
        recentActions.length >= 3 || // 3+ violations
        severityScore >= 10; // High severity score

      return {
        isRepeatOffender,
        violationCount: recentActions.length,
        severityScore,
        recentActions: recentActions.slice(0, 5), // Return 5 most recent
      };
    } catch (error) {
      this.logger.error(`Error getting user offender status: ${error}`);
      throw error;
    }
  }

  /**
   * Get analytics on moderation actions
   * @param timeframe Timeframe for the analytics
   */
  async getActionAnalytics(
    _timeframe: "day" | "week" | "month" = "week"
  ): Promise<{
    totalActions: number;
    byType: Record<ModerationActionType, number>;
    byReason: Record<ModerationReason, number>;
    appealRate: number;
    appealSuccessRate: number;
    moderatorActivity: Array<{ moderatorId: string; actionCount: number }>;
  }> {
    try {
      // In a real implementation, this would query analytics data
      // Simulated implementation

      // Generate random data for simulation
      const totalActions = Math.floor(Math.random() * 500) + 100;

      // Distribute actions across types
      const byType: Record<ModerationActionType, number> = {} as Record<
        ModerationActionType,
        number
      >;
      let remaining = totalActions;

      for (const type of Object.values(ModerationActionType)) {
        const count =
          type === ModerationActionType.CONTENT_WARN
            ? remaining
            : Math.floor(Math.random() * (remaining / 2));
        byType[type] = count;
        remaining -= count;
        if (remaining <= 0) break;
      }

      // Distribute actions across reasons
      const byReason: Record<ModerationReason, number> = {} as Record<
        ModerationReason,
        number
      >;
      remaining = totalActions;

      for (const reason of Object.values(ModerationReason)) {
        const count =
          reason === ModerationReason.OTHER
            ? remaining
            : Math.floor(Math.random() * (remaining / 2));
        byReason[reason] = count;
        remaining -= count;
        if (remaining <= 0) break;
      }

      // Calculate appeal rates
      const appealRate = Math.random() * 0.3 + 0.1; // 10-40%
      const appealSuccessRate = Math.random() * 0.5 + 0.2; // 20-70%

      // Generate moderator activity
      const moderatorCount = Math.floor(Math.random() * 8) + 3; // 3-10 moderators
      const moderatorActivity = Array.from(
        { length: moderatorCount },
        (_, i) => ({
          moderatorId: `mod_${i + 1}`,
          actionCount: Math.floor(Math.random() * (totalActions / 2)) + 5,
        })
      ).sort((a, b) => b.actionCount - a.actionCount);

      return {
        totalActions,
        byType,
        byReason,
        appealRate,
        appealSuccessRate,
        moderatorActivity,
      };
    } catch (error) {
      this.logger.error(`Error getting action analytics: ${error}`);
      throw error;
    }
  }

  // PRIVATE METHODS

  /**
   * Execute a moderation action
   */
  private async executeAction(action: ModerationAction): Promise<void> {
    // Apply different types of actions
    switch (action.actionType) {
      case ModerationActionType.CONTENT_REMOVE:
      case ModerationActionType.CONTENT_HIDE:
        if (action.contentId && action.contentType) {
          // Update content status
          await this.updateContentStatus(action);
        }
        break;

      case ModerationActionType.USER_WARN:
        // Send warning notification to user
        await this.notifyUser(action);
        break;

      case ModerationActionType.USER_SUSPEND:
      case ModerationActionType.USER_BAN:
      case ModerationActionType.ACCOUNT_RESTRICT:
        // Update user account status
        await this.updateUserStatus(action);
        // Send notification to user
        await this.notifyUser(action);
        break;

      default:
        // For other action types, just log the action
        this.logger.info(
          `Applied moderation action: ${action.actionType} to user ${action.userId}`
        );
    }
  }

  /**
   * Revert a moderation action
   */
  private async revertAction(action: ModerationAction): Promise<void> {
    // Mark the action as inactive
    action.active = false;

    // Perform specific reversion steps based on action type
    switch (action.actionType) {
      case ModerationActionType.CONTENT_REMOVE:
      case ModerationActionType.CONTENT_HIDE:
        if (action.contentId && action.contentType) {
          // Restore content
          await this.restoreContent(action);
        }
        break;

      case ModerationActionType.USER_SUSPEND:
      case ModerationActionType.USER_BAN:
      case ModerationActionType.ACCOUNT_RESTRICT:
        // Restore user account status
        await this.restoreUserStatus(action);
        break;

      default:
        // For other action types, just log the reversion
        this.logger.info(
          `Reverted moderation action: ${action.actionType} for user ${action.userId}`
        );
    }

    // In a real implementation, this would update the action in the database
    this.metricsService.incrementCounter("moderation_action_reverted");
  }

  /**
   * Update content status based on moderation action
   */
  private async updateContentStatus(action: ModerationAction): Promise<void> {
    if (!action.contentId || !action.contentType) return;

    // Determine the new status based on action type
    let newStatus: ModerationStatus;
    switch (action.actionType) {
      case ModerationActionType.CONTENT_REMOVE:
        newStatus = ModerationStatus.REJECTED;
        break;
      case ModerationActionType.CONTENT_HIDE:
        newStatus = ModerationStatus.FLAGGED;
        break;
      case ModerationActionType.CONTENT_WARN:
        newStatus = ModerationStatus.APPROVED; // Approved with warning
        break;
      default:
        newStatus = ModerationStatus.PENDING;
    }

    // Update content moderation status
    // This delegates to ContentModerationService
    await this.contentModerationService.applyModerationDecision(
      action.contentId,
      action.contentType,
      action.actionType === ModerationActionType.CONTENT_REMOVE
        ? ModerationDecision.REJECT
        : action.actionType === ModerationActionType.CONTENT_WARN
          ? ModerationDecision.WARN
          : ModerationDecision.ESCALATE,
      action.moderatorId,
      action.comment
    );

    this.logger.info(
      `Updated content status for ${action.contentType}:${action.contentId} to ${newStatus}`
    );
  }

  /**
   * Restore content after a moderation action is reverted
   */
  private async restoreContent(action: ModerationAction): Promise<void> {
    if (!action.contentId || !action.contentType) return;

    // Apply approval decision to restore content
    await this.contentModerationService.applyModerationDecision(
      action.contentId,
      action.contentType,
      ModerationDecision.APPROVE,
      action.moderatorId,
      `Restored after moderation action reversal: ${action.id}`
    );

    this.logger.info(
      `Restored content ${action.contentType}:${action.contentId} after action reversal`
    );
  }

  /**
   * Update user status based on moderation action
   */
  private async updateUserStatus(action: ModerationAction): Promise<void> {
    // In a real implementation, this would update the user's account status in the database
    // For example, setting suspended until date, ban status, or restrictions

    this.logger.info(
      `Updated user ${action.userId} status to ${action.actionType}`
    );
  }

  /**
   * Restore user status after a moderation action is reverted
   */
  private async restoreUserStatus(action: ModerationAction): Promise<void> {
    // In a real implementation, this would restore the user's account status in the database

    this.logger.info(
      `Restored user ${action.userId} status after action reversal`
    );
  }

  /**
   * Send notification to user about a moderation action
   */
  private async notifyUser(action: ModerationAction): Promise<void> {
    // In a real implementation, this would send a notification to the user
    // using the NotificationService

    this.logger.info(
      `Notified user ${action.userId} about moderation action ${action.actionType}`
    );
  }

  /**
   * Get a moderation action by ID
   */
  private async getAction(actionId: string): Promise<ModerationAction | null> {
    // In a real implementation, this would query the database
    // For this example, returning a simulated action

    // Parse the numeric ID from the action ID string
    const idMatch = actionId.match(/\d+/);
    if (!idMatch) return null;

    const numericId = parseInt(idMatch[0]);
    const actionTypes = Object.values(ModerationActionType);
    const reasonTypes = Object.values(ModerationReason);

    return {
      id: actionId,
      actionType: actionTypes[numericId % actionTypes.length],
      userId: `user_${numericId % 10}`,
      moderatorId: `mod_${numericId % 5}`,
      reason: reasonTypes[numericId % reasonTypes.length],
      createdAt: new Date(Date.now() - numericId * 86400000), // days ago
      active: Math.random() > 0.3, // 70% chance of being active
    };
  }

  /**
   * Get an appeal by ID
   */
  private async getAppeal(appealId: string): Promise<Appeal | null> {
    // In a real implementation, this would query the database
    // For this example, returning a simulated appeal

    // Parse the numeric ID from the appeal ID string
    const idMatch = appealId.match(/\d+/);
    if (!idMatch) return null;

    const numericId = parseInt(idMatch[0]);
    const statusTypes = Object.values(AppealStatus);

    return {
      id: appealId,
      actionId: `action_${numericId}`,
      userId: `user_${numericId % 10}`,
      reason: "I believe this decision was made in error.",
      status: statusTypes[numericId % statusTypes.length],
      createdAt: new Date(Date.now() - numericId * 86400000), // days ago
    };
  }

  /**
   * Get an appeal by action ID
   */
  private async getAppealByActionId(actionId: string): Promise<Appeal | null> {
    // In a real implementation, this would query the database
    // For this example, returning a simulated appeal with 50% chance

    if (Math.random() > 0.5) return null;

    // Parse the numeric ID from the action ID string
    const idMatch = actionId.match(/\d+/);
    if (!idMatch) return null;

    const numericId = parseInt(idMatch[0]);

    return {
      id: `appeal_${numericId}`,
      actionId,
      userId: `user_${numericId % 10}`,
      reason: "I believe this decision was made in error.",
      status: AppealStatus.PENDING,
      createdAt: new Date(Date.now() - (numericId % 10) * 86400000), // days ago
    };
  }

  /**
   * Simulate getting a user's moderation actions
   */
  private async simulateGetUserActions(
    userId: string,
    includeInactive: boolean
  ): Promise<ModerationAction[]> {
    // Generate random number of actions
    const actionCount = Math.floor(Math.random() * 10) + 1;
    const actions: ModerationAction[] = [];

    const actionTypes = Object.values(ModerationActionType);
    const reasonTypes = Object.values(ModerationReason);
    const contentTypes = [EntityType.POST, EntityType.COMMENT];

    for (let i = 0; i < actionCount; i++) {
      const actionType = actionTypes[i % actionTypes.length];
      const active = Math.random() > 0.3; // 70% chance of being active

      // Skip inactive actions if not requested
      if (!active && !includeInactive) continue;

      // Content-related actions should have content IDs
      const isContentAction = [
        ModerationActionType.CONTENT_REMOVE,
        ModerationActionType.CONTENT_HIDE,
        ModerationActionType.CONTENT_WARN,
      ].includes(actionType);

      actions.push({
        id: `action_${i}`,
        actionType,
        userId,
        moderatorId: `mod_${i % 5}`,
        reason: reasonTypes[i % reasonTypes.length],
        comment: i % 2 === 0 ? "Violation of community guidelines" : undefined,
        createdAt: new Date(Date.now() - i * 86400000), // days ago
        contentId: isContentAction ? `content_${i}` : undefined,
        contentType: isContentAction
          ? contentTypes[i % contentTypes.length]
          : undefined,
        expiresAt:
          actionType === ModerationActionType.USER_SUSPEND
            ? new Date(Date.now() + 30 * 86400000) // 30 days in future
            : undefined,
        active,
      });
    }

    return actions;
  }
}
