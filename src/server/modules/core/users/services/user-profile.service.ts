import { User } from "./User";
import { BaseService } from "../../base/baseService";

/**
 * User profile data interface
 */
export interface UserProfile {
  /**
   * User ID
   */
  userId: string;

  /**
   * Display name
   */
  displayName?: string;

  /**
   * First name
   */
  firstName?: string;

  /**
   * Last name
   */
  lastName?: string;

  /**
   * Biography or about information
   */
  bio?: string;

  /**
   * Avatar URL
   */
  avatarUrl?: string;

  /**
   * Phone number
   */
  phone?: string;

  /**
   * Website
   */
  website?: string;

  /**
   * Location
   */
  location?: string;

  /**
   * User timezone
   */
  timezone?: string;

  /**
   * Language preference
   */
  language?: string;

  /**
   * Custom fields
   */
  customFields?: Record<string, any>;

  /**
   * Date profile was created
   */
  createdAt: Date;

  /**
   * Date profile was last updated
   */
  updatedAt: Date;
}

/**
 * Profile update options
 */
export interface ProfileUpdateOptions {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
  website?: string;
  location?: string;
  timezone?: string;
  language?: string;
  customFields?: Record<string, any>;
}

/**
 * Service for managing user profiles
 */
export class UserProfileService extends BaseService {
  /**
   * In-memory store for profiles
   * @private
   */
  private profiles: Map<string, UserProfile>;

  /**
   * Constructor
   */
  constructor() {
    super();
    this.profiles = new Map<string, UserProfile>();
  }

  /**
   * Get a user's profile
   * @param userId - User ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  /**
   * Create a profile for a user
   * @param user - User object
   * @param options - Profile options
   */
  async createProfile(
    user: User,
    options: ProfileUpdateOptions = {}
  ): Promise<UserProfile> {
    if (this.profiles.has(user.id)) {
      throw new Error(`Profile already exists for user ${user.id}`);
    }

    const now = new Date();

    const profile: UserProfile = {
      userId: user.id,
      displayName:
        options.displayName || this.generateDisplayName(user, options),
      firstName: options.firstName,
      lastName: options.lastName,
      bio: options.bio,
      avatarUrl: options.avatarUrl,
      phone: options.phone,
      website: options.website,
      location: options.location,
      timezone: options.timezone || "UTC",
      language: options.language || "en",
      customFields: options.customFields || {},
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(user.id, profile);
    return profile;
  }

  /**
   * Update a user's profile
   * @param userId - User ID
   * @param options - Profile update options
   */
  async updateProfile(
    userId: string,
    options: ProfileUpdateOptions
  ): Promise<UserProfile | null> {
    const profile = this.profiles.get(userId);

    if (!profile) {
      return null;
    }

    // Update profile fields
    if (options.firstName !== undefined) profile.firstName = options.firstName;
    if (options.lastName !== undefined) profile.lastName = options.lastName;
    if (options.displayName !== undefined)
      profile.displayName = options.displayName;
    if (options.bio !== undefined) profile.bio = options.bio;
    if (options.avatarUrl !== undefined) profile.avatarUrl = options.avatarUrl;
    if (options.phone !== undefined) profile.phone = options.phone;
    if (options.website !== undefined) profile.website = options.website;
    if (options.location !== undefined) profile.location = options.location;
    if (options.timezone !== undefined) profile.timezone = options.timezone;
    if (options.language !== undefined) profile.language = options.language;

    // For custom fields, merge with existing
    if (options.customFields) {
      profile.customFields = {
        ...profile.customFields,
        ...options.customFields,
      };
    }

    // Update timestamp
    profile.updatedAt = new Date();

    // If display name was not explicitly set but name components changed,
    // regenerate the display name
    if (
      options.displayName === undefined &&
      (options.firstName !== undefined || options.lastName !== undefined)
    ) {
      const user: Partial<User> = { email: "" }; // Minimal user object for display name generation
      profile.displayName = this.generateDisplayName(user as User, {
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    }

    // Save updated profile
    this.profiles.set(userId, profile);

    return profile;
  }

  /**
   * Generate a display name for a user
   * @param user - User object
   * @param options - Profile options with name components
   */
  private generateDisplayName(
    user: User,
    options: { firstName?: string; lastName?: string }
  ): string {
    if (options.firstName && options.lastName) {
      return `${options.firstName} ${options.lastName}`;
    }

    if (options.firstName) {
      return options.firstName;
    }

    if (options.lastName) {
      return options.lastName;
    }

    // Fall back to email username
    if (user.email) {
      return user.email.split("@")[0];
    }

    // Last resort
    return `User_${user.id.substring(0, 8)}`;
  }
}
