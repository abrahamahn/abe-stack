import { BaseModel } from "../../base/baseModel";

/**
 * Interface for the UserPreference model
 */
export interface UserPreferenceInterface {
  /**
   * Unique identifier for the preference
   */
  id: string;

  /**
   * User ID associated with preference
   */
  userId: string;

  /**
   * UI theme preference
   */
  theme: string;

  /**
   * Language preference
   */
  language: string;

  /**
   * Timezone preference
   */
  timezone: string;

  /**
   * Notification settings
   */
  notifications: {
    /**
     * Email notifications enabled
     */
    email: boolean;

    /**
     * Push notifications enabled
     */
    push: boolean;

    /**
     * SMS notifications enabled
     */
    sms: boolean;

    /**
     * Marketing email notifications enabled
     */
    emailMarketing: boolean;

    /**
     * System updates email notifications enabled
     */
    emailUpdates: boolean;

    /**
     * Security alerts email notifications enabled
     */
    emailSecurity: boolean;
  };

  /**
   * Privacy settings
   */
  privacy: {
    /**
     * Profile visibility setting
     */
    profileVisibility: "public" | "private" | "connections";

    /**
     * Whether to show email publicly
     */
    showEmail: boolean;

    /**
     * Whether to show location publicly
     */
    showLocation: boolean;

    /**
     * Allow others to find user by email
     */
    allowSearchByEmail: boolean;

    /**
     * Allow others to find user by phone
     */
    allowSearchByPhone: boolean;
  };

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * UserPreference class for managing user preferences
 */
export class UserPreference
  extends BaseModel
  implements UserPreferenceInterface
{
  public id: string;
  public userId: string;
  public theme: string;
  public language: string;
  public timezone: string;
  public notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    emailMarketing: boolean;
    emailUpdates: boolean;
    emailSecurity: boolean;
  };
  public privacy: {
    profileVisibility: "public" | "private" | "connections";
    showEmail: boolean;
    showLocation: boolean;
    allowSearchByEmail: boolean;
    allowSearchByPhone: boolean;
  };
  public createdAt: Date;
  public updatedAt: Date;

  /**
   * Creates a new UserPreference instance
   */
  constructor(data: Partial<UserPreferenceInterface> = {}) {
    super();
    this.id = data.id || this.generateId();
    this.userId = data.userId || "";
    this.theme = data.theme || "light";
    this.language = data.language || "en";
    this.timezone = data.timezone || "UTC";
    this.notifications = {
      email: data.notifications?.email ?? true,
      push: data.notifications?.push ?? true,
      sms: data.notifications?.sms ?? false,
      emailMarketing: data.notifications?.emailMarketing ?? false,
      emailUpdates: data.notifications?.emailUpdates ?? true,
      emailSecurity: data.notifications?.emailSecurity ?? true,
    };
    this.privacy = {
      profileVisibility: data.privacy?.profileVisibility || "public",
      showEmail: data.privacy?.showEmail ?? false,
      showLocation: data.privacy?.showLocation ?? true,
      allowSearchByEmail: data.privacy?.allowSearchByEmail ?? true,
      allowSearchByPhone: data.privacy?.allowSearchByPhone ?? false,
    };
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  /**
   * Validates the UserPreference object
   * @returns Array of validation errors
   */
  public validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.userId) {
      errors.push({
        field: "userId",
        message: "User ID is required",
        code: "REQUIRED",
      });
    }

    if (!this.theme) {
      errors.push({
        field: "theme",
        message: "Theme is required",
        code: "REQUIRED",
      });
    }

    if (!this.language) {
      errors.push({
        field: "language",
        message: "Language is required",
        code: "REQUIRED",
      });
    }

    if (!this.timezone) {
      errors.push({
        field: "timezone",
        message: "Timezone is required",
        code: "REQUIRED",
      });
    }

    return errors;
  }

  /**
   * Convert model to string representation
   */
  public toString(): string {
    return `UserPreference [id=${this.id}, userId=${this.userId}, theme=${this.theme}]`;
  }

  /**
   * Gets the default preferences for a new user
   * @param userId - User ID to create preferences for
   * @returns Default UserPreference object
   */
  public static getDefaults(userId: string): UserPreference {
    return new UserPreference({
      userId,
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
    });
  }

  /**
   * Updates the UserPreference with new data
   * @param data - Partial UserPreference data to update
   * @returns Updated UserPreference
   */
  public update(data: Partial<UserPreferenceInterface>): UserPreference {
    if (data.theme) this.theme = data.theme;
    if (data.language) this.language = data.language;
    if (data.timezone) this.timezone = data.timezone;

    if (data.notifications) {
      this.notifications = {
        ...this.notifications,
        ...(data.notifications || {}),
      };
    }

    if (data.privacy) {
      this.privacy = {
        ...this.privacy,
        ...(data.privacy || {}),
      };
    }

    this.updatedAt = new Date();
    return this;
  }

  /**
   * Converts UserPreference object to JSON
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      theme: this.theme,
      language: this.language,
      timezone: this.timezone,
      notifications: this.notifications,
      privacy: this.privacy,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
