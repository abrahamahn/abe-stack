import NodeCache from "node-cache";
import sanitizeHtml from "sanitize-html";

import { User, UserAttributes } from "@models/auth";
import { UserRepository } from "@repositories/auth";
import { Logger } from "@services/dev/logger/LoggerService";

import { UserService } from "./UserService";

/**
 * Interface for profile validation rules
 */
interface ProfileValidationRules {
  minLength: number;
  maxLength: number;
  allowedTags?: string[];
  allowedAttributes?: { [key: string]: string[] };
}

/**
 * Interface for profile analytics
 */
interface ProfileAnalytics {
  totalProfiles: number;
  averageCompletionRate: number;
  completionByField: Record<string, number>;
  profileUpdatesLastWeek: number;
  mostCommonFields: Array<{ field: string; count: number }>;
  missingFieldsDistribution: Record<string, number>;
}

/**
 * Service responsible for user profile operations.
 * This service handles:
 * 1. Profile data management (display name, bio, etc.)
 * 2. Profile image management
 * 3. Profile visibility and privacy
 * 4. Profile completion status
 * 5. Profile validation and sanitization
 * 6. Profile analytics
 */
export class ProfileService {
  private logger: Logger;
  private cache: NodeCache;
  private readonly validationRules: Record<
    keyof UserAttributes,
    ProfileValidationRules
  > = {
    displayName: { minLength: 2, maxLength: 50 },
    firstName: { minLength: 2, maxLength: 50 },
    lastName: { minLength: 2, maxLength: 50 },
    bio: {
      minLength: 0,
      maxLength: 500,
      allowedTags: ["b", "i", "em", "strong", "a"],
      allowedAttributes: {
        a: ["href", "title"],
      },
    },
    profileImage: { minLength: 0, maxLength: 255 },
    bannerImage: { minLength: 0, maxLength: 255 },
  };

  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
  ) {
    this.logger = new Logger("ProfileService");
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
  }

  /**
   * Get a user's public profile with caching
   * @param userId The user ID
   * @returns The user's public profile or null if not found
   */
  async getProfile(userId: string): Promise<Partial<User> | null> {
    this.logger.debug("Getting user profile", { userId });

    const cacheKey = `profile:${userId}`;
    const cachedProfile = this.cache.get<Partial<User>>(cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      this.logger.warn("User not found for profile retrieval", { userId });
      return null;
    }

    // Return only public profile fields
    const profile = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profileImage: user.profileImage,
      bannerImage: user.bannerImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    this.cache.set(cacheKey, profile);
    return profile;
  }

  /**
   * Update profile information with validation and sanitization
   * @param userId The user ID
   * @param profileData The profile data to update
   * @returns The updated profile or null if not found
   * @throws Error if validation fails
   */
  async updateProfile(
    userId: string,
    profileData: Partial<UserAttributes>,
  ): Promise<User | null> {
    this.logger.debug("Updating user profile", { userId, profileData });

    // Only allow updating profile-specific fields
    const allowedFields: (keyof UserAttributes)[] = [
      "displayName",
      "firstName",
      "lastName",
      "bio",
      "profileImage",
      "bannerImage",
    ];

    // Validate and sanitize each field
    const sanitizedData = Object.keys(profileData).reduce((acc, key) => {
      if (allowedFields.includes(key as keyof UserAttributes)) {
        const value = profileData[key as keyof UserAttributes];
        if (value !== undefined) {
          // Validate field
          this.validateField(key as keyof UserAttributes, value);
          // Sanitize field
          acc[key] = this.sanitizeField(key as keyof UserAttributes, value);
        }
      }
      return acc;
    }, {} as Partial<UserAttributes>);

    const updatedUser = await this.userService.updateProfile(
      userId,
      sanitizedData,
    );
    if (updatedUser) {
      this.cache.del(`profile:${userId}`);
    }

    return updatedUser;
  }

  /**
   * Update profile image
   * @param userId The user ID
   * @param imageUrl The new profile image URL
   * @returns The updated profile or null if not found
   */
  async updateProfileImage(
    userId: string,
    imageUrl: string,
  ): Promise<User | null> {
    this.logger.debug("Updating profile image", { userId, imageUrl });
    return this.updateProfile(userId, { profileImage: imageUrl });
  }

  /**
   * Update banner image
   * @param userId The user ID
   * @param imageUrl The new banner image URL
   * @returns The updated profile or null if not found
   */
  async updateBannerImage(
    userId: string,
    imageUrl: string,
  ): Promise<User | null> {
    this.logger.debug("Updating banner image", { userId, imageUrl });
    return this.updateProfile(userId, { bannerImage: imageUrl });
  }

  /**
   * Check profile completion status with detailed feedback
   * @param userId The user ID
   * @returns Object containing completion status and missing fields
   */
  async getProfileCompletionStatus(userId: string): Promise<{
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
    recommendations: string[];
    fieldStatus: Record<string, { complete: boolean; recommendation?: string }>;
  }> {
    this.logger.debug("Checking profile completion status", { userId });

    const user = await this.userService.getUserById(userId);
    if (!user) {
      this.logger.warn("User not found for completion status check", {
        userId,
      });
      throw new Error("User not found");
    }

    const requiredFields: (keyof UserAttributes)[] = [
      "displayName",
      "firstName",
      "lastName",
      "bio",
      "profileImage",
    ];

    const fieldStatus: Record<
      string,
      { complete: boolean; recommendation?: string }
    > = {};
    const recommendations: string[] = [];

    requiredFields.forEach((field) => {
      const value = user[field];
      const isComplete = !!value;
      fieldStatus[field] = { complete: isComplete };

      if (!isComplete) {
        const recommendation = this.getFieldRecommendation(field);
        fieldStatus[field].recommendation = recommendation;
        recommendations.push(recommendation);
      }
    });

    const missingFields = requiredFields.filter((field) => !user[field]);
    const completedFields = requiredFields.length - missingFields.length;
    const completionPercentage =
      (completedFields / requiredFields.length) * 100;

    return {
      isComplete: missingFields.length === 0,
      missingFields: missingFields.map((field) => field.toString()),
      completionPercentage,
      recommendations,
      fieldStatus,
    };
  }

  /**
   * Get multiple user profiles with caching
   * @param userIds Array of user IDs
   * @returns Array of public profiles
   */
  async getProfiles(userIds: string[]): Promise<Partial<User>[]> {
    this.logger.debug("Getting multiple user profiles", { userIds });

    const profiles = await Promise.all(
      userIds.map(async (id) => {
        try {
          return await this.getProfile(id);
        } catch (error) {
          this.logger.error("Error getting profile", { id, error });
          return null;
        }
      }),
    );

    return profiles.filter(
      (profile): profile is Partial<User> => profile !== null,
    );
  }

  /**
   * Search profiles by name or username with improved matching
   * @param query The search query
   * @param options Search options
   * @returns Array of matching profiles
   */
  async searchProfiles(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: "relevance" | "name" | "recent";
      includeInactive?: boolean;
    } = {},
  ): Promise<{
    profiles: Partial<User>[];
    total: number;
    hasMore: boolean;
  }> {
    this.logger.debug("Searching profiles", { query, options });

    const {
      limit = 10,
      offset = 0,
      sortBy = "relevance",
      includeInactive = false,
    } = options;

    // Normalize query
    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);

    // Get all users
    const users = await this.userRepository.findAll();

    // Filter and score users based on search criteria
    const scoredUsers = users
      .filter((user) => includeInactive || user.isActive)
      .map((user) => {
        const searchableFields = {
          username: user.username.toLowerCase(),
          displayName: (user.displayName || "").toLowerCase(),
          firstName: (user.firstName || "").toLowerCase(),
          lastName: (user.lastName || "").toLowerCase(),
        };

        // Calculate match score
        let score = 0;
        queryWords.forEach((word) => {
          if (searchableFields.username.includes(word)) score += 3;
          if (searchableFields.displayName.includes(word)) score += 2;
          if (searchableFields.firstName.includes(word)) score += 1;
          if (searchableFields.lastName.includes(word)) score += 1;
          if (searchableFields.username === word) score += 5;
          if (searchableFields.displayName === word) score += 4;
        });

        return { user, score };
      })
      .filter(({ score }) => score > 0);

    // Sort results
    switch (sortBy) {
      case "name":
        scoredUsers.sort(
          (a, b) =>
            a.user.displayName?.localeCompare(b.user.displayName || "") || 0,
        );
        break;
      case "recent":
        scoredUsers.sort(
          (a, b) =>
            (b.user.updatedAt?.getTime() || 0) -
            (a.user.updatedAt?.getTime() || 0),
        );
        break;
      case "relevance":
      default:
        scoredUsers.sort((a, b) => b.score - a.score);
    }

    // Apply pagination
    const total = scoredUsers.length;
    const paginatedUsers = scoredUsers.slice(offset, offset + limit);

    // Convert to public profiles
    const profiles = paginatedUsers.map(({ user }) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profileImage: user.profileImage,
      bannerImage: user.bannerImage,
    }));

    return {
      profiles,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get profile analytics
   * @returns Profile analytics data
   */
  async getProfileAnalytics(): Promise<ProfileAnalytics> {
    this.logger.debug("Getting profile analytics");

    const users = await this.userRepository.findAll();
    const profileFields = [
      "displayName",
      "firstName",
      "lastName",
      "bio",
      "profileImage",
    ];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let totalCompletionRate = 0;
    const completionByField: Record<string, number> = {};
    const missingFieldsDistribution: Record<string, number> = {};
    const fieldCounts: Record<string, number> = {};

    users.forEach((user) => {
      let userCompletionCount = 0;

      profileFields.forEach((field) => {
        if (user[field]) {
          userCompletionCount++;
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        } else {
          missingFieldsDistribution[field] =
            (missingFieldsDistribution[field] || 0) + 1;
        }
      });

      const userCompletionRate =
        (userCompletionCount / profileFields.length) * 100;
      totalCompletionRate += userCompletionRate;
    });

    profileFields.forEach((field) => {
      completionByField[field] =
        ((fieldCounts[field] || 0) / users.length) * 100;
    });

    const mostCommonFields = Object.entries(fieldCounts)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalProfiles: users.length,
      averageCompletionRate: totalCompletionRate / users.length,
      completionByField,
      profileUpdatesLastWeek: users.filter(
        (user) => user.updatedAt && user.updatedAt > weekAgo,
      ).length,
      mostCommonFields,
      missingFieldsDistribution,
    };
  }

  /**
   * Export user profile data
   * @param userId The user ID
   * @returns Exported profile data
   */
  async exportProfile(userId: string): Promise<object> {
    this.logger.debug("Exporting user profile", { userId });

    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    return {
      profile,
      exportedAt: new Date(),
      version: "1.0",
    };
  }

  /**
   * Import user profile data
   * @param userId The user ID
   * @param data The profile data to import
   * @returns Updated profile
   */
  async importProfile(
    userId: string,
    data: { profile: Partial<UserAttributes>; version?: string },
  ): Promise<User | null> {
    this.logger.debug("Importing user profile", { userId });

    if (!data.profile) {
      throw new Error("Invalid profile data format");
    }

    return this.updateProfile(userId, data.profile);
  }

  /**
   * Validate a profile field
   * @param field The field to validate
   * @param value The value to validate
   * @throws Error if validation fails
   */
  private validateField(
    field: keyof UserAttributes,
    value: UserAttributes[keyof UserAttributes],
  ): void {
    const rules = this.validationRules[field];
    if (!rules) return;

    if (typeof value === "string") {
      if (value.length < rules.minLength) {
        throw new Error(
          `${field} must be at least ${rules.minLength} characters long`,
        );
      }
      if (value.length > rules.maxLength) {
        throw new Error(
          `${field} must be at most ${rules.maxLength} characters long`,
        );
      }
    }
  }

  /**
   * Sanitize a profile field
   * @param field The field to sanitize
   * @param value The value to sanitize
   * @returns Sanitized value
   */
  private sanitizeField(
    field: keyof UserAttributes,
    value: UserAttributes[keyof UserAttributes],
  ): UserAttributes[keyof UserAttributes] {
    if (typeof value !== "string") return value;

    const rules = this.validationRules[field];
    if (!rules) return value;

    if (rules.allowedTags) {
      return sanitizeHtml(value, {
        allowedTags: rules.allowedTags,
        allowedAttributes: rules.allowedAttributes || {},
      });
    }

    // For non-HTML fields, remove all HTML tags
    return value.replace(/<[^>]*>/g, "");
  }

  /**
   * Get recommendation for a profile field
   * @param field The field to get recommendation for
   * @returns Recommendation message
   */
  private getFieldRecommendation(field: keyof UserAttributes): string {
    switch (field) {
      case "displayName":
        return "Add a display name to make your profile more personalized";
      case "firstName":
        return "Add your first name to help others identify you";
      case "lastName":
        return "Add your last name to complete your identity";
      case "bio":
        return "Write a short bio to tell others about yourself";
      case "profileImage":
        return "Upload a profile picture to make your profile more engaging";
      default:
        return `Complete your ${field} to improve your profile`;
    }
  }
}
