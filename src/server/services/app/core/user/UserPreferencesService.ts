import NodeCache from "node-cache";

import { UserPreferences, UserPreferencesAttributes } from "@models/auth";
import { UserPreferencesRepository } from "@repositories/auth";
import { Logger } from "@services/dev/logger";

import { UserService } from "./UserService";

/**
 * Interface for user notification preferences
 */
interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  mentionNotifications: boolean;
  commentNotifications: boolean;
  followNotifications: boolean;
  messageNotifications: boolean;
  emailDigestFrequency: "never" | "daily" | "weekly" | "monthly";
  notificationSound: boolean;
  desktopNotifications: boolean;
}

/**
 * Interface for user privacy preferences
 */
interface PrivacyPreferences {
  profileVisibility: "public" | "private" | "friends";
  showOnlineStatus: boolean;
  allowMessagesFrom: "everyone" | "friends" | "none";
  showActivityStatus: boolean;
  showLastSeen: boolean;
  allowTagging: boolean;
  allowFriendRequests: boolean;
}

/**
 * Interface for user theme preferences
 */
interface ThemePreferences {
  theme: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  reducedMotion: boolean;
  highContrast: boolean;
  customColors?: {
    primary: string;
    secondary: string;
    background: string;
  };
}

/**
 * Interface for user accessibility preferences
 */
interface AccessibilityPreferences {
  screenReader: boolean;
  keyboardNavigation: boolean;
  colorBlindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia";
  textToSpeech: boolean;
  captionsEnabled: boolean;
}

/**
 * Interface for all user preferences
 */
interface IUserPreferences {
  userId: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  theme: ThemePreferences;
  accessibility: AccessibilityPreferences;
  language: string;
  timezone: string;
  updatedAt: Date;
}

/**
 * Interface for preference validation rules
 */
interface PreferenceValidationRules<T = unknown> {
  allowedValues?: T[];
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  customValidator?: (value: T) => boolean;
}

/**
 * Interface for preference analytics
 */
interface PreferenceAnalytics {
  totalUsers: number;
  themeDistribution: Record<string, number>;
  notificationStats: {
    emailEnabled: number;
    pushEnabled: number;
    averageEnabledTypes: number;
  };
  privacyStats: {
    privateProfiles: number;
    publicProfiles: number;
    averagePrivacyLevel: number;
  };
  accessibilityUsage: {
    screenReaderEnabled: number;
    colorBlindModeEnabled: number;
    keyboardNavigationEnabled: number;
  };
  languageDistribution: Record<string, number>;
  timezoneDistribution: Record<string, number>;
}

/**
 * Default preferences for new users
 */
const DEFAULT_PREFERENCES: Omit<IUserPreferences, "userId" | "updatedAt"> = {
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    mentionNotifications: true,
    commentNotifications: true,
    followNotifications: true,
    messageNotifications: true,
    emailDigestFrequency: "weekly",
    notificationSound: true,
    desktopNotifications: false,
  },
  privacy: {
    profileVisibility: "public",
    showOnlineStatus: true,
    allowMessagesFrom: "everyone",
    showActivityStatus: true,
    showLastSeen: true,
    allowTagging: true,
    allowFriendRequests: true,
  },
  theme: {
    theme: "system",
    fontSize: "medium",
    reducedMotion: false,
    highContrast: false,
  },
  accessibility: {
    screenReader: false,
    keyboardNavigation: false,
    colorBlindMode: "none",
    textToSpeech: false,
    captionsEnabled: false,
  },
  language: "en",
  timezone: "UTC",
};

/**
 * Service responsible for managing user preferences.
 * This service handles:
 * 1. Notification preferences
 * 2. Privacy settings
 * 3. Theme preferences
 * 4. Accessibility settings
 * 5. Language and timezone settings
 * 6. Preference inheritance and defaults
 * 7. Preference analytics
 */
export class UserPreferencesService {
  private logger: Logger;
  private cache: NodeCache;
  private readonly validationRules: Record<string, PreferenceValidationRules> =
    {
      language: {
        pattern: /^[a-z]{2}(-[A-Z]{2})?$/,
        allowedValues: [
          "en",
          "es",
          "fr",
          "de",
          "it",
          "pt",
          "ru",
          "zh",
          "ja",
          "ko",
        ],
      },
      timezone: {
        customValidator: (value: unknown) => {
          if (typeof value !== "string") return false;
          try {
            Intl.DateTimeFormat(undefined, { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
      },
      "theme.fontSize": {
        allowedValues: ["small", "medium", "large"],
      },
      "theme.theme": {
        allowedValues: ["light", "dark", "system"],
      },
      "notifications.emailDigestFrequency": {
        allowedValues: ["never", "daily", "weekly", "monthly"],
      },
      "privacy.profileVisibility": {
        allowedValues: ["public", "private", "friends"],
      },
      "privacy.allowMessagesFrom": {
        allowedValues: ["everyone", "friends", "none"],
      },
      "accessibility.colorBlindMode": {
        allowedValues: ["none", "protanopia", "deuteranopia", "tritanopia"],
      },
    };

  constructor(
    private readonly userService: UserService,
    private readonly preferencesRepository: UserPreferencesRepository,
  ) {
    this.logger = new Logger("UserPreferencesService");
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
  }

  /**
   * Get user preferences with caching
   * @param userId The user ID
   * @returns The user's preferences
   */
  async getPreferences(userId: string): Promise<IUserPreferences> {
    this.logger.debug("Getting user preferences", { userId });

    const cacheKey = `preferences:${userId}`;
    const cachedPrefs = this.cache.get<IUserPreferences>(cacheKey);
    if (cachedPrefs) {
      return cachedPrefs;
    }

    // Check if user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      this.logger.warn("User not found for preferences retrieval", { userId });
      throw new Error("User not found");
    }

    // Get preferences from storage or create default
    let preferences = await this.preferencesRepository.findByUserId(userId);
    if (!preferences) {
      preferences = new UserPreferences({
        userId,
        ...DEFAULT_PREFERENCES,
        updatedAt: new Date(),
      });
      await this.preferencesRepository.create(preferences);
    }

    this.cache.set(cacheKey, preferences);
    return preferences;
  }

  /**
   * Update notification preferences with validation
   * @param userId The user ID
   * @param preferences The notification preferences to update
   * @returns The updated preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<IUserPreferences> {
    this.logger.debug("Updating notification preferences", {
      userId,
      preferences,
    });

    const userPrefs = await this.getPreferences(userId);
    const updatedPrefs = {
      ...userPrefs,
      notifications: {
        ...userPrefs.notifications,
        ...preferences,
      },
      updatedAt: new Date(),
    };

    // Validate notification preferences
    this.validatePreferences("notifications", updatedPrefs.notifications);

    await this.preferencesRepository.update(userId, updatedPrefs);
    this.cache.del(`preferences:${userId}`);

    return updatedPrefs;
  }

  /**
   * Update privacy preferences with validation
   * @param userId The user ID
   * @param preferences The privacy preferences to update
   * @returns The updated preferences
   */
  async updatePrivacyPreferences(
    userId: string,
    preferences: Partial<PrivacyPreferences>,
  ): Promise<IUserPreferences> {
    this.logger.debug("Updating privacy preferences", { userId, preferences });

    const userPrefs = await this.getPreferences(userId);
    const updatedPrefs = {
      ...userPrefs,
      privacy: {
        ...userPrefs.privacy,
        ...preferences,
      },
      updatedAt: new Date(),
    };

    // Validate privacy preferences
    this.validatePreferences("privacy", updatedPrefs.privacy);

    await this.preferencesRepository.update(userId, updatedPrefs);
    this.cache.del(`preferences:${userId}`);

    return updatedPrefs;
  }

  /**
   * Update theme preferences with validation
   * @param userId The user ID
   * @param preferences The theme preferences to update
   * @returns The updated preferences
   */
  async updateThemePreferences(
    userId: string,
    preferences: Partial<ThemePreferences>,
  ): Promise<IUserPreferences> {
    this.logger.debug("Updating theme preferences", { userId, preferences });

    const userPrefs = await this.getPreferences(userId);
    const updatedPrefs = {
      ...userPrefs,
      theme: {
        ...userPrefs.theme,
        ...preferences,
      },
      updatedAt: new Date(),
    };

    // Validate theme preferences
    this.validatePreferences("theme", updatedPrefs.theme);

    await this.preferencesRepository.update(userId, updatedPrefs);
    this.cache.del(`preferences:${userId}`);

    return updatedPrefs;
  }

  /**
   * Update accessibility preferences with validation
   * @param userId The user ID
   * @param preferences The accessibility preferences to update
   * @returns The updated preferences
   */
  async updateAccessibilityPreferences(
    userId: string,
    preferences: Partial<AccessibilityPreferences>,
  ): Promise<IUserPreferences> {
    this.logger.debug("Updating accessibility preferences", {
      userId,
      preferences,
    });

    const userPrefs = await this.getPreferences(userId);
    const updatedPrefs = {
      ...userPrefs,
      accessibility: {
        ...userPrefs.accessibility,
        ...preferences,
      },
      updatedAt: new Date(),
    };

    // Validate accessibility preferences
    this.validatePreferences("accessibility", updatedPrefs.accessibility);

    await this.preferencesRepository.update(userId, updatedPrefs);
    this.cache.del(`preferences:${userId}`);

    return updatedPrefs;
  }

  /**
   * Update language preference with validation
   * @param userId The user ID
   * @param language The language code
   * @returns The updated preferences
   */
  async updateLanguage(
    userId: string,
    language: string,
  ): Promise<IUserPreferences> {
    this.logger.debug("Updating language preference", { userId, language });

    // Validate language code
    this.validateField("language", language);

    const userPrefs = await this.getPreferences(userId);
    const updatedPrefs = {
      ...userPrefs,
      language,
      updatedAt: new Date(),
    };

    await this.preferencesRepository.update(userId, updatedPrefs);
    this.cache.del(`preferences:${userId}`);

    return updatedPrefs;
  }

  /**
   * Update timezone preference with validation
   * @param userId The user ID
   * @param timezone The timezone
   * @returns The updated preferences
   */
  async updateTimezone(
    userId: string,
    timezone: string,
  ): Promise<IUserPreferences> {
    this.logger.debug("Updating timezone preference", { userId, timezone });

    // Validate timezone
    this.validateField("timezone", timezone);

    const userPrefs = await this.getPreferences(userId);
    const updatedPrefs = {
      ...userPrefs,
      timezone,
      updatedAt: new Date(),
    };

    await this.preferencesRepository.update(userId, updatedPrefs);
    this.cache.del(`preferences:${userId}`);

    return updatedPrefs;
  }

  /**
   * Reset preferences to default values
   * @param userId The user ID
   * @returns The reset preferences
   */
  async resetPreferences(userId: string): Promise<IUserPreferences> {
    this.logger.debug("Resetting user preferences", { userId });

    // Check if user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      this.logger.warn("User not found for preferences reset", { userId });
      throw new Error("User not found");
    }

    const preferences = new UserPreferences({
      userId,
      ...DEFAULT_PREFERENCES,
      updatedAt: new Date(),
    });

    await this.preferencesRepository.update(userId, preferences);
    this.cache.del(`preferences:${userId}`);

    return preferences;
  }

  /**
   * Delete user preferences
   * @param userId The user ID
   * @returns True if preferences were deleted
   */
  async deletePreferences(userId: string): Promise<boolean> {
    this.logger.debug("Deleting user preferences", { userId });

    const deleted = await this.preferencesRepository.delete(userId);
    if (deleted) {
      this.cache.del(`preferences:${userId}`);
    }

    return deleted;
  }

  /**
   * Get preference analytics
   * @returns Preference analytics data
   */
  async getPreferenceAnalytics(): Promise<PreferenceAnalytics> {
    this.logger.debug("Getting preference analytics");

    const allPreferences = await this.preferencesRepository.findAll();
    const totalUsers = allPreferences.length;

    const themeDistribution: Record<string, number> = {};
    const languageDistribution: Record<string, number> = {};
    const timezoneDistribution: Record<string, number> = {};
    let emailEnabled = 0;
    let pushEnabled = 0;
    let totalNotificationTypes = 0;
    let privateProfiles = 0;
    let publicProfiles = 0;
    let totalPrivacyLevel = 0;
    let screenReaderEnabled = 0;
    let colorBlindModeEnabled = 0;
    let keyboardNavigationEnabled = 0;

    allPreferences.forEach((prefs) => {
      // Theme stats
      themeDistribution[prefs.theme.theme] =
        (themeDistribution[prefs.theme.theme] || 0) + 1;

      // Language stats
      languageDistribution[prefs.language] =
        (languageDistribution[prefs.language] || 0) + 1;

      // Timezone stats
      timezoneDistribution[prefs.timezone] =
        (timezoneDistribution[prefs.timezone] || 0) + 1;

      // Notification stats
      if (prefs.notifications.emailNotifications) emailEnabled++;
      if (prefs.notifications.pushNotifications) pushEnabled++;
      totalNotificationTypes += Object.values(prefs.notifications).filter(
        (v) => v === true,
      ).length;

      // Privacy stats
      if (prefs.privacy.profileVisibility === "private") privateProfiles++;
      if (prefs.privacy.profileVisibility === "public") publicProfiles++;
      totalPrivacyLevel += Object.values(prefs.privacy).filter(
        (v) => v === false,
      ).length;

      // Accessibility stats
      if (prefs.accessibility.screenReader) screenReaderEnabled++;
      if (prefs.accessibility.colorBlindMode !== "none")
        colorBlindModeEnabled++;
      if (prefs.accessibility.keyboardNavigation) keyboardNavigationEnabled++;
    });

    return {
      totalUsers,
      themeDistribution,
      notificationStats: {
        emailEnabled,
        pushEnabled,
        averageEnabledTypes: totalNotificationTypes / totalUsers,
      },
      privacyStats: {
        privateProfiles,
        publicProfiles,
        averagePrivacyLevel: totalPrivacyLevel / totalUsers,
      },
      accessibilityUsage: {
        screenReaderEnabled,
        colorBlindModeEnabled,
        keyboardNavigationEnabled,
      },
      languageDistribution,
      timezoneDistribution,
    };
  }

  /**
   * Validate preferences for a specific section
   * @param section The preference section
   * @param preferences The preferences to validate
   * @throws Error if validation fails
   */
  private validatePreferences<T extends keyof UserPreferencesAttributes>(
    section: T,
    preferences: UserPreferencesAttributes[T],
  ): void {
    Object.entries(preferences as Record<string, unknown>).forEach(
      ([key, value]) => {
        const fieldPath = `${section}.${key}`;
        if (this.validationRules[fieldPath]) {
          this.validateField(fieldPath, value);
        }
      },
    );
  }

  /**
   * Validate a preference field
   * @param field The field to validate
   * @param value The value to validate
   * @throws Error if validation fails
   */
  private validateField<T>(field: string, value: T): void {
    const rules = this.validationRules[field];
    if (!rules) return;

    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      throw new Error(
        `Invalid value for ${field}. Allowed values: ${rules.allowedValues.join(", ")}`,
      );
    }

    if (
      rules.pattern &&
      typeof value === "string" &&
      !rules.pattern.test(value)
    ) {
      throw new Error(`Invalid format for ${field}`);
    }

    if (rules.customValidator && !rules.customValidator(value)) {
      throw new Error(`Invalid value for ${field}`);
    }

    if (typeof value === "number") {
      if (rules.minValue !== undefined && value < rules.minValue) {
        throw new Error(`${field} must be at least ${rules.minValue}`);
      }
      if (rules.maxValue !== undefined && value > rules.maxValue) {
        throw new Error(`${field} must be at most ${rules.maxValue}`);
      }
    }
  }
}
