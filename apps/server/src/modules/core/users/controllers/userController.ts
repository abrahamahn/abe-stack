import { Request, Response } from "express";
import { injectable, inject } from "inversify";

import { TYPES } from "@/server/types";

import {
  GetUsersResponseDto,
  ProfileCompletionDto,
  UpdatePasswordRequestDto,
  UpdatePasswordResponseDto,
  UpdatePreferencesResponseDto,
  UpdateProfileImageResponseDto,
  UpdateProfileRequestDto,
  UpdateProfileResponseDto,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
  UpdateUserRoleRequestDto,
  UpdateUserRoleResponseDto,
  UserDto,
  UserFilterParams,
  UserPreferencesDto,
  UserProfileDto,
  UserSearchParams,
  UserStatsDto,
  UpdateNotificationPreferencesRequestDto,
  UpdatePrivacyPreferencesRequestDto,
  ResetPreferencesResponseDto,
} from "../dtos";
import { UserService } from "../UserService";

@injectable()
export class UserController {
  constructor(@inject(TYPES.UserService) private userService: UserService) {}

  /**
   * Get users with filtering and pagination
   */
  async getUsers(
    req: Request<{}, {}, {}, UserFilterParams>,
    res: Response<GetUsersResponseDto>
  ): Promise<void> {
    try {
      const {
        role,
        isActive,
        isEmailVerified,
        createdAfter,
        createdBefore,
        search,
        orderBy = "createdAt",
        order = "desc",
        page = 1,
        limit = 10,
      } = req.query;

      const users = await this.userService.findUsers({
        role,
        isActive,
        isEmailVerified,
        createdAfter,
        createdBefore,
        search,
        orderBy,
        order,
        page: Number(page),
        limit: Number(limit),
      });

      const total = await this.userService.countUsers({
        role,
        isActive,
        isEmailVerified,
        createdAfter,
        createdBefore,
        search,
      });

      const totalPages = Math.ceil(total / Number(limit));

      res.status(200).json({
        users,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      });
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response<UserDto>): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new Error("No authenticated user found");
      }

      const userId = req.user.id;
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(404).json({
        id: "",
        username: "",
        email: "",
        role: "",
        createdAt: "",
        updatedAt: "",
        isActive: false,
        isEmailVerified: false,
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(
    req: Request<{ id: string }>,
    res: Response<UserDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);

      if (!user) {
        throw new Error("User not found");
      }

      res.status(200).json(user);
    } catch (error) {
      console.error(`Error getting user by ID ${req.params.id}:`, error);
      res.status(404).json({
        id: "",
        username: "",
        email: "",
        role: "",
        createdAt: "",
        updatedAt: "",
        isActive: false,
        isEmailVerified: false,
      });
    }
  }

  /**
   * Update user
   */
  async updateUser(
    req: Request<{ id: string }, {}, UpdateUserRequestDto>,
    res: Response<UpdateUserResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await this.userService.update(id, updateData);

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        user,
      });
    } catch (error) {
      console.error(`Error updating user ${req.params.id}:`, error);
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update user",
        user: {
          id: "",
          username: "",
          email: "",
          role: "",
          createdAt: "",
          updatedAt: "",
          isActive: false,
          isEmailVerified: false,
        },
      });
    }
  }

  /**
   * Delete user
   */
  async deleteUser(
    req: Request<{ id: string }>,
    res: Response<{ success: boolean; message: string }>
  ): Promise<void> {
    try {
      const { id } = req.params;

      await this.userService.delete(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error(`Error deleting user ${req.params.id}:`, error);
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete user",
      });
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(
    req: Request<{ id: string }, {}, UpdateUserRoleRequestDto>,
    res: Response<UpdateUserRoleResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      await this.userService.updateRole(id, role);

      res.status(200).json({
        success: true,
        message: `User role updated to ${role} successfully`,
      });
    } catch (error) {
      console.error(`Error updating role for user ${req.params.id}:`, error);
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update user role",
      });
    }
  }

  /**
   * Update password
   */
  async updatePassword(
    req: Request<{ id: string }, {}, UpdatePasswordRequestDto>,
    res: Response<UpdatePasswordResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        throw new Error("New password and confirmation do not match");
      }

      await this.userService.updatePassword(id, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error(
        `Error updating password for user ${req.params.id}:`,
        error
      );
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update password",
      });
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(
    req: Request<{ id: string }>,
    res: Response<UserProfileDto>
  ): Promise<void> {
    try {
      const { id } = req.params;

      const profile = await this.userService.getUserProfile(id);

      if (!profile) {
        throw new Error("User profile not found");
      }

      res.status(200).json(profile);
    } catch (error) {
      console.error(`Error getting profile for user ${req.params.id}:`, error);
      res.status(404).json({
        id: "",
        userId: "",
        createdAt: "",
        updatedAt: "",
      });
    }
  }

  /**
   * Update profile
   */
  async updateProfile(
    req: Request<{ id: string }, {}, UpdateProfileRequestDto>,
    res: Response<UpdateProfileResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const profileData = req.body;

      const profile = await this.userService.updateProfile(id, profileData);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        profile,
      });
    } catch (error) {
      console.error(`Error updating profile for user ${req.params.id}:`, error);
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update profile",
        profile: {
          id: "",
          userId: "",
          createdAt: "",
          updatedAt: "",
        },
      });
    }
  }

  /**
   * Update profile image
   */
  async updateProfileImage(
    req: Request<{ id: string }>,
    res: Response<UpdateProfileImageResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        throw new Error("No image file uploaded");
      }

      const imageUrl = await this.userService.updateProfileImage(id, file);

      res.status(200).json({
        success: true,
        message: "Profile image updated successfully",
        imageUrl,
      });
    } catch (error) {
      console.error(
        `Error updating profile image for user ${req.params.id}:`,
        error
      );
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update profile image",
        imageUrl: "",
      });
    }
  }

  /**
   * Get profile completion
   */
  async getProfileCompletion(
    req: Request<{ id: string }>,
    res: Response<ProfileCompletionDto>
  ): Promise<void> {
    try {
      const { id } = req.params;

      const completion = await this.userService.getProfileCompletion(id);

      res.status(200).json(completion);
    } catch (error) {
      console.error(
        `Error getting profile completion for user ${req.params.id}:`,
        error
      );
      res.status(404).json({
        userId: "",
        completionPercentage: 0,
        completedSections: [],
        missingSections: [],
        suggestions: [],
      });
    }
  }

  /**
   * Search users
   */
  async searchUsers(
    req: Request<{}, {}, {}, UserSearchParams>,
    res: Response<GetUsersResponseDto>
  ): Promise<void> {
    try {
      const { query, location, skills, page = 1, limit = 10 } = req.query;

      const users = await this.userService.searchUsers({
        query,
        location,
        skills,
        page: Number(page),
        limit: Number(limit),
      });

      const total = await this.userService.countSearchResults({
        query,
        location,
        skills,
      });

      const totalPages = Math.ceil(total / Number(limit));

      res.status(200).json({
        users,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      });
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    }
  }

  /**
   * Get user stats
   */
  async getUserStats(
    req: Request<{ userId: string }>,
    res: Response<UserStatsDto>
  ): Promise<void> {
    try {
      const { userId } = req.params;

      const stats = await this.userService.getUserStats(userId);

      res.status(200).json(stats);
    } catch (error) {
      console.error(
        `Error getting stats for user ${req.params.userId}:`,
        error
      );
      res.status(404).json({
        userId: "",
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        lastActive: "",
        joinedAt: "",
        engagementRate: 0,
      });
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(
    req: Request<{ id: string }>,
    res: Response<UserPreferencesDto>
  ): Promise<void> {
    try {
      const { id } = req.params;

      const preferences = await this.userService.getUserPreferences(id);

      if (!preferences) {
        throw new Error("User preferences not found");
      }

      res.status(200).json(preferences);
    } catch (error) {
      console.error(
        `Error getting preferences for user ${req.params.id}:`,
        error
      );
      res.status(404).json({
        id: "",
        userId: "",
        theme: "light",
        language: "en",
        timezone: "UTC",
        notifications: {
          email: false,
          push: false,
          sms: false,
          emailMarketing: false,
          emailUpdates: false,
          emailSecurity: false,
        },
        privacy: {
          profileVisibility: "public",
          showEmail: false,
          showLocation: false,
          allowSearchByEmail: false,
          allowSearchByPhone: false,
        },
        createdAt: "",
        updatedAt: "",
      });
    }
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    req: Request<{ id: string }, {}, Partial<UserPreferencesDto>>,
    res: Response<UpdatePreferencesResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const preferencesData = req.body;

      const preferences = await this.userService.updatePreferences(
        id,
        preferencesData
      );

      res.status(200).json({
        success: true,
        message: "Preferences updated successfully",
        preferences,
      });
    } catch (error) {
      console.error(
        `Error updating preferences for user ${req.params.id}:`,
        error
      );
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update preferences",
        preferences: {
          id: "",
          userId: "",
          theme: "light",
          language: "en",
          timezone: "UTC",
          notifications: {
            email: false,
            push: false,
            sms: false,
            emailMarketing: false,
            emailUpdates: false,
            emailSecurity: false,
          },
          privacy: {
            profileVisibility: "public",
            showEmail: false,
            showLocation: false,
            allowSearchByEmail: false,
            allowSearchByPhone: false,
          },
          createdAt: "",
          updatedAt: "",
        },
      });
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    req: Request<{ id: string }, {}, UpdateNotificationPreferencesRequestDto>,
    res: Response<UpdatePreferencesResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const notificationPreferences = req.body;

      // Get current preferences
      const currentPreferences = await this.userService.getUserPreferences(id);

      if (!currentPreferences) {
        throw new Error("User preferences not found");
      }

      // Update only the notification section
      const updatedPreferences = {
        ...currentPreferences,
        notifications: {
          ...currentPreferences.notifications,
          ...notificationPreferences,
        },
      };

      const preferences = await this.userService.updatePreferences(
        id,
        updatedPreferences
      );

      res.status(200).json({
        success: true,
        message: "Notification preferences updated successfully",
        preferences,
      });
    } catch (error) {
      console.error(
        `Error updating notification preferences for user ${req.params.id}:`,
        error
      );
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update notification preferences",
        preferences: {
          id: "",
          userId: "",
          theme: "light",
          language: "en",
          timezone: "UTC",
          notifications: {
            email: false,
            push: false,
            sms: false,
            emailMarketing: false,
            emailUpdates: false,
            emailSecurity: false,
          },
          privacy: {
            profileVisibility: "public",
            showEmail: false,
            showLocation: false,
            allowSearchByEmail: false,
            allowSearchByPhone: false,
          },
          createdAt: "",
          updatedAt: "",
        },
      });
    }
  }

  /**
   * Update privacy preferences
   */
  async updatePrivacyPreferences(
    req: Request<{ id: string }, {}, UpdatePrivacyPreferencesRequestDto>,
    res: Response<UpdatePreferencesResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;
      const privacyPreferences = req.body;

      // Get current preferences
      const currentPreferences = await this.userService.getUserPreferences(id);

      if (!currentPreferences) {
        throw new Error("User preferences not found");
      }

      // Update only the privacy section
      const updatedPreferences = {
        ...currentPreferences,
        privacy: {
          ...currentPreferences.privacy,
          ...privacyPreferences,
        },
      };

      const preferences = await this.userService.updatePreferences(
        id,
        updatedPreferences
      );

      res.status(200).json({
        success: true,
        message: "Privacy preferences updated successfully",
        preferences,
      });
    } catch (error) {
      console.error(
        `Error updating privacy preferences for user ${req.params.id}:`,
        error
      );
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update privacy preferences",
        preferences: {
          id: "",
          userId: "",
          theme: "light",
          language: "en",
          timezone: "UTC",
          notifications: {
            email: false,
            push: false,
            sms: false,
            emailMarketing: false,
            emailUpdates: false,
            emailSecurity: false,
          },
          privacy: {
            profileVisibility: "public",
            showEmail: false,
            showLocation: false,
            allowSearchByEmail: false,
            allowSearchByPhone: false,
          },
          createdAt: "",
          updatedAt: "",
        },
      });
    }
  }

  /**
   * Reset preferences
   */
  async resetPreferences(
    req: Request<{ id: string }>,
    res: Response<ResetPreferencesResponseDto>
  ): Promise<void> {
    try {
      const { id } = req.params;

      const defaultPreferences = {
        theme: "light",
        language: "en",
        timezone: "UTC",
        notifications: {
          email: true,
          push: true,
          sms: false,
          emailMarketing: false,
          emailUpdates: true,
          emailSecurity: true,
        },
        privacy: {
          profileVisibility: "public",
          showEmail: false,
          showLocation: true,
          allowSearchByEmail: true,
          allowSearchByPhone: false,
        },
      };

      const preferences = await this.userService.updatePreferences(
        id,
        defaultPreferences
      );

      res.status(200).json({
        success: true,
        message: "Preferences reset to defaults successfully",
        preferences,
      });
    } catch (error) {
      console.error(
        `Error resetting preferences for user ${req.params.id}:`,
        error
      );
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to reset preferences",
        preferences: {
          id: "",
          userId: "",
          theme: "light",
          language: "en",
          timezone: "UTC",
          notifications: {
            email: false,
            push: false,
            sms: false,
            emailMarketing: false,
            emailUpdates: false,
            emailSecurity: false,
          },
          privacy: {
            profileVisibility: "public",
            showEmail: false,
            showLocation: false,
            allowSearchByEmail: false,
            allowSearchByPhone: false,
          },
          createdAt: "",
          updatedAt: "",
        },
      });
    }
  }
}
