import { UserSettings } from "@models/social/UserSettings";

import { BaseRepository } from "../BaseRepository";

export class UserSettingsRepository extends BaseRepository<UserSettings> {
  protected tableName = "user_settings";
  protected columns = [
    "id",
    "user_id as userId",
    "theme",
    "language",
    "timezone",
    "email_notifications as emailNotifications",
    "push_notifications as pushNotifications",
    "privacy_settings as privacySettings",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("UserSettings");
  }
}
