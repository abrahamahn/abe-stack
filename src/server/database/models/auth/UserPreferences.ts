import { BaseModel } from "../BaseModel";

export interface UserPreferencesAttributes {
  userId: string;
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    mentionNotifications: boolean;
    commentNotifications: boolean;
    followNotifications: boolean;
    messageNotifications: boolean;
    emailDigestFrequency: "never" | "daily" | "weekly" | "monthly";
    notificationSound: boolean;
    desktopNotifications: boolean;
  };
  privacy: {
    profileVisibility: "public" | "private" | "friends";
    showOnlineStatus: boolean;
    allowMessagesFrom: "everyone" | "friends" | "none";
    showActivityStatus: boolean;
    showLastSeen: boolean;
    allowTagging: boolean;
    allowFriendRequests: boolean;
  };
  theme: {
    theme: "light" | "dark" | "system";
    fontSize: "small" | "medium" | "large";
    reducedMotion: boolean;
    highContrast: boolean;
    customColors?: {
      primary: string;
      secondary: string;
      background: string;
    };
  };
  accessibility: {
    screenReader: boolean;
    keyboardNavigation: boolean;
    colorBlindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia";
    textToSpeech: boolean;
    captionsEnabled: boolean;
  };
  language: string;
  timezone: string;
  updatedAt: Date;
}

export class UserPreferences extends BaseModel {
  userId!: string;
  notifications!: UserPreferencesAttributes["notifications"];
  privacy!: UserPreferencesAttributes["privacy"];
  theme!: UserPreferencesAttributes["theme"];
  accessibility!: UserPreferencesAttributes["accessibility"];
  language!: string;
  timezone!: string;

  constructor(attributes: Partial<UserPreferencesAttributes>) {
    super();
    Object.assign(this, attributes);
  }
}
