import { injectable, inject } from "inversify";

import { UserPreference, UserPreferenceInterface } from "./UserPreference";
import { UserPreferenceRepository } from "./UserPreferenceRepository";
import { TYPES } from "../../../infrastructure/di/types";

import type { ILoggerService } from "../../../infrastructure/logging";

/**
 * Service for managing user preferences
 */
@injectable()
export class UserPreferenceService {
  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.UserPreferencesRepository)
    private preferenceRepository: UserPreferenceRepository
  ) {}

  /**
   * Get preferences for a user
   * @param userId - User ID to get preferences for
   * @returns User preferences or default preferences if not found
   */
  public async getPreferences(userId: string): Promise<UserPreference> {
    try {
      const preferences = await this.preferenceRepository.findByUserId(userId);

      if (!preferences) {
        return this.createDefaultPreferences(userId);
      }

      return preferences;
    } catch (error) {
      this.logger.error(`Error getting preferences for user ${userId}:`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create default preferences for a user
   * @param userId - User ID to create preferences for
   * @returns Created preferences
   */
  public async createDefaultPreferences(
    userId: string
  ): Promise<UserPreference> {
    try {
      return await this.preferenceRepository.createForUser(userId);
    } catch (error) {
      this.logger.error(
        `Error creating default preferences for user ${userId}:`,
        {
          error,
          userId,
        }
      );
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param userId - User ID to update preferences for
   * @param data - Preference data to update
   * @returns Updated preferences
   */
  public async updatePreferences(
    userId: string,
    data: Partial<UserPreferenceInterface>
  ): Promise<UserPreference> {
    try {
      return await this.preferenceRepository.updateForUser(userId, data);
    } catch (error) {
      this.logger.error(`Error updating preferences for user ${userId}:`, {
        error,
        userId,
        data,
      });
      throw error;
    }
  }

  /**
   * Update just notification preferences
   * @param userId - User ID to update
   * @param notifications - Notification settings to update
   * @returns Updated preferences
   */
  public async updateNotificationPreferences(
    userId: string,
    notifications: Partial<UserPreferenceInterface["notifications"]>
  ): Promise<UserPreference> {
    try {
      const currentPreferences = await this.getPreferences(userId);

      const updatedNotifications = {
        ...currentPreferences.notifications,
        ...notifications,
      };

      return this.updatePreferences(userId, {
        notifications: updatedNotifications,
      });
    } catch (error) {
      this.logger.error(
        `Error updating notification preferences for user ${userId}:`,
        {
          error,
          userId,
          notifications,
        }
      );
      throw error;
    }
  }

  /**
   * Update just privacy preferences
   * @param userId - User ID to update
   * @param privacy - Privacy settings to update
   * @returns Updated preferences
   */
  public async updatePrivacyPreferences(
    userId: string,
    privacy: Partial<UserPreferenceInterface["privacy"]>
  ): Promise<UserPreference> {
    try {
      const currentPreferences = await this.getPreferences(userId);

      const updatedPrivacy = {
        ...currentPreferences.privacy,
        ...privacy,
      };

      return this.updatePreferences(userId, { privacy: updatedPrivacy });
    } catch (error) {
      this.logger.error(
        `Error updating privacy preferences for user ${userId}:`,
        {
          error,
          userId,
          privacy,
        }
      );
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   * @param userId - User ID to reset preferences for
   * @returns Reset preferences
   */
  public async resetPreferences(userId: string): Promise<UserPreference> {
    try {
      return await this.preferenceRepository.resetForUser(userId);
    } catch (error) {
      this.logger.error(`Error resetting preferences for user ${userId}:`, {
        error,
        userId,
      });
      throw error;
    }
  }
}
